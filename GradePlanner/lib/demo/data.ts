// Sample data for "Try the demo", so people without a Canvas token can use
// the planner. Responses match the /api/canvas/* shapes the UI consumes, and
// ApiClient serves them instead of calling the server.

export const DEMO_TOKEN = "demo";
export const DEMO_BASE_URL = "demo";

interface DemoAssignment {
  name: string;
  points: number;
  earned: number | null; // null = not graded yet
}

interface DemoCourse {
  id: string;
  name: string;
  courseCode: string;
  color: string;
  weightingScheme: "weighted" | "points";
  categories: Array<{
    name: string;
    weight: number;
    assignments: DemoAssignment[];
  }>;
}

const graded = (name: string, points: number, earned: number) => ({
  name,
  points,
  earned,
});

const upcoming = (name: string, points: number) => ({
  name,
  points,
  earned: null,
});

// "Homework 1..n", graded in order while scores last
const series = (
  prefix: string,
  count: number,
  points: number,
  scores: number[]
): DemoAssignment[] =>
  Array.from({ length: count }, (_, i) =>
    i < scores.length
      ? graded(`${prefix} ${i + 1}`, points, scores[i])
      : upcoming(`${prefix} ${i + 1}`, points)
  );

const DEMO_COURSES: DemoCourse[] = [
  {
    // Weighted groups, partly graded, A still reachable: shows the strategy
    id: "demo-cs326",
    name: "Web Programming",
    courseCode: "CS 326",
    color: "#3b82f6",
    weightingScheme: "weighted",
    categories: [
      {
        name: "Exams",
        weight: 40,
        assignments: [graded("Midterm", 100, 88), upcoming("Final Exam", 100)],
      },
      {
        name: "Projects",
        weight: 30,
        assignments: [
          graded("Project 1", 50, 45),
          upcoming("Project 2", 50),
          upcoming("Project 3", 50),
        ],
      },
      {
        name: "Homework",
        weight: 20,
        assignments: series("Homework", 6, 10, [10, 9, 8, 10]),
      },
      {
        name: "Participation",
        weight: 10,
        assignments: [upcoming("Participation", 10)],
      },
    ],
  },
  {
    // Graded by total points: weights are each group's share of 500 points
    id: "demo-math235",
    name: "Linear Algebra",
    courseCode: "MATH 235",
    color: "#10b981",
    weightingScheme: "points",
    categories: [
      {
        name: "Homework",
        weight: 20,
        assignments: series("Homework", 10, 10, [10, 10, 9, 10, 8, 10, 9, 10]),
      },
      {
        name: "Quizzes",
        weight: 20,
        assignments: series("Quiz", 5, 20, [18, 20, 16, 19]),
      },
      {
        name: "Exams",
        weight: 60,
        assignments: [
          graded("Midterm 1", 100, 84),
          graded("Midterm 2", 100, 79),
          upcoming("Final Exam", 100),
        ],
      },
    ],
  },
  {
    // Nothing published yet: shows the setup prompt
    id: "demo-hist101",
    name: "World History",
    courseCode: "HIST 101",
    color: "#f59e0b",
    weightingScheme: "points",
    categories: [
      { name: "Assignments", weight: 0, assignments: [] },
      { name: "Quizzes", weight: 0, assignments: [] },
    ],
  },
];

/**
 * Demo response for an ApiClient GET endpoint, or null if there is none
 */
export function getDemoResponse<T>(endpoint: string): T | null {
  if (endpoint === "/api/canvas/courses") {
    return {
      courses: DEMO_COURSES.map(({ id, name, courseCode, color }) => ({
        id,
        name: `${name} ${courseCode}`,
        courseCode,
        term: "Demo",
        color,
      })),
    } as T;
  }

  const courseId = endpoint.match(/^\/api\/canvas\/assignments\/(.+)$/)?.[1];
  const course = DEMO_COURSES.find((c) => c.id === courseId);
  if (!course) return null;

  return {
    courseName: `${course.name} ${course.courseCode}`,
    weightingScheme: course.weightingScheme,
    categories: course.categories.map((cat) => ({
      name: cat.name,
      weight: cat.weight,
      assignments: cat.assignments.map((a) => ({
        name: a.name,
        points: a.points,
        earned: a.earned,
        submitted: a.earned !== null,
        graded: a.earned !== null,
        late: false,
        missing: false,
      })),
    })),
  } as T;
}
