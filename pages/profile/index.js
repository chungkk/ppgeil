import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import UserProfileSidebar from '../../components/UserProfileSidebar';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../lib/api';
import { ProfilePageSkeleton } from '../../components/SkeletonLoader';
import { navigateWithLocale } from '../../lib/navigation';
import styles from '../../styles/profile.module.css';


function DashboardIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, userPoints } = useAuth();
  const [progress, setProgress] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load progress first
      const progressRes = await fetchWithAuth('/api/progress');
      const progressData = await progressRes.json();
      const validProgress = Array.isArray(progressData) ? progressData : [];
      setProgress(validProgress);

      // Load ALL lessons (sorted by order)
      try {
        const lessonsRes = await fetchWithAuth('/api/lessons?limit=1000');
        const lessonsData = await lessonsRes.json();
        const lessons = Array.isArray(lessonsData) ? lessonsData : (lessonsData.lessons || []);

        if (lessons && lessons.length > 0) {
          // Sort by newest first (createdAt descending)
          const sortedLessons = [...lessons].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          });
          setAllLessons(sortedLessons);
        } else {
          setAllLessons([]);
        }
      } catch {
        setAllLessons([]);
      }
    } catch {
      // Error loading data - handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateProgress = useCallback((lessonId) => {
    const lessonProgress = progress.filter(p => p.lessonId === lessonId);
    if (lessonProgress.length === 0) return 0;
    const maxProgress = Math.max(...lessonProgress.map(p => p.completionPercent || 0));
    return Math.min(100, maxProgress);
  }, [progress]);

  // Memoized lesson statistics - avoid recalculating in render
  const lessonStats = useMemo(() => {
    const lessonsWithProgress = allLessons.filter(l => calculateProgress(l.id) > 0);
    const completedLessons = lessonsWithProgress.filter(l => calculateProgress(l.id) === 100);
    const inProgressLessons = lessonsWithProgress.filter(l => {
      const p = calculateProgress(l.id);
      return p > 0 && p < 100;
    });
    // Sort by progress descending
    const sortedLessons = [...lessonsWithProgress].sort(
      (a, b) => calculateProgress(b.id) - calculateProgress(a.id)
    );

    return {
      total: allLessons.length,
      withProgress: lessonsWithProgress.length,
      completed: completedLessons.length,
      inProgress: inProgressLessons.length,
      sortedLessons,
      progressPercent: allLessons.length > 0 
        ? Math.round((lessonsWithProgress.length / allLessons.length) * 100) 
        : 0
    };
  }, [allLessons, calculateProgress]);

  // Get progress details for a lesson (both modes)
  const getProgressDetails = useCallback((lessonId) => {
    const lessonProgress = progress.filter(p => p.lessonId === lessonId);
    const shadowingProgress = lessonProgress.find(p => p.mode === 'shadowing');
    const dictationProgress = lessonProgress.find(p => p.mode === 'dictation');

    return {
      shadowing: Math.round(shadowingProgress?.completionPercent || 0),
      dictation: Math.round(dictationProgress?.completionPercent || 0),
      overall: calculateProgress(lessonId)
    };
  }, [progress, calculateProgress]);

  if (loading) {
    return (
      <div className={styles.profilePage}>
        <div className={styles.profileContainer}>
          <ProfilePageSkeleton />
        </div>
      </div>
    );
  }

  // Structured data for profile
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Profile', url: '/profile' }
  ]);

  return (
    <>
      <SEO
        title="Mein Profil | PapaGeil - Deutsch Lernen"
        description="Verfolgen Sie Ihren Deutsch-Lernfortschritt in Echtzeit. ✓ Personalisierte Statistiken ✓ Vokabeltrainer ✓ Lernhistorie ✓ Fortschrittsverfolgung für alle Niveaus A1-C2"
        keywords="PapaGeil Profile, Deutsch Lernfortschritt, Vokabeltrainer, Wortschatz verwalten, German learning progress, Deutsch Statistiken"
        canonicalUrl="/profile"
        locale="de_DE"
        structuredData={breadcrumbData}
        noindex={true}
      />

      <div className={styles.profilePage}>
        <div className={styles.profileContainer}>
          <div className={styles.profileGrid}>
            {/* LEFT COLUMN - User Profile Sidebar */}
            <UserProfileSidebar
              stats={{
                totalLessons: lessonStats.withProgress,
                completedLessons: lessonStats.completed,
                inProgressLessons: lessonStats.inProgress,
              }}
              userPoints={userPoints}
            />

            {/* RIGHT COLUMN - Main Content */}
            <div className={styles.mainContent}>
            {/* Overall Lesson Progress - List of all lessons with % */}
            <div className={styles.overallProgressSection}>
              <div className={styles.overallProgressHeader}>
                <h2 className={styles.sectionTitleSmall}>📊 Tiến độ bài học</h2>
                <div className={styles.overallStats}>
                  <span className={styles.overallStatBadge}>
                    {lessonStats.withProgress} / {lessonStats.total} bài
                  </span>
                  <span className={styles.overallStatBadge}>
                    {lessonStats.progressPercent}% tổng
                  </span>
                </div>
              </div>

              {lessonStats.withProgress === 0 ? (
                <div className={styles.emptyProgress}>
                  <div className={styles.emptyProgressIcon}>📚</div>
                  <p className={styles.emptyProgressText}>Chưa có bài học nào. Bắt đầu học ngay!</p>
                </div>
              ) : (
                <div className={styles.lessonProgressList}>
                  {lessonStats.sortedLessons.map((lesson) => {
                      const progressPercent = calculateProgress(lesson.id);
                      const progressDetails = getProgressDetails(lesson.id);
                      return (
                        <div key={lesson.id} className={styles.lessonProgressItem}>
                          <div className={styles.lessonProgressItemHeader}>
                            <div className={styles.lessonProgressItemTitle}>
                              <span className={styles.lessonProgressItemIcon}>
                                {progressPercent === 100 ? '✅' : '⏱️'}
                              </span>
                              <div className={styles.lessonProgressItemTitleText}>
                                <h4 className={styles.lessonProgressItemName}>
                                  {lesson.displayTitle || lesson.title}
                                </h4>
                                <span className={styles.lessonProgressItemLevel}>
                                  {lesson.level || 'A1'}
                                </span>
                              </div>
                            </div>
                            <div className={styles.lessonProgressItemPercent}>
                              {Math.round(progressPercent)}%
                            </div>
                          </div>

                          {/* Overall Progress Bar */}
                          <div className={styles.lessonProgressItemBar}>
                            <div
                              className={styles.lessonProgressItemBarFill}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>

                          {/* Mode Progress */}
                          <div className={styles.lessonProgressItemModes}>
                            <div className={styles.lessonProgressItemMode}>
                              <span className={styles.modeIcon}>🎤</span>
                              <span className={styles.modeName}>Shadowing</span>
                              <div className={styles.modeProgressMini}>
                                <div 
                                  className={`${styles.modeProgressMiniFill} ${styles.shadowingFillMini}`}
                                  style={{ width: `${progressDetails.shadowing}%` }}
                                />
                              </div>
                              <span className={styles.modePercentMini}>{progressDetails.shadowing}%</span>
                            </div>
                            <div className={styles.lessonProgressItemMode}>
                              <span className={styles.modeIcon}>✍️</span>
                              <span className={styles.modeName}>Dictation</span>
                              <div className={styles.modeProgressMini}>
                                <div 
                                  className={`${styles.modeProgressMiniFill} ${styles.dictationFillMini}`}
                                  style={{ width: `${progressDetails.dictation}%` }}
                                />
                              </div>
                              <span className={styles.modePercentMini}>{progressDetails.dictation}%</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className={styles.lessonProgressItemActions}>
                            <button
                              onClick={() => navigateWithLocale(router, `/shadowing/${lesson.id}`)}
                              className={`${styles.lessonProgressItemBtn} ${styles.shadowingBtn}`}
                            >
                              🎤 Shadowing
                            </button>
                            <button
                              onClick={() => navigateWithLocale(router, `/dictation/${lesson.id}`)}
                              className={`${styles.lessonProgressItemBtn} ${styles.dictationBtn}`}
                            >
                              ✍️ Dictation
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <ProtectedPage>
      <DashboardIndex />
    </ProtectedPage>
  );
}
