import { describe, test, expect } from "vitest";
import { getDemoResponse } from "@/lib/demo/data";
import {
  calculateCurrentGradeFromCategories,
  calculateMaxPossibleGradeFromCategories,
} from "@/lib/calculations/gradeUtils";

interface DemoCourses {
  courses: Array<{ id: string }>;
}
interface DemoAssignments {
  categories: Array<{
    name: string;
    weight: number;
    assignments: Array<{ name: string; points: number; earned: number | null }>;
  }>;
}

// Same conversion the dashboard applies to Canvas data
const toCategories = (data: DemoAssignments) =>
  data.categories.map((cat, i) => ({
    id: i + 1,
    name: cat.name,
    weight: cat.weight,
    items: cat.assignments.map((a) => ({
      name: a.name,
      score: a.earned === null ? null : (a.earned / a.points) * 100,
      maxScore: a.points,
    })),
  }));

describe("demo data", () => {
  const { courses } = getDemoResponse<DemoCourses>("/api/canvas/courses")!;

  test("lists three sample courses", () => {
    expect(courses).toHaveLength(3);
  });

  test("every course with assignments has weights totalling 100%", () => {
    for (const { id } of courses) {
      const data = getDemoResponse<DemoAssignments>(
        `/api/canvas/assignments/${id}`
      )!;
      const hasItems = data.categories.some((c) => c.assignments.length > 0);
      const total = data.categories.reduce((sum, c) => sum + c.weight, 0);
      expect(total).toBe(hasItems ? 100 : 0);
    }
  });

  test("the weighted course sits at a B+ with an A still reachable", () => {
    const categories = toCategories(
      getDemoResponse<DemoAssignments>("/api/canvas/assignments/demo-cs326")!
    );
    // (40×88 + 30×90 + 20×92.5) / 90
    expect(calculateCurrentGradeFromCategories(categories)).toBeCloseTo(89.67, 1);
    expect(calculateMaxPossibleGradeFromCategories(categories)).toBeGreaterThan(93);
  });

  test("unknown endpoints have no demo response", () => {
    expect(getDemoResponse("/api/canvas/assignments/nope")).toBeNull();
  });
});
