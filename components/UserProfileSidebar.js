import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/UserProfileSidebar.module.css';

// Helper: Format time spent (minutes to hours)
const formatTimeSpent = (minutes) => {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

// Helper: Format member since date to relative format
const formatMemberSince = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffDays < 7) return 'Mới tham gia';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  if (diffMonths < 12) return `${diffMonths} tháng trước`;
  return `${diffYears} năm trước`;
};

// Helper: Get league emoji
const getLeagueEmoji = (league) => {
  const leagues = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '👑'
  };
  return leagues[league] || '🥉';
};

// Helper: Get league label in Vietnamese
const getLeagueLabel = (league) => {
  const labels = {
    bronze: 'Đồng',
    silver: 'Bạc',
    gold: 'Vàng',
    platinum: 'Kim Cương',
    diamond: 'Huyền Thoại'
  };
  return labels[league] || 'Đồng';
};

export default function UserProfileSidebar({ stats, userPoints = 0 }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <aside className={styles.profileSidebar}>
      {/* User Identity */}
      <div className={styles.userIdentity}>
        <div className={styles.userAvatar}>
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <h2 className={styles.userName}>
          {user?.name || 'User'}
          <span className={styles.badge}>✓</span>
        </h2>
        <div className={styles.privacyToggle}>
          <span className={styles.privacyIcon}>🔒</span>
          <span className={styles.privacyLabel}>{t('userProfile.privacyLabel')}</span>
          <span className={styles.privacyStatus}>{t('userProfile.privacyStatus')}</span>
        </div>
      </div>

      {/* League Badge */}
      <div className={`${styles.leagueBadge} ${styles[user?.currentLeague || 'bronze']}`}>
        <span className={styles.leagueIcon}>
          {getLeagueEmoji(user?.currentLeague)}
        </span>
        <div className={styles.leagueContent}>
          <span className={styles.leagueLabel}>Hạng hiện tại</span>
          <span className={styles.leagueName}>
            {getLeagueLabel(user?.currentLeague)}
          </span>
        </div>
      </div>

      {/* Streaks Section */}
      <div className={styles.streakSection}>
        <h3 className={styles.streakSectionTitle}>Chuỗi hoạt động</h3>
        <div className={styles.streakGrid}>
          {/* Daily Streak */}
          <div className={`${styles.streakCard} ${styles.fire}`}>
            <span className={styles.streakCardIcon}>🔥</span>
            <div className={styles.streakCardContent}>
              <span className={styles.streakCardLabel}>Ngày liên tiếp</span>
              <div className={styles.streakCardValues}>
                <span className={styles.streakCardCurrent}>
                  {user?.streak?.currentStreak || 0}
                </span>
                <span className={styles.streakCardMax}>
                  / {user?.streak?.maxStreak || 0} max
                </span>
              </div>
            </div>
          </div>
          {/* Answer Streak */}
          <div className={`${styles.streakCard} ${styles.lightning}`}>
            <span className={styles.streakCardIcon}>⚡</span>
            <div className={styles.streakCardContent}>
              <span className={styles.streakCardLabel}>Trả lời đúng</span>
              <div className={styles.streakCardValues}>
                <span className={styles.streakCardCurrent}>
                  {user?.answerStreak?.current || 0}
                </span>
                <span className={styles.streakCardMax}>
                  / {user?.answerStreak?.max || 0} max
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGridSection}>
        <h3 className={styles.statsGridTitle}>Thống kê học tập</h3>
        <div className={styles.statsGrid}>
          {/* Time Spent */}
          <div className={`${styles.statItem} ${styles.time}`}>
            <span className={styles.statItemIcon}>⏱️</span>
            <div className={styles.statItemContent}>
              <span className={styles.statItemLabel}>Thời gian học</span>
              <span className={styles.statItemValue}>
                {formatTimeSpent(user?.totalTimeSpent)}
              </span>
            </div>
          </div>
          {/* Level */}
          <div className={`${styles.statItem} ${styles.level}`}>
            <span className={styles.statItemIcon}>📊</span>
            <div className={styles.statItemContent}>
              <span className={styles.statItemLabel}>Trình độ</span>
              <span className={styles.statItemValue}>
                {(user?.preferredDifficultyLevel || 'B1').toUpperCase()}
              </span>
            </div>
          </div>
          {/* Lessons Completed */}
          <div className={`${styles.statItem} ${styles.lessons}`}>
            <span className={styles.statItemIcon}>✅</span>
            <div className={styles.statItemContent}>
              <span className={styles.statItemLabel}>Bài hoàn thành</span>
              <span className={styles.statItemValue}>
                {user?.lessonsCompleted || 0}
              </span>
            </div>
          </div>
          {/* Weekly Points */}
          <div className={`${styles.statItem} ${styles.weekly}`}>
            <span className={styles.statItemIcon}>📈</span>
            <div className={styles.statItemContent}>
              <span className={styles.statItemLabel}>Điểm tuần</span>
              <span className={styles.statItemValue}>
                {user?.weeklyPoints || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className={styles.accountInfo}>
        <h3 className={styles.accountInfoTitle}>Thông tin tài khoản</h3>
        <div className={styles.accountInfoList}>
          {/* Email */}
          <div className={styles.accountInfoRow}>
            <span className={styles.accountInfoIcon}>✉️</span>
            <div className={styles.accountInfoContent}>
              <span className={styles.accountInfoLabel}>Email</span>
              <span className={styles.accountInfoValue}>
                {user?.email || 'N/A'}
              </span>
            </div>
          </div>
          {/* Member Since */}
          <div className={styles.accountInfoRow}>
            <span className={styles.accountInfoIcon}>📅</span>
            <div className={styles.accountInfoContent}>
              <span className={styles.accountInfoLabel}>Tham gia</span>
              <span className={styles.accountInfoValue}>
                {formatMemberSince(user?.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div className={styles.userStats}>
        <div className={styles.streakInfo}>
          <div className={styles.streakItem}>
            <span className={styles.streakIcon}>€</span>
            <span className={styles.streakValue}>{userPoints}</span>
          </div>
        </div>

        {/* Total Lessons */}
        <div className={styles.totalLessons}>
          <span className={styles.lessonsIcon}>🎓</span>
          <div className={styles.lessonsContent}>
            <span className={styles.lessonsLabel}>{t('userProfile.totalLessons')}</span>
            <span className={styles.lessonsValue}>{stats?.totalLessons || 0}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
