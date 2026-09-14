// types.ts - Dashboard 관련 타입 정의

export interface CategoryItem {
  name: string;
  score: number | null;
  maxScore?: number; // Canvas points possible; used to weight items within a category
  isAttendance?: boolean; // 출석 항목 여부 (0 또는 100만 가능)
  _editingName?: boolean;
  _editingScore?: boolean;
}

export interface Category {
  id: number;
  name: string;
  weight: number;
  items: CategoryItem[];
  _editingName?: boolean;
  _editingWeight?: boolean;
  _open?: boolean;
}

export interface GradeStats {
  minPct: number;
  maxPct: number;
  remainingWeight: number;
}

export interface UngradedItem {
  categoryName: string;
  categoryWeight: number;
  categoryId: number;
  itemName: string;
  itemId: number;
  itemWeight: number;
  totalItemsInCategory: number;
  assumedScore: number;
  deductedPoints: number;
  maxDeduction: number;
  isPinned: boolean;
  isAttendance?: boolean; // 출석 항목 여부
}

export type TargetGrade = "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-";

export const GRADE_MAP: Record<TargetGrade, number> = {
  A: 93,
  "A-": 90,
  "B+": 87,
  B: 83,
  "B-": 80,
  "C+": 77,
  C: 73,
  "C-": 70,
};

export const GRADE_OPTIONS: TargetGrade[] = [
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
];

export const DEFAULT_CATEGORIES: Category[] = [];
