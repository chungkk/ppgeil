import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData, generateCourseStructuredData, generateFAQStructuredData } from '../components/SEO';
import LessonCard from '../components/LessonCard';
import { SkeletonCard } from '../components/SkeletonLoader';
import ModeSelectionPopup from '../components/ModeSelectionPopup';
import { useAuth } from '../context/AuthContext';
import { navigateWithLocale } from '../lib/navigation';

const HomePage = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [categoriesWithLessons, setCategoriesWithLessons] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showModePopup, setShowModePopup] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Set initial filter based on user level or default to beginner for non-logged-in users
    if (user && user.level) {
      setDifficultyFilter(user.level);
    } else if (!user) {
      // First-time visitors see beginner lessons by default
      setDifficultyFilter('beginner');
    }
  }, [user]);

  const fetchCategoriesWithLessons = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all active categories
      const categoriesRes = await fetch('/api/article-categories?activeOnly=true');
      const { categories: allCategories } = await categoriesRes.json();
      
      // Fetch lessons for each category
      const categoriesData = {};
      for (const category of allCategories) {
        const lessonsRes = await fetch(
          `/api/lessons?category=${category.slug}&limit=6&difficulty=${difficultyFilter}`
        );
        const data = await lessonsRes.json();
        
        // Only include categories that have lessons
        if (data.lessons && data.lessons.length > 0) {
          categoriesData[category.slug] = {
            category,
            lessons: data.lessons,
            totalCount: data.total || data.lessons.length
          };
        }
      }
      
      // Sort categories: non-system first, then system categories
      const sortedCategories = allCategories
        .filter(cat => categoriesData[cat.slug])
        .sort((a, b) => {
          if (a.isSystem === b.isSystem) return a.order - b.order;
          return a.isSystem ? 1 : -1;
        });
      
      setCategories(sortedCategories);
      setCategoriesWithLessons(categoriesData);
    } catch (error) {
      console.error('Error fetching categories and lessons:', error);
    } finally {
      setLoading(false);
    }
  }, [difficultyFilter]);

  // Fetch categories and their lessons
  useEffect(() => {
    fetchCategoriesWithLessons();
  }, [fetchCategoriesWithLessons]);

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

  const handleViewAll = (categorySlug) => {
    navigateWithLocale(router, `/category/${categorySlug}`);
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

  // Get all lessons for structured data
  const allLessons = Object.values(categoriesWithLessons).flatMap(cat => cat.lessons);

  const combinedStructuredData = [
    breadcrumbData,
    generateCourseStructuredData(allLessons, difficultyFilter),
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

      {showModePopup && selectedLesson && (
        <ModeSelectionPopup
          lesson={selectedLesson}
          onClose={handleClosePopup}
          onSelectMode={handleModeSelect}
        />
      )}

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

        {loading ? (
          <div className="category-section">
            <div className="horizontal-scroll">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="horizontal-card">
                  <SkeletonCard />
                </div>
              ))}
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="empty-state">
            <p>{t('homePage.noLessons')}</p>
          </div>
        ) : (
          categories.map((category) => {
            const categoryData = categoriesWithLessons[category.slug];
            if (!categoryData) return null;

            return (
              <div key={category.slug} className="category-section">
                <div className="category-header">
                  <h2 className="category-title">
                    {category.name} ({categoryData.totalCount} lessons)
                  </h2>
                  <button 
                    className="view-all-btn"
                    onClick={() => handleViewAll(category.slug)}
                  >
                    View all ›
                  </button>
                </div>

                <div className="horizontal-scroll">
                  {categoryData.lessons.map(lesson => (
                    <div key={lesson.id} className="horizontal-card">
                      <LessonCard
                        lesson={lesson}
                        onClick={() => handleLessonClick(lesson)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

      </div>
    </>
  );
};

export default HomePage;
