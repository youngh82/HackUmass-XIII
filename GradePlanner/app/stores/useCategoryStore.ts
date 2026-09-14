// useCategoryStore.ts - Category 상태 관리
'use client';

import { create } from 'zustand';
import { Category, CategoryItem, DEFAULT_CATEGORIES } from '@/app/types/dashboard';
import { getItemWeights } from '@/lib/calculations/gradeUtils';

interface CategoryStore {
  categories: Category[];
  nextCategoryId: number;
  
  // Actions
  setCategories: (categories: Category[]) => void;
  addCategory: () => void;
  deleteCategory: (id: number) => void;
  updateCategoryName: (id: number, name: string) => void;
  updateCategoryWeight: (id: number, weight: number) => void;
  toggleCategoryItems: (id: number) => void;
  
  // Category editing states
  setEditingName: (id: number, editing: boolean) => void;
  setEditingWeight: (id: number, editing: boolean) => void;
  
  // Item actions
  addItem: (categoryId: number) => void;
  deleteItem: (categoryId: number, itemIndex: number) => void;
  updateItemName: (categoryId: number, itemIndex: number, name: string) => void;
  updateItemScore: (categoryId: number, itemIndex: number, score: number | null) => void;
  
  // Item editing states
  setEditingItemName: (categoryId: number, itemIndex: number, editing: boolean) => void;
  setEditingItemScore: (categoryId: number, itemIndex: number, editing: boolean) => void;
  
  // Utility
  calcProgressStats: () => { minPct: number; maxPct: number; remainingWeight: number };
  bumpId: () => void;
  reset: () => void;
}

export const useCategoryStore = create<CategoryStore>()((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  nextCategoryId: 1,
  
  setCategories: (categories: Category[]) => set({ categories }),
  
  addCategory: () => {
    const { categories, nextCategoryId } = get();
    const newCategory: Category = {
      id: nextCategoryId,
      name: 'New Category',
      weight: 0,
      items: [{ name: 'Item 1', score: null }],
      _open: false,
    };
    set({
      categories: [...categories, newCategory],
      nextCategoryId: nextCategoryId + 1,
    });
  },
  
  deleteCategory: (id: number) => {
    const { categories } = get();
    set({ categories: categories.filter((cat) => cat.id !== id) });
  },
  
  updateCategoryName: (id: number, name: string) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) =>
        cat.id === id ? { ...cat, name, _editingName: false } : cat
      ),
    });
  },
  
  updateCategoryWeight: (id: number, weight: number) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) =>
        cat.id === id ? { ...cat, weight, _editingWeight: false } : cat
      ),
    });
  },
  
  toggleCategoryItems: (id: number) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) =>
        cat.id === id ? { ...cat, _open: !cat._open } : cat
      ),
    });
  },
  
  setEditingName: (id: number, editing: boolean) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) =>
        cat.id === id ? { ...cat, _editingName: editing } : cat
      ),
    });
  },
  
  setEditingWeight: (id: number, editing: boolean) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) =>
        cat.id === id ? { ...cat, _editingWeight: editing } : cat
      ),
    });
  },
  
  addItem: (categoryId: number) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) => {
        if (cat.id === categoryId) {
          const newItem: CategoryItem = {
            name: `Item ${cat.items.length + 1}`,
            score: null,
          };
          return { ...cat, items: [...cat.items, newItem] };
        }
        return cat;
      }),
    });
  },
  
  deleteItem: (categoryId: number, itemIndex: number) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.filter((_, idx) => idx !== itemIndex),
          };
        }
        return cat;
      }),
    });
  },
  
  updateItemName: (categoryId: number, itemIndex: number, name: string) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.map((item, idx) =>
              idx === itemIndex ? { ...item, name, _editingName: false } : item
            ),
          };
        }
        return cat;
      }),
    });
  },
  
  updateItemScore: (categoryId: number, itemIndex: number, score: number | null) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.map((item, idx) =>
              idx === itemIndex ? { ...item, score, _editingScore: false } : item
            ),
          };
        }
        return cat;
      }),
    });
  },
  
  setEditingItemName: (categoryId: number, itemIndex: number, editing: boolean) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.map((item, idx) =>
              idx === itemIndex ? { ...item, _editingName: editing } : item
            ),
          };
        }
        return cat;
      }),
    });
  },
  
  setEditingItemScore: (categoryId: number, itemIndex: number, editing: boolean) => {
    const { categories } = get();
    set({
      categories: categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.map((item, idx) =>
              idx === itemIndex ? { ...item, _editingScore: editing } : item
            ),
          };
        }
        return cat;
      }),
    });
  },
  
  calcProgressStats: () => {
    const { categories } = get();
    let minPct = 0; // Current grade (only graded items)
    let maxPct = 0; // Maximum possible (graded items + ungraded as 100)
    let totalWeight = 0;
    
    categories.forEach((cat) => {
      totalWeight += cat.weight;
      const totalItems = cat.items.length;
      
      if (totalItems === 0) return;
      
      const weights = getItemWeights(cat);

      cat.items.forEach((item, i) => {
        const itemWeight = weights[i];
        if (item.score !== null && item.score !== undefined) {
          // Graded item: add actual score to both min and max
          const contribution = (itemWeight / 100) * item.score;
          minPct += contribution;
          maxPct += contribution;
        } else {
          // Ungraded item: add 0 to min, 100 to max
          maxPct += (itemWeight / 100) * 100;
        }
      });
    });
    
    // Add remaining weight (categories not yet created) as 100 to max
    const remainingWeight = 100 - totalWeight;
    if (remainingWeight > 0) {
      maxPct += remainingWeight;
    }
    
    // Ensure values are within 0-100 range
    minPct = Math.max(0, Math.min(100, minPct));
    maxPct = Math.max(minPct, Math.min(100, maxPct));
    
    return { minPct, maxPct, remainingWeight };
  },
  
  bumpId: () => {
    set((state) => ({ nextCategoryId: state.nextCategoryId + 1 }));
  },
  
  reset: () => {
    set({ categories: DEFAULT_CATEGORIES, nextCategoryId: 1 });
  },
}));
