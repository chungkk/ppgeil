import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import LessonCard from '../../components/LessonCard';
import { SkeletonCard } from '../../components/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import { useLessons, prefetchLessons } from '../../lib/hooks/useLessons';
import { navigateWithLocale } from '../../lib/navigation';

const CategoryPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { slug } = router.query;
  const [currentPage, setCurrentPage] = useState(1);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [category, setCategory] = useState(null);
  const itemsPerPage = 15;
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.level) {
      setDifficultyFilter(user.level);
    } else if (!user) {
      setDifficultyFilter('beginner');
    }
  }, [user]);

  const fetchCategory = useCallback(async () => {
    try {
      const res = await fetch('/api/article-categories?activeOnly=true');
      const { categories } = await res.json();
      const foundCategory = categories.find(cat => cat.slug === slug);
      setCategory(foundCategory);
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  }, [slug]);

  // Fetch category info
  useEffect(() => {
    if (slug) {
      fetchCategory();
    }
  }, [slug, fetchCategory]);

  const { lessons, totalPages, isLoading: loading } = useLessons({
    page: currentPage,
    limit: itemsPerPage,
    difficulty: difficultyFilter,
    category: slug
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [difficultyFilter, slug]);

  useEffect(() => {
    if (currentPage < totalPages) {
      prefetchLessons({
        page: currentPage + 1,
        limit: itemsPerPage,
        difficulty: difficultyFilter,
        category: slug
      });
    }
  }, [currentPage, totalPages, difficultyFilter, slug]);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleLessonClick = (lesson) => {
    fetch(`/api/lessons/${lesson.id}/view`, {
      method: 'POST'
    }).catch(err => console.error('Error incrementing view count:', err));
    
    const route = `/${lesson.id}`;
    navigateWithLocale(router, route);
  };

  const handleBackToHome = () => {
    navigateWithLocale(router, '/');
  };

  const difficultyOptions = [
    {
      value: 'beginner',
      title: t('homePage.filters.beginner.title'),
      description: t('homePage.filters.beginner.description')
    },
    {
      value: 'experienced',
      title: t('homePage.filters.experienced.title'),
      description: t('homePage.filters.experienced.description')
    }
  ];

  if (!slug) {
    return null;
  }

  return (
    <>
      <SEO
        title={`${category?.name || slug} - PapaGeil`}
        description={category?.description || `Browse all lessons in ${category?.name || slug} category`}
      />

      <div className="main-container">
        {/* Back button */}
        <button 
          onClick={handleBackToHome}
          className="back-to-home-btn"
        >
          ‹ Back to Home
        </button>

        {/* Category header */}
        {category && (
          <div className="category-page-header">
            <h1 className="category-page-title">{category.name}</h1>
            {category.description && (
              <p className="category-page-description">{category.description}</p>
            )}
          </div>
        )}

        {/* Difficulty toggle */}
        <div className="difficulty-toggle">
          {difficultyOptions.map((option) => {
            const isActive = difficultyFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`difficulty-toggle__option ${isActive ? 'active' : ''}`}
                onClick={() => setDifficultyFilter(isActive ? 'all' : option.value)}
              >
                <span className="difficulty-toggle__title">{option.title}</span>
                <span className="difficulty-toggle__description">{option.description}</span>
              </button>
            );
          })}
        </div>

        {/* Lessons grid */}
        <div className="lesson-cards-container">
          {loading ? (
            Array.from({ length: itemsPerPage }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : lessons.length === 0 ? (
            <div className="empty-state">
              <p>No lessons found in this category.</p>
            </div>
          ) : (
            lessons.map(lesson => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onClick={() => handleLessonClick(lesson)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ‹ {t('homePage.pagination.previous')}
            </button>
            <span className="pagination-info">
              {t('homePage.pagination.page', { current: currentPage, total: totalPages })}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              {t('homePage.pagination.next')} ›
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CategoryPage;
