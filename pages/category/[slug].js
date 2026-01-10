import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import LessonCard from '../../components/LessonCard';
import { SkeletonCard } from '../../components/SkeletonLoader';
import ModeSelectionPopup from '../../components/ModeSelectionPopup';
import { useLessons, prefetchLessons } from '../../lib/hooks/useLessons';
import { navigateWithLocale } from '../../lib/navigation';

const CategoryPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { slug } = router.query;
  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showModePopup, setShowModePopup] = useState(false);
  const itemsPerPage = 15;

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
    difficulty: 'all',
    category: slug
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [slug]);

  useEffect(() => {
    if (currentPage < totalPages) {
      prefetchLessons({
        page: currentPage + 1,
        limit: itemsPerPage,
        difficulty: 'all',
        category: slug
      });
    }
  }, [currentPage, totalPages, slug]);

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
    // Increment view count
    fetch(`/api/lessons/${lesson.id}/view`, {
      method: 'POST'
    }).catch(err => console.error('Error incrementing view count:', err));

    // Show mode selection popup
    setSelectedLesson(lesson);
    setShowModePopup(true);
  };

  const handleModeSelect = (lesson, mode) => {
    // Close popup
    setShowModePopup(false);
    setSelectedLesson(null);

    // Navigate to appropriate page based on mode
    let route;
    if (mode === 'dictation') {
      route = `/dictation/${lesson.id}`;
    } else {
      route = `/shadowing/${lesson.id}`;
    }
    navigateWithLocale(router, route);
  };

  const handleClosePopup = () => {
    setShowModePopup(false);
    setSelectedLesson(null);
  };

  const handleBackToHome = () => {
    navigateWithLocale(router, '/');
  };

  if (!slug) {
    return null;
  }

  return (
    <>
      <SEO
        title={`${category?.name || slug} - PapaGeil`}
        description={category?.description || `Browse all lessons in ${category?.name || slug} category`}
      />

      {showModePopup && selectedLesson && (
        <ModeSelectionPopup
          lesson={selectedLesson}
          onClose={handleClosePopup}
          onSelectMode={handleModeSelect}
        />
      )}

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
            {category.description && category.description.toLowerCase() !== category.name.toLowerCase() && (
              <p className="category-page-description">{category.description}</p>
            )}
          </div>
        )}

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

