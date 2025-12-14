import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/CategoryFilter.module.css';

/**
 * CategoryFilter Component (T051-T057)
 * 
 * Displays active article categories as clickable filter pills/buttons.
 * Updates URL query parameter ?category=slug for bookmarkable filtered views.
 * 
 * Features:
 * - Fetches active categories from API
 * - "Tất cả" (All) option to clear filter
 * - Highlights selected category
 * - URL-based state for bookmarking
 * - Responsive horizontal scroll design
 * - Loading state
 * - Error handling
 */
const CategoryFilter = ({ selectedCategory, onCategoryChange, className = '' }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // T051: Fetch active categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch only active categories for public view
        const res = await fetch('/api/article-categories?activeOnly=true');
        
        if (!res.ok) {
          throw new Error('Không thể tải danh mục');
        }
        
        const data = await res.json();
        
        // Sort categories by order field (ascending)
        const sortedCategories = (data.categories || []).sort((a, b) => {
          return (a.order || 0) - (b.order || 0);
        });
        
        setCategories(sortedCategories);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // T052: Handle category selection
  const handleCategoryClick = (categorySlug) => {
    // T053: Update URL query parameter for bookmarkable URLs
    const currentPath = router.pathname;
    const currentQuery = { ...router.query };
    
    if (categorySlug === 'all' || categorySlug === selectedCategory) {
      // Clear category filter
      delete currentQuery.category;
      onCategoryChange(null);
    } else {
      // Set category filter
      currentQuery.category = categorySlug;
      onCategoryChange(categorySlug);
    }
    
    // Update URL without full page reload
    router.push(
      {
        pathname: currentPath,
        query: currentQuery
      },
      undefined,
      { shallow: true }
    );
  };

  // T054: Loading state
  if (loading) {
    return (
      <div className={`${styles.categoryFilter} ${className}`}>
        <div className={styles.categoryList}>
          <div className={styles.categoryPill} style={{ width: '80px', opacity: 0.5 }}>
            Đang tải...
          </div>
        </div>
      </div>
    );
  }

  // T055: Error state (silent fallback - don't show filter if error)
  if (error || categories.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.categoryFilter} ${className}`}>
      <div className={styles.categoryList}>
        {/* T056: "All" option */}
        <button
          type="button"
          className={`${styles.categoryPill} ${!selectedCategory ? styles.active : ''}`}
          onClick={() => handleCategoryClick('all')}
          aria-label="Xem tất cả danh mục"
        >
          <span className={styles.categoryName}>Tất cả</span>
        </button>

        {/* T057: Category pills */}
        {categories.map((category) => {
          const isActive = selectedCategory === category.slug;
          
          return (
            <button
              key={category._id}
              type="button"
              className={`${styles.categoryPill} ${isActive ? styles.active : ''}`}
              onClick={() => handleCategoryClick(category.slug)}
              aria-label={`Lọc theo danh mục ${category.name}`}
              title={category.description || category.name}
            >
              <span className={styles.categoryName}>{category.name}</span>
              {category.articleCount > 0 && (
                <span className={styles.categoryCount}>({category.articleCount})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
