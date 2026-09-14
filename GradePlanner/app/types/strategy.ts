// strategy.ts - Grade Strategy Types
export type StrategyType = "proportional" | "equal";

export interface Strategy {
  id: StrategyType;
  name: string;
  description: string;
  calculate: (ungradedItems: any[], totalDeductiblePoints: number) => any[];
}

// Proportional Strategy - 비례 배분 전략 (Python Proportional Distribution 완전 구현)
export const proportionalStrategy: Strategy = {
  id: "proportional",
  name: "Proportional Distribution",
  description:
    "Aim for the same score on every remaining item, so heavier items absorb more of the allowed loss",
  calculate: (ungradedItems, totalDeductiblePoints) => {
    if (totalDeductiblePoints <= 0) {
      return ungradedItems.map((item) => ({
        ...item,
        maxDeduction: 0,
        deductedPoints: 0,
        assumedScore: item.isAttendance ? 1 : 100,
      }));
    }

    // Set max deduction for each item
    const updatedItems = ungradedItems.map((item) => ({
      ...item,
      maxDeduction: item.itemWeight,
    }));

    // Separate attendance and regular items
    const attendanceItems = updatedItems.filter((item) => item.isAttendance);
    const regularItems = updatedItems.filter((item) => !item.isAttendance);
    const allItems = [...regularItems, ...attendanceItems];

    const totalWeight = allItems.reduce(
      (sum, item) => sum + item.itemWeight,
      0
    );

    if (totalWeight <= 0) {
      return updatedItems;
    }

    // Phase 1: 비례 배분 - 달성 비율 계산
    // achievement_ratio = (total_remaining - deduction_allowed) / total_remaining
    const achievementRatio =
      (totalWeight - totalDeductiblePoints) / totalWeight;

    const itemsWithNeeded = allItems.map((item) => ({
      item,
      neededPct: item.itemWeight * achievementRatio,
      isAttendance: item.isAttendance || false,
    }));

    // Phase 2: Attendance 올림 처리
    const attendanceWithNeeded = itemsWithNeeded.filter((i) => i.isAttendance);
    const regularWithNeeded = itemsWithNeeded.filter((i) => !i.isAttendance);

    let attendanceSurplus = 0;

    if (attendanceWithNeeded.length > 0) {
      const totalAttendanceNeeded = attendanceWithNeeded.reduce(
        (sum, { neededPct }) => sum + neededPct,
        0
      );
      const attendanceCountNeeded = Math.ceil(totalAttendanceNeeded);
      attendanceSurplus = attendanceCountNeeded - totalAttendanceNeeded;

      // Sort by needed percentage (highest first)
      const sortedAttendance = [...attendanceWithNeeded].sort(
        (a, b) => b.neededPct - a.neededPct
      );

      // Top N attend, rest are absent
      sortedAttendance.forEach(({ item }, index) => {
        const itemIndex = itemsWithNeeded.findIndex(
          (i) =>
            i.item.categoryId === item.categoryId &&
            i.item.itemName === item.itemName
        );
        if (index < attendanceCountNeeded) {
          itemsWithNeeded[itemIndex].neededPct = item.itemWeight; // Full attendance
        } else {
          itemsWithNeeded[itemIndex].neededPct = 0; // Absent
        }
      });
    }

    // Phase 3: 여유를 다른 항목에 비례 배분으로 추가 감점
    if (attendanceSurplus > 0.0001 && regularWithNeeded.length > 0) {
      const totalRegularNeeded = regularWithNeeded.reduce(
        (sum, { neededPct }) => sum + neededPct,
        0
      );

      if (totalRegularNeeded > 0) {
        regularWithNeeded.forEach(({ item }) => {
          const itemIndex = itemsWithNeeded.findIndex(
            (i) =>
              i.item.categoryId === item.categoryId &&
              i.item.itemName === item.itemName
          );
          const currentNeeded = itemsWithNeeded[itemIndex].neededPct;
          const proportion = currentNeeded / totalRegularNeeded;
          const additionalDeduction = attendanceSurplus * proportion;
          itemsWithNeeded[itemIndex].neededPct = Math.max(
            0,
            currentNeeded - additionalDeduction
          );
        });
      }
    }

    // Phase 4: Convert to final scores
    return itemsWithNeeded.map(({ item, neededPct, isAttendance }) => {
      const deductedPoints = item.itemWeight - neededPct;
      let assumedScore: number;

      if (isAttendance) {
        // Attendance: 0 or 1
        assumedScore = neededPct >= item.itemWeight * 0.5 ? 1 : 0;
      } else {
        // Regular items: 0-100 score
        const scoreReduction = (deductedPoints * 100) / item.itemWeight;
        assumedScore = parseFloat(
          Math.max(0, Math.min(100, 100 - scoreReduction)).toFixed(1)
        );
      }

      return {
        ...item,
        deductedPoints: Math.max(0, deductedPoints),
        assumedScore,
      };
    });
  },
};

// Equal Strategy - 균등 감점 + 희생 전략 (Python Equal Distribution 완전 구현)
export const equalStrategy: Strategy = {
  id: "equal",
  name: "Equal Distribution",
  description:
    "Give up the same grade points on every remaining item; small items may drop to 0",
  calculate: (ungradedItems, totalDeductiblePoints) => {
    if (totalDeductiblePoints <= 0 || ungradedItems.length === 0) {
      return ungradedItems.map((item) => ({
        ...item,
        maxDeduction: 0,
        deductedPoints: 0,
        assumedScore: item.isAttendance ? 1 : 100,
      }));
    }

    // Set max deduction for each item
    const updatedItems = ungradedItems.map((item) => ({
      ...item,
      maxDeduction: item.itemWeight,
    }));

    // Separate attendance and regular items
    const attendanceItems = updatedItems.filter((item) => item.isAttendance);
    const regularItems = updatedItems.filter((item) => !item.isAttendance);
    const allItems = [...regularItems, ...attendanceItems];

    // Phase 1: 균등 감점 (Equal deduction to all items)
    let remaining = totalDeductiblePoints;
    const itemsWithNeeded: Array<{
      item: any;
      neededPct: number;
      isAttendance: boolean;
    }> = allItems.map((item) => ({
      item,
      neededPct: item.itemWeight,
      isAttendance: item.isAttendance || false,
    }));

    let iteration = 0;
    const sacrificed: Set<string> = new Set();

    // 균등 감점 반복 (희생 전략)
    while (remaining > 0.0001 && itemsWithNeeded.length > sacrificed.size) {
      const activeItems = itemsWithNeeded.filter(
        ({ item }) => !sacrificed.has(`${item.categoryId}-${item.itemName}`)
      );
      if (activeItems.length === 0) break;

      const equalDeduction = remaining / activeItems.length;
      let carryOver = 0;

      activeItems.forEach(({ item, neededPct }) => {
        const itemKey = `${item.categoryId}-${item.itemName}`;
        const newNeeded = neededPct - equalDeduction;

        const itemIndex = itemsWithNeeded.findIndex(
          (i) => `${i.item.categoryId}-${i.item.itemName}` === itemKey
        );

        if (newNeeded < 0) {
          // 희생: 이 항목은 0점 처리
          itemsWithNeeded[itemIndex].neededPct = 0;
          carryOver += Math.abs(newNeeded);
          sacrificed.add(itemKey);
        } else {
          itemsWithNeeded[itemIndex].neededPct = newNeeded;
        }
      });

      remaining = carryOver;
      iteration++;
      if (iteration > 100) break; // Safety
    }

    // Phase 2: Attendance 올림 처리
    const attendanceWithNeeded = itemsWithNeeded.filter((i) => i.isAttendance);
    const regularWithNeeded = itemsWithNeeded.filter((i) => !i.isAttendance);

    let attendanceSurplus = 0;

    if (attendanceWithNeeded.length > 0) {
      const totalAttendanceNeeded = attendanceWithNeeded.reduce(
        (sum, { neededPct }) => sum + neededPct,
        0
      );
      const attendanceCountNeeded = Math.ceil(totalAttendanceNeeded);
      attendanceSurplus = attendanceCountNeeded - totalAttendanceNeeded;

      // Sort by needed percentage (highest first)
      const sortedAttendance = [...attendanceWithNeeded].sort(
        (a, b) => b.neededPct - a.neededPct
      );

      // Top N attend, rest are absent
      sortedAttendance.forEach(({ item, neededPct }, index) => {
        const itemIndex = itemsWithNeeded.findIndex(
          (i) =>
            i.item.categoryId === item.categoryId &&
            i.item.itemName === item.itemName
        );
        if (index < attendanceCountNeeded) {
          itemsWithNeeded[itemIndex].neededPct = item.itemWeight; // Full attendance
        } else {
          itemsWithNeeded[itemIndex].neededPct = 0; // Absent
        }
      });
    }

    // Phase 3: 여유를 다른 항목에 균등 재분배
    if (attendanceSurplus > 0.0001 && regularWithNeeded.length > 0) {
      let surplusRemaining = attendanceSurplus;
      let iter = 0;
      const sacrificedInRedist: Set<string> = new Set();

      while (surplusRemaining > 0.0001 && iter < 100) {
        const activeRegular = regularWithNeeded.filter(
          ({ item, neededPct }) =>
            !sacrificedInRedist.has(`${item.categoryId}-${item.itemName}`) &&
            neededPct > 0
        );
        if (activeRegular.length === 0) break;

        const equalSurplus = surplusRemaining / activeRegular.length;
        let carryOver = 0;

        activeRegular.forEach(({ item }) => {
          const itemKey = `${item.categoryId}-${item.itemName}`;
          const itemIndex = itemsWithNeeded.findIndex(
            (i) =>
              i.item.categoryId === item.categoryId &&
              i.item.itemName === item.itemName
          );
          const currentNeeded = itemsWithNeeded[itemIndex].neededPct;
          const newNeeded = currentNeeded - equalSurplus;

          if (newNeeded < 0) {
            itemsWithNeeded[itemIndex].neededPct = 0;
            carryOver += Math.abs(newNeeded);
            sacrificedInRedist.add(itemKey);
          } else {
            itemsWithNeeded[itemIndex].neededPct = newNeeded;
          }
        });

        surplusRemaining = carryOver;
        iter++;
      }
    }

    // Phase 4: Convert to final scores
    return itemsWithNeeded.map(({ item, neededPct, isAttendance }) => {
      const deductedPoints = item.itemWeight - neededPct;
      let assumedScore: number;

      if (isAttendance) {
        // Attendance: 0 or 1
        assumedScore = neededPct >= item.itemWeight * 0.5 ? 1 : 0;
      } else {
        // Regular items: 0-100 score
        const scoreReduction = (deductedPoints * 100) / item.itemWeight;
        assumedScore = parseFloat(
          Math.max(0, Math.min(100, 100 - scoreReduction)).toFixed(1)
        );
      }

      return {
        ...item,
        deductedPoints: Math.max(0, deductedPoints),
        assumedScore,
      };
    });
  },
};

// 사용 가능한 모든 전략
export const AVAILABLE_STRATEGIES: Strategy[] = [
  proportionalStrategy,
  equalStrategy,
];

// 전략 찾기 헬퍼 함수
export const getStrategy = (type: StrategyType): Strategy => {
  return (
    AVAILABLE_STRATEGIES.find((s) => s.id === type) || proportionalStrategy
  );
};
