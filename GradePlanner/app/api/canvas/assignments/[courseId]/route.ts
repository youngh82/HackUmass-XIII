import { NextRequest, NextResponse } from "next/server";
import { CanvasApiClient } from "@/lib/canvas/client";
import { mapAssignmentGroup } from "@/lib/canvas/mapper";

type MappedGroup = ReturnType<typeof mapAssignmentGroup>;

/**
 * Courses without weighted assignment groups are graded by total points,
 * so each group's effective weight is its share of all points possible.
 */
function applyPointsWeights(categories: MappedGroup[]): MappedGroup[] {
  const groupPoints = categories.map((c) =>
    c.assignments.reduce((sum, a) => sum + a.points, 0)
  );
  const totalPoints = groupPoints.reduce((sum, p) => sum + p, 0);
  if (totalPoints === 0) return categories;

  const weights = groupPoints.map(
    (p) => Math.round((p / totalPoints) * 1000) / 10
  );
  // Absorb rounding drift into the largest group so the total is exactly 100
  const drift = 100 - weights.reduce((sum, w) => sum + w, 0);
  const largest = weights.indexOf(Math.max(...weights));
  weights[largest] = Math.round((weights[largest] + drift) * 10) / 10;

  return categories.map((c, i) => ({ ...c, weight: weights[i] }));
}

// GET /api/canvas/assignments/[courseId]
// Fetches assignment groups and assignments for a specific course
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const token = request.headers.get("x-canvas-token");
    const baseUrl = request.headers.get("x-canvas-base-url");

    if (!token || !baseUrl) {
      return NextResponse.json(
        { error: "Token and baseUrl are required" },
        { status: 400 }
      );
    }

    const { courseId } = params;
    const id = parseInt(courseId);

    // Create Canvas API client
    const client = new CanvasApiClient(baseUrl, token);

    // Fetch course settings and assignment groups (includes assignments)
    const [course, assignmentGroups] = await Promise.all([
      client.getCourse(id),
      client.getAssignmentGroups(id),
    ]);

    // Map to app format
    const mapped = assignmentGroups.map((group) =>
      mapAssignmentGroup(group, courseId)
    );
    const weighted = course.apply_assignment_group_weights === true;
    const categories = weighted ? mapped : applyPointsWeights(mapped);

    return NextResponse.json({
      categories,
      courseName: course.name,
      weightingScheme: weighted ? "weighted" : "points",
    });
  } catch (error) {
    console.error("Assignments fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch assignments",
      },
      { status: 500 }
    );
  }
}
