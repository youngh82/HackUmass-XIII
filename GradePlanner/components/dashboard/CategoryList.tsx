// CategoryList.tsx - 전체 카테고리 리스트 컨테이너
'use client';

import { useCategoryStore } from '@/app/stores/useCategoryStore';
import CategoryCard from './CategoryCard';

export default function CategoryList() {
  const categories = useCategoryStore((state) => state.categories);
  const addCategory = useCategoryStore((state) => state.addCategory);
  
  const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
  // Tolerate float drift from derived weights like 33.3 + 33.3 + 33.4
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;
  
  return (
    <>
      <div className="row space-between" style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Grade Categories</h3>
        <button 
          className="btn btn--primary btn-small" 
          id="addCategoryBtn"
          onClick={addCategory}
        >
          + Add Category
        </button>
      </div>
      
      <div id="categoriesList" className="category-grid">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
      
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: 'var(--bg-gray)', 
        borderRadius: '8px', 
        fontSize: '14px', 
        color: 'var(--txt-muted)' 
      }}>
        <b>Total Weight:</b> <span id="totalWeight">{parseFloat(totalWeight.toFixed(1))}</span>% 
        {!isWeightValid && (
          <span 
            id="weightWarning" 
            style={{ color: '#dc2626' }}
          >
            {' '}Must equal 100%
          </span>
        )}
      </div>
    </>
  );
}
