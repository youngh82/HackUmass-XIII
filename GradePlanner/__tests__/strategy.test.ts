import { describe, test, expect } from 'vitest';
import { proportionalStrategy, equalStrategy } from '@/app/types/strategy';
import { UngradedItem } from '@/app/types/dashboard';

describe('Strategy labels', () => {
  // The UI shows `name`, so it must describe what `calculate` actually does
  test('names match their calculation logic', () => {
    expect(proportionalStrategy.name).toBe('Proportional Distribution');
    expect(equalStrategy.name).toBe('Equal Distribution');
  });
});

describe('Proportional Distribution Strategy', () => {
  test('should distribute scores proportionally based on item weights', () => {
    // Example: 3 ungraded items with different weights
    // Total remaining: 30% (exam: 15%, hw: 10%, quiz: 5%)
    // Deductible: 7% (can afford to lose 7%)
    // Achievement ratio: (30 - 7) / 30 = 0.7667
    // Each item needs: weight × 0.7667
    
    const ungradedItems: UngradedItem[] = [
      {
        categoryName: 'Exams',
        categoryWeight: 50,
        categoryId: 1,
        itemName: 'Final Exam',
        itemId: 1,
        itemWeight: 15,
        totalItemsInCategory: 3,
        assumedScore: 100,
        deductedPoints: 0,
        maxDeduction: 0,
        isPinned: false,
      },
      {
        categoryName: 'Homework',
        categoryWeight: 30,
        categoryId: 2,
        itemName: 'HW5',
        itemId: 2,
        itemWeight: 10,
        totalItemsInCategory: 3,
        assumedScore: 100,
        deductedPoints: 0,
        maxDeduction: 0,
        isPinned: false,
      },
      {
        categoryName: 'Quizzes',
        categoryWeight: 20,
        categoryId: 3,
        itemName: 'Quiz 10',
        itemId: 3,
        itemWeight: 5,
        totalItemsInCategory: 10,
        assumedScore: 100,
        deductedPoints: 0,
        maxDeduction: 0,
        isPinned: false,
      },
    ];

    const totalDeductiblePoints = 7;

    const result = proportionalStrategy.calculate(ungradedItems, totalDeductiblePoints);

    // Total weight: 30%
    // Achievement ratio: (30 - 7) / 30 = 23/30 = 0.7667
    const totalWeight = 30;
    const achievementRatio = (totalWeight - totalDeductiblePoints) / totalWeight;

    // Exam: 15 × 0.7667 = 11.5% needed → (11.5 / 15) × 100 = 76.67%
    // HW: 10 × 0.7667 = 7.667% needed → (7.667 / 10) × 100 = 76.67%
    // Quiz: 5 × 0.7667 = 3.833% needed → (3.833 / 5) × 100 = 76.67%

    const expectedScore = achievementRatio * 100;

    expect(result[0].assumedScore).toBeCloseTo(expectedScore, 1);
    expect(result[1].assumedScore).toBeCloseTo(expectedScore, 1);
    expect(result[2].assumedScore).toBeCloseTo(expectedScore, 1);

    // All items should have the same percentage score (proportional characteristic)
    expect(result[0].assumedScore).toBeCloseTo(result[1].assumedScore, 1);
    expect(result[1].assumedScore).toBeCloseTo(result[2].assumedScore, 1);
  });

  test('should handle zero deductible points (need 100% on everything)', () => {
    const ungradedItems: UngradedItem[] = [
      {
        categoryName: 'Exams',
        categoryWeight: 50,
        categoryId: 1,
        itemName: 'Final',
        itemId: 1,
        itemWeight: 20,
        totalItemsInCategory: 2,
        assumedScore: 100,
        deductedPoints: 0,
        maxDeduction: 0,
        isPinned: false,
      },
    ];

    const result = proportionalStrategy.calculate(ungradedItems, 0);

    expect(result[0].assumedScore).toBe(100);
    expect(result[0].deductedPoints).toBe(0);
  });
});

describe('Equal Distribution Strategy', () => {
  test('should distribute deductions equally with sacrifice', () => {
    // Example: 2 items with different weights
    // exam: 10%, quiz: 2%
    // Deductible: 7%
    
    // Iteration 1: 7% / 2 items = 3.5% per item
    // - exam: 10 - 3.5 = 6.5% remaining
    // - quiz: 2 - 3.5 = -1.5% → sacrifice (goes to 0), carry over 1.5%
    
    // Iteration 2: 1.5% / 1 item = 1.5%
    // - exam: 6.5 - 1.5 = 5% remaining
    
    // Final: exam needs 5% out of 10% = 50%, quiz = 0%

    const ungradedItems: UngradedItem[] = [
      {
        categoryName: 'Exams',
        categoryWeight: 30,
        categoryId: 1,
        itemName: 'exam3',
        itemId: 1,
        itemWeight: 10,
        totalItemsInCategory: 3,
        assumedScore: 100,
        deductedPoints: 0,
        maxDeduction: 0,
        isPinned: false,
      },
      {
        categoryName: 'Quizzes',
        categoryWeight: 24,
        categoryId: 2,
        itemName: 'quiz12',
        itemId: 2,
        itemWeight: 2,
        totalItemsInCategory: 12,
        assumedScore: 100,
        deductedPoints: 0,
        maxDeduction: 0,
        isPinned: false,
      },
    ];

    const totalDeductiblePoints = 7;

    const result = equalStrategy.calculate(ungradedItems, totalDeductiblePoints);

    // exam3 should have remaining weight of 5% → score = 50%
    expect(result[0].assumedScore).toBeCloseTo(50, 1);
    
    // quiz12 should be sacrificed → score = 0%
    expect(result[1].assumedScore).toBe(0);

    // Total deductions should equal totalDeductiblePoints
    const totalDeductions = result.reduce((sum, item) => sum + item.deductedPoints, 0);
    expect(totalDeductions).toBeCloseTo(totalDeductiblePoints, 2);
  });

  test('should handle equal deduction without sacrifice', () => {
    // 3 items, each 10%, deductible 6%
    // 6 / 3 = 2% per item
    // Each ends up with 8% → 80% score

    const ungradedItems: UngradedItem[] = [
      {
        categoryName: 'Exams',
        categoryWeight: 50,
        categoryId: 1,
        itemName: 'exam1',
        itemId: 1,
        itemWeight: 10,
        totalItemsInCategory: 5,
        assumedScore: 100,
        deductedPoints: 0,
        maxDeduction: 0,
        isPinned: false,
      },
      {
        categoryName: 'Exams',
        categoryWeight: 50,
        categoryId: 1,
        itemName: 'exam2',
        itemId: 2,
        itemWeight: 10,
        totalItemsInCategory: 5,
        assumedScore: 100,
        deductedPoints: 0,
        maxDeduction: 0,
        isPinned: false,
      },
      {
        categoryName: 'Exams',
        categoryWeight: 50,
        categoryId: 1,
        itemName: 'exam3',
        itemId: 3,
        itemWeight: 10,
        totalItemsInCategory: 5,
        assumedScore: 100,
        deductedPoints: 0,
        maxDeduction: 0,
        isPinned: false,
      },
    ];

    const totalDeductiblePoints = 6;

    const result = equalStrategy.calculate(ungradedItems, totalDeductiblePoints);

    // Each should have 2% deduction → 8% remaining → 80% score
    expect(result[0].assumedScore).toBeCloseTo(80, 1);
    expect(result[1].assumedScore).toBeCloseTo(80, 1);
    expect(result[2].assumedScore).toBeCloseTo(80, 1);

    // All should have equal deduction
    expect(result[0].deductedPoints).toBeCloseTo(result[1].deductedPoints, 2);
    expect(result[1].deductedPoints).toBeCloseTo(result[2].deductedPoints, 2);
  });
});
