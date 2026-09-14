import { CanvasCourse, CanvasAssignment, CanvasAssignmentGroup } from "./types";

/**
 * Map Canvas course to app's Course type
 */
export function mapCanvasCourse(canvasCourse: CanvasCourse) {
  return {
    id: canvasCourse.id.toString(),
    name: canvasCourse.name,
    courseCode: canvasCourse.course_code,
    term: canvasCourse.enrollment_term_id?.toString() || "current",
    color: generateColorFromString(canvasCourse.name),
    startDate: canvasCourse.start_at || undefined,
    endDate: canvasCourse.end_at || undefined,
  };
}

/**
 * Map Canvas assignment to app's Assignment type
 */
export function mapCanvasAssignment(assignment: CanvasAssignment) {
  // Attendance 감지: 이름에 "attendance"가 포함되는 경우
  const isAttendance = assignment.name.toLowerCase().includes("attendance");

  // Check if assignment has been graded/submitted
  // 🔍 수정: score가 있으면 제출된 것으로 간주 (workflow_state에 의존하지 않음)
  const hasSubmission =
    assignment.submission !== null &&
    assignment.submission !== undefined &&
    typeof assignment.submission.score === 'number';

  // Only use score if the assignment has been submitted/graded
  // If not submitted, score should be null (not yet taken)
  let earned: number | null = null;
  if (hasSubmission && assignment.submission && typeof assignment.submission.score === 'number') {
    // Assignment is submitted or graded - use the score (even if 0)
    earned = assignment.submission.score;
  }
  // Otherwise leave as null (not submitted/graded yet)

  return {
    id: assignment.id.toString(),
    name: assignment.name,
    dueDate: assignment.due_at || undefined,
    points: assignment.points_possible || 0,
    earned,
    category: "Uncategorized", // Will be set by assignment group
    submitted:
      assignment.submission?.workflow_state === "submitted" ||
      assignment.submission?.workflow_state === "graded",
    graded: assignment.submission?.workflow_state === "graded",
    late: assignment.submission?.late || false,
    missing: assignment.submission?.missing || false,
    excused: assignment.submission?.excused || false,
    gradingType: assignment.grading_type || "points",
    htmlUrl: assignment.html_url,
    isAttendance, // Attendance 플래그 추가
  };
}

/**
 * Map Canvas assignment group to app's category
 */
export function mapAssignmentGroup(
  group: CanvasAssignmentGroup,
  courseId: string
) {
  // 카테고리 이름으로 attendance 감지
  const isAttendanceCategory = group.name.toLowerCase().includes("attendance");

  return {
    id: `${courseId}-${group.id}`,
    courseId,
    name: group.name,
    weight: group.group_weight || 0,
    position: group.position,
    dropLowest: group.rules?.drop_lowest || 0,
    dropHighest: group.rules?.drop_highest || 0,
    isAttendance: isAttendanceCategory,
    assignments:
      group.assignments
        ?.filter(
          // Canvas leaves these out of the final grade entirely
          (a) =>
            !a.omit_from_final_grade &&
            !a.submission?.excused &&
            a.grading_type !== "not_graded"
        )
        .map((a) => ({
        ...mapCanvasAssignment(a),
        category: group.name,
        isAttendance:
          isAttendanceCategory || a.name.toLowerCase().includes("attendance"),
      })) || [],
  };
}

/**
 * Generate consistent color from string (for course colors)
 */
function generateColorFromString(str: string): string {
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Calculate grade statistics from assignments
 */
export function calculateGradeStats(
  assignments: ReturnType<typeof mapCanvasAssignment>[]
) {
  const graded = assignments.filter((a) => a.graded && !a.excused);

  if (graded.length === 0) {
    return {
      current: 0,
      total: 0,
      percentage: 0,
      letterGrade: "N/A",
    };
  }

  const earnedPoints = graded.reduce((sum, a) => sum + (a.earned ?? 0), 0);
  const totalPoints = graded.reduce((sum, a) => sum + a.points, 0);
  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  return {
    current: earnedPoints,
    total: totalPoints,
    percentage,
    letterGrade: getLetterGrade(percentage),
  };
}

/**
 * Convert percentage to letter grade
 */
export function getLetterGrade(percentage: number): string {
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}
