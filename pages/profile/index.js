import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
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
  const [recentActivity, setRecentActivity] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load progress first
      const progressRes = await fetchWithAuth('/api/progress');
      const progressData = await progressRes.json();
      const validProgress = Array.isArray(progressData) ? progressData : [];
      setProgress(validProgress);

      // Generate recent activity from progress
      const sortedProgress = [...validProgress]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
        .slice(0, 5);
      setRecentActivity(sortedProgress);

      // Load ALL lessons (sorted by order)
      try {
        const lessonsRes = await fetchWithAuth('/api/lessons?limit=1000');
        const lessonsData = await lessonsRes.json();
        const lessons = Array.isArray(lessonsData) ? lessonsData : (lessonsData.lessons || []);

        if (lessons && lessons.length > 0) {
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

  // Memoized lesson statistics
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

    // Calculate average progress of lessons that have been started
    const avgProgress = lessonsWithProgress.length > 0
      ? Math.round(lessonsWithProgress.reduce((sum, l) => sum + calculateProgress(l.id), 0) / lessonsWithProgress.length)
      : 0;

    return {
      total: allLessons.length,
      withProgress: lessonsWithProgress.length,
      completed: completedLessons.length,
      inProgress: inProgressLessons.length,
      sortedLessons,
      progressPercent: avgProgress
    };
  }, [allLessons, calculateProgress]);

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Format join date
  const formatJoinDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.profilePage}>
        <ProfilePageSkeleton />
      </div>
    );
  }

  // Structured data for profile
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Profile', url: '/profile' }
  ]);

  // Get user streak from AuthContext
  const userStreak = user?.streak?.currentStreak || 0;
  const maxStreak = user?.streak?.maxStreak || 0;

  // Achievements data
  const achievements = [
    { icon: '🎯', name: 'Khởi đầu', unlocked: lessonStats.withProgress > 0 },
    { icon: '⚡', name: 'Chăm chỉ', unlocked: lessonStats.withProgress >= 5 },
    { icon: '🏆', name: 'Hoàn hảo', unlocked: lessonStats.completed >= 3 },
    { icon: '🔥', name: '7 ngày', unlocked: userStreak >= 7 || maxStreak >= 7 },
    { icon: '💎', name: 'VIP', unlocked: userPoints >= 1000 },
    { icon: '🎓', name: 'Bậc thầy', unlocked: lessonStats.completed >= 10 },
  ];

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
            {/* Left Sidebar */}
            <UserProfileSidebar
              stats={{
                totalLessons: lessonStats.withProgress,
                completedLessons: lessonStats.completed,
                inProgressLessons: lessonStats.inProgress,
              }}
              userPoints={userPoints}
              achievements={achievements}
            />

            {/* Main Content */}
            <div className={styles.mainContent}>
              {/* Page Header */}
              <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                  <h1 className={styles.pageTitle}>
                    <span className={styles.titleIcon}>👤</span>
                    Hồ sơ của tôi
                  </h1>
                  <p className={styles.pageSubtitle}>
                    Theo dõi tiến độ học tập tiếng Đức của bạn
                  </p>
                </div>
                <div className={styles.headerActions}>
                  <Link href="/profile/vocabulary" className={styles.vocabBtn}>
                    <span>📚</span> Từ vựng
                  </Link>
                  <Link href="/profile/settings" className={styles.settingsBtn}>
                    <span>⚙️</span> Cài đặt
                  </Link>
                </div>
              </div>

              {/* Stats Grid */}
              <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.points}`}>
                  <div className={styles.statCardIcon}>💎</div>
                  <div className={styles.statCardContent}>
                    <span className={styles.statCardValue}>{userPoints?.toLocaleString() || 0}</span>
                    <span className={styles.statCardLabel}>Điểm</span>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.lessons}`}>
                  <div className={styles.statCardIcon}>📚</div>
                  <div className={styles.statCardContent}>
                    <span className={styles.statCardValue}>{lessonStats.withProgress}</span>
                    <span className={styles.statCardLabel}>Đã học</span>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.completed}`}>
                  <div className={styles.statCardIcon}>✅</div>
                  <div className={styles.statCardContent}>
                    <span className={styles.statCardValue}>{lessonStats.completed}</span>
                    <span className={styles.statCardLabel}>Xong</span>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.streak}`}>
                  <div className={styles.statCardIcon}>🔥</div>
                  <div className={styles.statCardContent}>
                    <span className={styles.statCardValue}>{lessonStats.inProgress}</span>
                    <span className={styles.statCardLabel}>Đang học</span>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className={styles.contentGrid}>
            {/* Progress Section */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <span>📊</span>
                  Tiến độ học tập
                </h2>
                <Link href="/" className={styles.sectionAction}>
                  Xem thêm bài học
                  <span>→</span>
                </Link>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.progressOverview}>
                  {lessonStats.withProgress === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyStateIcon}>🚀</span>
                      <h3 className={styles.emptyStateTitle}>Bắt đầu hành trình học tập!</h3>
                      <p className={styles.emptyStateText}>
                        Khám phá các bài học và nâng cao kỹ năng tiếng Đức của bạn ngay hôm nay.
                      </p>
                      <Link href="/" className={styles.startLearningBtn}>
                        <span>📚</span>
                        Khám phá bài học
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Progress Summary */}
                      <div className={styles.progressSummary}>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryValue}>{lessonStats.total}</span>
                          <span className={styles.summaryLabel}>Tổng bài</span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryValue}>{lessonStats.progressPercent}%</span>
                          <span className={styles.summaryLabel}>Tổng tiến độ</span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryValue}>{lessonStats.completed}</span>
                          <span className={styles.summaryLabel}>Hoàn thành</span>
                        </div>
                      </div>

                      {/* Progress List */}
                      <div className={styles.progressList}>
                        {lessonStats.sortedLessons.slice(0, 6).map((lesson) => {
                          const progressPercent = calculateProgress(lesson.id);
                          return (
                            <div
                              key={lesson.id}
                              className={styles.progressItem}
                              onClick={() => navigateWithLocale(router, `/${lesson.id}`)}
                            >
                              <div className={styles.progressItemIcon}>
                                {progressPercent === 100 ? '✅' : '📖'}
                              </div>
                              <div className={styles.progressItemContent}>
                                <h4 className={styles.progressItemTitle}>
                                  {lesson.displayTitle || lesson.title}
                                </h4>
                                <div className={styles.progressItemBar}>
                                  <div
                                    className={styles.progressItemBarFill}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              </div>
                              {progressPercent === 100 ? (
                                <span className={styles.progressItemBadge}>
                                  ✓ Xong
                                </span>
                              ) : (
                                <span className={styles.progressItemPercent}>
                                  {Math.round(progressPercent)}%
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className={styles.rightSidebar}>
              {/* Quick Actions */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <span>⚡</span>
                    Hành động nhanh
                  </h2>
                </div>
                <div className={styles.quickActions}>
                  <Link href="/" className={styles.quickActionBtn}>
                    <div className={`${styles.quickActionIcon} ${styles.shadowing}`}>🎙️</div>
                    <div className={styles.quickActionContent}>
                      <span className={styles.quickActionLabel}>Shadowing</span>
                      <span className={styles.quickActionDesc}>Luyện phát âm theo video</span>
                    </div>
                    <span className={styles.quickActionArrow}>→</span>
                  </Link>
                  <Link href="/" className={styles.quickActionBtn}>
                    <div className={`${styles.quickActionIcon} ${styles.dictation}`}>✍️</div>
                    <div className={styles.quickActionContent}>
                      <span className={styles.quickActionLabel}>Dictation</span>
                      <span className={styles.quickActionDesc}>Nghe và chép lại</span>
                    </div>
                    <span className={styles.quickActionArrow}>→</span>
                  </Link>
                  <Link href="/profile/vocabulary" className={styles.quickActionBtn}>
                    <div className={`${styles.quickActionIcon} ${styles.vocabulary}`}>📝</div>
                    <div className={styles.quickActionContent}>
                      <span className={styles.quickActionLabel}>Từ vựng</span>
                      <span className={styles.quickActionDesc}>Ôn tập từ đã lưu</span>
                    </div>
                    <span className={styles.quickActionArrow}>→</span>
                  </Link>
                </div>
              </div>

              {/* Recent Activity */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <span>📜</span>
                    Hoạt động gần đây
                  </h2>
                </div>
                <div className={styles.activityList}>
                  {recentActivity.length === 0 ? (
                    <div className={styles.noActivity}>
                      <span className={styles.noActivityIcon}>💤</span>
                      <p>Chưa có hoạt động nào</p>
                    </div>
                  ) : (
                    recentActivity.slice(0, 4).map((activity, index) => {
                      const lesson = allLessons.find(l => l.id === activity.lessonId);
                      // Calculate points from actual progress
                      const progressData = activity.progress || {};
                      // Use correctWords if available, otherwise count completedSentences
                      let earnedPoints = progressData.correctWords || 0;
                      if (earnedPoints === 0 && progressData.completedSentences) {
                        // Count completed sentences as fallback
                        earnedPoints = Object.keys(progressData.completedSentences).length;
                      }
                      if (earnedPoints === 0 && activity.completionPercent > 0) {
                        // Use completion percent as last resort
                        earnedPoints = activity.completionPercent;
                      }
                      return (
                        <div key={index} className={styles.activityItem}>
                          <div className={styles.activityIcon}>
                            {activity.mode === 'shadowing' ? '🎙️' : '✍️'}
                          </div>
                          <div className={styles.activityContent}>
                            <p className={styles.activityText}>
                              {activity.mode === 'shadowing' ? 'Shadowing' : 'Dictation'}
                              {lesson ? `: ${lesson.displayTitle || lesson.title}` : ''}
                            </p>
                            <span className={styles.activityTime}>
                              {formatDate(activity.updatedAt || activity.createdAt)}
                            </span>
                          </div>
                          <div className={styles.activityPoints}>
                            +{earnedPoints}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
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
