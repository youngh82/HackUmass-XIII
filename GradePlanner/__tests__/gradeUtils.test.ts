import { describe, test, expect } from "vitest";
import {
  getItemWeights,
  calculateCurrentGradeFromCategories,
  calculateMaxPossibleGradeFromCategories,
  calculateMinPossibleGradeFromCategories,
} from "@/lib/calculations/gradeUtils";

describe("getItemWeights", () => {
  test("weights items by points possible", () => {
    const weights = getItemWeights({
      weight: 30,
      items: [{ maxScore: 10 }, { maxScore: 20 }],
    });
    expect(weights[0]).toBeCloseTo(10);
    expect(weights[1]).toBeCloseTo(20);
  });

  test("falls back to equal split when any item lacks points", () => {
    expect(
      getItemWeights({ weight: 30, items: [{ maxScore: 10 }, {}, {}] })
    ).toEqual([10, 10, 10]);
  });

  test("gives 0-point items no weight without disabling point weighting", () => {
    const weights = getItemWeights({
      weight: 30,
      items: [{ maxScore: 10 }, { maxScore: 0 }, { maxScore: 20 }],
    });
    expect(weights[0]).toBeCloseTo(10);
    expect(weights[1]).toBe(0);
    expect(weights[2]).toBeCloseTo(20);
  });

  test("returns no weights for an empty category", () => {
    expect(getItemWeights({ weight: 30, items: [] })).toEqual([]);
  });
});

describe("grade projections use point weighting", () => {
  // 10-point quiz at 90% and 90-point exam at 50%
  const graded = [
    {
      id: 1,
      name: "All",
      weight: 100,
      items: [
        { name: "Quiz", score: 90, maxScore: 10 },
        { name: "Exam", score: 50, maxScore: 90 },
      ],
    },
  ];

  test("current grade weights graded items by points", () => {
    // (10×90 + 90×50) / 100 = 54, not the unweighted 70
    expect(calculateCurrentGradeFromCategories(graded)).toBeCloseTo(54);
  });

  // Same course with the exam still ungraded
  const partial = [
    {
      id: 1,
      name: "All",
      weight: 100,
      items: [
        { name: "Quiz", score: 90, maxScore: 10 },
        { name: "Exam", score: null, maxScore: 90 },
      ],
    },
  ];

  test("max possible assumes 100 on ungraded items", () => {
    expect(calculateMaxPossibleGradeFromCategories(partial)).toBeCloseTo(99);
  });

  test("min possible assumes 0 on ungraded items", () => {
    expect(calculateMinPossibleGradeFromCategories(partial)).toBeCloseTo(9);
  });

  test("zero-weight categories are ignored", () => {
    const withEmpty = [
      ...partial,
      { id: 2, name: "Extra", weight: 0, items: [{ name: "x", score: 0 }] },
    ];
    expect(calculateMaxPossibleGradeFromCategories(withEmpty)).toBeCloseTo(99);
  });
});
