// lib/calculations/gradeUtils.ts - Grade calculation utilities

/**
 * Grade to percentage mapping
 */
export const GRADE_THRESHOLDS = {
  A: 93,
  "A-": 90,
  "B+": 87,
  B: 83,
  "B-": 80,
  "C+": 77,
  C: 73,
  "C-": 70,
  "D+": 67,
  D: 63,
  "D-": 60,
  F: 0,
} as const;

export type LetterGrade = keyof typeof GRADE_THRESHOLDS;

/**
 * Convert letter grade to minimum percentage required
 */
export function gradeToPercentage(grade: LetterGrade): number {
  return GRADE_THRESHOLDS[grade];
}

/**
 * Convert percentage to letter grade
 */
export function percentageToGrade(score: number): LetterGrade {
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

/**
 * Calculate weighted average from graded items
 */
export interface GradedItem {
  score: number; // 0-100
  weight: number; // 0-100
}

export function calculateWeightedAverage(items: GradedItem[]): number {
  if (items.length === 0) return 0;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  items.forEach((item) => {
    totalWeightedScore += (item.score * item.weight) / 100;
    totalWeight += item.weight;
  });

  if (totalWeight === 0) return 0;

  return (totalWeightedScore / totalWeight) * 100;
}

/**
 * Category interface for grade calculations
 */
export interface Category {
  id: number;
  name: string;
  weight: number;
  items: CategoryItem[];
}

export interface CategoryItem {
  name: string;
  score: number | null;
  maxScore?: number;
  isAttendance?: boolean;
}

/**
 * Split a category's weight across its items. Canvas scores items within a
 * group by points, so items are weighted by maxScore when every item has one
 * (0-point items get no weight). Otherwise (e.g. manually created items)
 * they share the weight equally.
 */
export function getItemWeights(category: {
  weight: number;
  items: Array<{ maxScore?: number }>;
}): number[] {
  const { weight, items } = category;
  if (items.length === 0) return [];

  const totalPoints = items.reduce(
    (sum, item) => sum + (item.maxScore ?? 0),
    0
  );
  const byPoints =
    totalPoints > 0 && items.every((item) => item.maxScore !== undefined);

  return items.map((item) =>
    byPoints ? (weight * item.maxScore!) / totalPoints : weight / items.length
  );
}

/**
 * Calculate current grade from categories (only graded items)
 * Ungraded items are excluded from the calculation
 */
export function calculateCurrentGradeFromCategories(
  categories: Category[]
): number {
  let totalWeightedScore = 0;
  let totalWeightGraded = 0;

  categories.forEach((category) => {
    // Skip categories with 0 weight
    if (category.weight === 0) return;

    const weights = getItemWeights(category);
    let earned = 0;
    let gradedWeight = 0;
    category.items.forEach((item, i) => {
      if (item.score === null || item.score === undefined) return;
      earned += weights[i] * item.score;
      gradedWeight += weights[i];
    });

    if (gradedWeight === 0) return; // Skip categories with no graded items

    // Category average over graded items, weighted by points
    const categoryPercentage = earned / gradedWeight;

    totalWeightedScore += (categoryPercentage * category.weight) / 100;
    totalWeightGraded += category.weight;
  });

  if (totalWeightGraded === 0) return 0;

  // Return weighted average of graded items
  return (totalWeightedScore / totalWeightGraded) * 100;
}

/**
 * Project the final grade assuming every ungraded item gets `ungradedScore`.
 * Categories without items contribute `ungradedScore` for their full weight.
 */
function projectGrade(categories: Category[], ungradedScore: number): number {
  let total = 0;

  categories.forEach((category) => {
    if (category.weight === 0) return;

    if (category.items.length === 0) {
      total += (ungradedScore * category.weight) / 100;
      return;
    }

    const weights = getItemWeights(category);
    category.items.forEach((item, i) => {
      total += (weights[i] * (item.score ?? ungradedScore)) / 100;
    });
  });

  return total;
}

/**
 * Calculate maximum possible grade (ungraded items = 100)
 */
export function calculateMaxPossibleGradeFromCategories(
  categories: Category[]
): number {
  return projectGrade(categories, 100);
}

/**
 * Calculate minimum possible grade (ungraded items = 0)
 */
export function calculateMinPossibleGradeFromCategories(
  categories: Category[]
): number {
  return projectGrade(categories, 0);
}

/**
 * Legacy interface for backward compatibility
 */
export interface CategoryScore {
  weight: number; // percentage (0-100)
  earnedPoints: number;
  totalPoints: number;
}

export function calculateCurrentGrade(categories: CategoryScore[]): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  categories.forEach((category) => {
    if (category.totalPoints > 0) {
      const categoryScore =
        (category.earnedPoints / category.totalPoints) * 100;
      totalWeightedScore += (categoryScore * category.weight) / 100;
      totalWeight += category.weight;
    }
  });

  if (totalWeight === 0) return 0;

  // Normalize to 100% scale
  return (totalWeightedScore / totalWeight) * 100;
}

/**
 * Calculate maximum possible grade
 */
export function calculateMaxPossibleGrade(categories: CategoryScore[]): number {
  let totalWeightedScore = 0;

  categories.forEach((category) => {
    if (category.totalPoints > 0) {
      // Assume 100% on all ungraded items in this category
      const categoryScore =
        (category.earnedPoints / category.totalPoints) * 100;
      totalWeightedScore += categoryScore * (category.weight / 100);
    } else {
      // If no points yet, assume 100% for this category
      totalWeightedScore += category.weight;
    }
  });

  return totalWeightedScore;
}

/**
 * Check if target grade is achievable
 */
export function isGradeAchievable(
  targetGrade: LetterGrade,
  maxPossibleGrade: number
): boolean {
  const requiredPercentage = gradeToPercentage(targetGrade);
  return maxPossibleGrade >= requiredPercentage;
}

/**
 * Calculate points needed to achieve target grade
 */
export function calculatePointsNeeded(
  currentGrade: number,
  targetGrade: number,
  remainingWeight: number
): number {
  if (remainingWeight === 0) {
    return currentGrade >= targetGrade ? 0 : Infinity;
  }

  // Formula: (target - current) / (remaining / 100)
  const pointsNeeded = ((targetGrade - currentGrade) / remainingWeight) * 100;

  return Math.max(0, Math.min(100, pointsNeeded));
}

/**
 * Check if target is achievable with remaining items
 */
export interface UngradedItemInfo {
  itemWeight: number;
  isAttendance?: boolean;
}

export function isTargetAchievable(
  currentScore: number,
  targetScore: number,
  ungradedItems: UngradedItemInfo[]
): { achievable: boolean; maxPossible: number; deductionAllowed: number } {
  const totalRemainingWeight = ungradedItems.reduce(
    (sum, item) => sum + item.itemWeight,
    0
  );
  const maxPossible = currentScore + totalRemainingWeight;
  const deductionAllowed = maxPossible - targetScore;

  return {
    achievable: maxPossible >= targetScore,
    maxPossible,
    deductionAllowed: Math.max(0, deductionAllowed),
  };
}

/**
 * Attendance rounding and surplus redistribution
 * Attendance는 출석(100) 또는 결석(0)만 가능하므로 올림 처리
 */
export interface AttendanceRoundingResult {
  attendanceItems: Array<{
    itemName: string;
    itemWeight: number;
    requiredScore: number; // 0 or 1
    originalNeeded: number;
  }>;
  surplus: number; // 올림으로 생긴 여유
}

export function handleAttendanceRounding(
  attendanceItems: Array<{
    itemName: string;
    itemWeight: number;
    neededPct: number;
  }>,
  regularItems: Array<{
    itemName: string;
    itemWeight: number;
    neededPct: number;
  }>
): AttendanceRoundingResult {
  // Attendance 총 필요량 계산
  const totalAttendanceNeeded = attendanceItems.reduce(
    (sum, item) => sum + item.neededPct,
    0
  );

  // 개수 기준 올림 (예: 8.3% 필요 → 9번 출석)
  const attendanceCountNeeded = Math.ceil(totalAttendanceNeeded);

  // 실제 획득 - 필요량 = 여유
  const surplus = attendanceCountNeeded - totalAttendanceNeeded;

  // 필요도 순으로 정렬 (높은 것부터)
  const sortedAttendance = [...attendanceItems].sort(
    (a, b) => b.neededPct - a.neededPct
  );

  // 상위 N개는 출석(1), 나머지는 결석(0)
  const result = sortedAttendance.map((item, index) => ({
    itemName: item.itemName,
    itemWeight: item.itemWeight,
    requiredScore: index < attendanceCountNeeded ? 1 : 0,
    originalNeeded: item.neededPct,
  }));

  return {
    attendanceItems: result,
    surplus: Math.max(0, surplus),
  };
}

/**
 * Redistribute surplus from attendance rounding to regular items
 */
export interface RedistributeResult {
  itemName: string;
  itemWeight: number;
  originalNeeded: number;
  additionalDeduction: number;
  finalNeeded: number;
}

export function redistributeSurplus(
  regularItems: Array<{
    itemName: string;
    itemWeight: number;
    neededPct: number;
  }>,
  surplus: number,
  strategy: "equal" | "proportional"
): RedistributeResult[] {
  if (surplus <= 0.0001 || regularItems.length === 0) {
    return regularItems.map((item) => ({
      itemName: item.itemName,
      itemWeight: item.itemWeight,
      originalNeeded: item.neededPct,
      additionalDeduction: 0,
      finalNeeded: item.neededPct,
    }));
  }

  const validItems = regularItems.filter((item) => item.neededPct > 0);

  if (validItems.length === 0) {
    return regularItems.map((item) => ({
      itemName: item.itemName,
      itemWeight: item.itemWeight,
      originalNeeded: item.neededPct,
      additionalDeduction: 0,
      finalNeeded: item.neededPct,
    }));
  }

  if (strategy === "equal") {
    // 균등 추가 감점
    let remaining = surplus;
    const updatedItems = [...validItems];
    const sacrificed: Set<number> = new Set();

    let iteration = 0;
    while (remaining > 0.0001 && updatedItems.length > sacrificed.size) {
      const activeItems = updatedItems.filter((_, idx) => !sacrificed.has(idx));
      if (activeItems.length === 0) break;

      const equalDeduction = remaining / activeItems.length;
      let carryOver = 0;

      activeItems.forEach((item, idx) => {
        const actualIdx = updatedItems.findIndex((i) => i === item);
        const newNeeded = item.neededPct - equalDeduction;

        if (newNeeded < 0) {
          carryOver += Math.abs(newNeeded);
          updatedItems[actualIdx] = { ...item, neededPct: 0 };
          sacrificed.add(actualIdx);
        } else {
          updatedItems[actualIdx] = { ...item, neededPct: newNeeded };
        }
      });

      remaining = carryOver;
      iteration++;
      if (iteration > 100) break; // Safety limit
    }

    return updatedItems.map((item) => ({
      itemName: item.itemName,
      itemWeight: item.itemWeight,
      originalNeeded: regularItems.find((r) => r.itemName === item.itemName)!
        .neededPct,
      additionalDeduction:
        regularItems.find((r) => r.itemName === item.itemName)!.neededPct -
        item.neededPct,
      finalNeeded: item.neededPct,
    }));
  } else {
    // 비례 추가 감점
    const totalNeeded = validItems.reduce(
      (sum, item) => sum + item.neededPct,
      0
    );

    return regularItems.map((item) => {
      if (item.neededPct <= 0) {
        return {
          itemName: item.itemName,
          itemWeight: item.itemWeight,
          originalNeeded: item.neededPct,
          additionalDeduction: 0,
          finalNeeded: item.neededPct,
        };
      }

      const proportion = item.neededPct / totalNeeded;
      const additionalDeduction = surplus * proportion;
      const finalNeeded = Math.max(0, item.neededPct - additionalDeduction);

      return {
        itemName: item.itemName,
        itemWeight: item.itemWeight,
        originalNeeded: item.neededPct,
        additionalDeduction,
        finalNeeded,
      };
    });
  }
}

/**
 * Format grade for display
 */
export function formatGrade(grade: number, decimals: number = 1): string {
  return grade.toFixed(decimals) + "%";
}

/**
 * Get grade color based on score
 */
export function getGradeColor(score: number): string {
  if (score >= 90) return "#16a34a"; // green
  if (score >= 80) return "#84cc16"; // lime
  if (score >= 70) return "#f59e0b"; // amber
  if (score >= 60) return "#f97316"; // orange
  return "#dc2626"; // red
}
