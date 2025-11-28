import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData, generateCourseStructuredData, generateFAQStructuredData } from '../components/SEO';
import LessonCard from '../components/LessonCard';
import ModeSelectionPopup from '../components/ModeSelectionPopup';
import { SkeletonCard } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { useLessons, prefetchLessons } from '../lib/hooks/useLessons';
import { navigateWithLocale } from '../lib/navigation';

const HomePage = () => {
  const { t } = useTranslation();
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const itemsPerPage = 15;
  const router = useRouter();
  const { user } = useAuth();

  // Use SWR for data fetching with automatic caching
  const { lessons, totalPages, isLoading: loading } = useLessons({
    page: currentPage,
    limit: itemsPerPage,
    difficulty: difficultyFilter
  });

  // Self-create lesson states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    // Set initial filter based on user level or default to beginner for non-logged-in users
    if (user && user.level) {
      setDifficultyFilter(user.level);
    } else if (!user) {
      // First-time visitors see beginner lessons by default
      setDifficultyFilter('beginner');
    }
  }, [user]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [difficultyFilter]);

  // Prefetch next page for smoother pagination
  useEffect(() => {
    if (currentPage < totalPages) {
      prefetchLessons({
        page: currentPage + 1,
        limit: itemsPerPage,
        difficulty: difficultyFilter
      });
    }
  }, [currentPage, totalPages, difficultyFilter]);

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

  const handleLessonClick = async (lesson) => {
    // Fetch study time for both modes
    const token = localStorage.getItem('token');
    let shadowingStudyTime = 0;
    let dictationStudyTime = 0;
    
    if (token && user) {
      try {
        const [shadowingRes, dictationRes] = await Promise.all([
          fetch(`/api/progress?lessonId=${lesson.id}&mode=shadowing`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/progress?lessonId=${lesson.id}&mode=dictation`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        if (shadowingRes.ok) {
          const shadowingData = await shadowingRes.json();
          shadowingStudyTime = shadowingData.studyTime || 0;
        }
        
        if (dictationRes.ok) {
          const dictationData = await dictationRes.json();
          dictationStudyTime = dictationData.studyTime || 0;
        }
      } catch (error) {
        console.error('Error fetching study time:', error);
      }
    }
    
    setSelectedLesson({
      ...lesson,
      shadowingStudyTime,
      dictationStudyTime
    });
    setShowPopup(true);
  };

  const handleModeSelect = (lesson, mode) => {
    // Increment view count
    fetch(`/api/lessons/${lesson.id}/view`, {
      method: 'POST'
    }).catch(err => console.error('Error incrementing view count:', err));
    
    // Navigate to the specific lesson and mode
    navigateWithLocale(router, `/${mode}/${lesson.id}`);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedLesson(null);
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setIsCreating(true);
    setCreateError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setCreateError(t('homePage.createLesson.loginRequired'));
        return;
      }

      const res = await fetch('/api/create-self-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        // Store lesson data in localStorage for temporary use
        localStorage.setItem(`self-lesson-${data.lesson.id}`, JSON.stringify(data.lesson));
        navigateWithLocale(router, `/self-lesson/${data.lesson.id}`);
      } else {
        const error = await res.json();
        setCreateError(error.message || t('homePage.createLesson.error'));
      }
    } catch (error) {
      setCreateError(t('homePage.createLesson.connectionError'));
    } finally {
      setIsCreating(false);
    }
  };

  // Structured data for homepage
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' }
  ]);

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

  // Generate structured data for the homepage
  const faqData = [
    {
      question: t('homePage.faq.shadowing.question'),
      answer: t('homePage.faq.shadowing.answer')
    },
    {
      question: t('homePage.faq.levels.question'),
      answer: t('homePage.faq.levels.answer')
    },
    {
      question: t('homePage.faq.youtube.question'),
      answer: t('homePage.faq.youtube.answer')
    },
    {
      question: t('homePage.faq.dictation.question'),
      answer: t('homePage.faq.dictation.answer')
    },
    {
      question: t('homePage.faq.free.question'),
      answer: t('homePage.faq.free.answer')
    }
  ];

  const combinedStructuredData = [
    breadcrumbData,
    generateCourseStructuredData(lessons, difficultyFilter),
    generateFAQStructuredData(faqData)
  ];

  return (
    <>
      <SEO
        title="PapaGeil - Lerne Deutsch mit YouTube Videos | Shadowing & Diktat"
        description="Verbessere dein Deutsch durch interaktive Shadowing und Diktat-Übungen mit authentischen YouTube-Videos. ✓ 100+ Lektionen ✓ Alle Niveaus A1-C2 ✓ Kostenlos starten"
        keywords="Deutsch lernen online, German learning, Shadowing Methode, Diktat Übungen, YouTube Deutsch lernen, Aussprache verbessern, Deutsch Kurs online, A1 A2 B1 B2 C1 C2, Hörverstehen Deutsch, deutsche Sprache, German pronunciation, learn German free"
        ogImage="/og-image.jpg"
        structuredData={combinedStructuredData}
      />

      <div className="main-container">

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

        {/* Self-create lesson form */}
        <form
          onSubmit={handleCreateLesson}
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}
        >
          <input
            type="url"
            placeholder={t('homePage.createLesson.placeholder') || 'YouTube URL...'}
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '12px 16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '15px',
              outline: 'none'
            }}
            disabled={isCreating}
          />
          <button
            type="submit"
            disabled={isCreating || !youtubeUrl.trim()}
            style={{
              padding: '12px 24px',
              background: isCreating || !youtubeUrl.trim() ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              cursor: isCreating || !youtubeUrl.trim() ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            {isCreating ? (t('homePage.createLesson.creating') || 'Đang tạo...') : (t('homePage.createLesson.button') || 'Tạo bài học')}
          </button>
        </form>

        <div className="lesson-cards-container">
          {loading ? (
            Array.from({ length: itemsPerPage }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
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

        {showPopup && selectedLesson && (
          <ModeSelectionPopup
            lesson={selectedLesson}
            onClose={handleClosePopup}
            onSelectMode={handleModeSelect}
          />
        )}
      </div>
    </>
  );
};

export default HomePage;
