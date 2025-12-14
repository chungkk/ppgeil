import React from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/CategoryTag.module.css';

/**
 * CategoryTag Component (T064-T066)
 * 
 * Displays a clickable category tag/badge for articles.
 * When clicked, navigates to homepage filtered by that category.
 * 
 * Props:
 * - category: Category object with { _id, name, slug, ...other fields }
 * - onClick: Optional custom click handler (if not provided, navigates to homepage)
 * - className: Additional CSS classes
 * - size: 'small' | 'medium' | 'large' (default: 'medium')
 * - clickable: Boolean (default: true)
 */
const CategoryTag = ({ 
  category, 
  onClick, 
  className = '', 
  size = 'medium',
  clickable = true 
}) => {
  const router = useRouter();

  if (!category || !category.name) {
    return null;
  }

  const handleClick = (e) => {
    e.stopPropagation(); // Prevent parent click events (like card click)
    
    if (onClick) {
      onClick(e, category);
    } else if (clickable && category.slug) {
      // T066: Navigate to homepage with category filter
      router.push(`/?category=${category.slug}`);
    }
  };

  return (
    <span
      className={`${styles.categoryTag} ${styles[size]} ${clickable ? styles.clickable : ''} ${className}`}
      onClick={clickable ? handleClick : undefined}
      title={category.description || `Xem tất cả bài học trong danh mục "${category.name}"`}
      role={clickable ? "button" : "text"}
      tabIndex={clickable ? 0 : -1}
      onKeyPress={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          handleClick(e);
        }
      }}
    >
      <span className={styles.categoryIcon}>🏷️</span>
      <span className={styles.categoryName}>{category.name}</span>
    </span>
  );
};

export default CategoryTag;
