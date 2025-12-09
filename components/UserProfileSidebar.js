import { useAuth } from '../context/AuthContext';
import styles from '../styles/UserProfileSidebar.module.css';

export default function UserProfileSidebar({ stats, userPoints = 0 }) {
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
        </h2>
      </div>

      {/* Points */}
      <div className={styles.pointsSection}>
        <span className={styles.pointsIcon}>💎</span>
        <span className={styles.pointsValue}>{userPoints}</span>
      </div>

      {/* Simple Stats */}
      <div className={styles.statsGridSection}>
        <div className={styles.statsGrid}>
          <div className={`${styles.statItem} ${styles.lessons}`}>
            <span className={styles.statItemIcon}>🎓</span>
            <div className={styles.statItemContent}>
              <span className={styles.statItemLabel}>Đã học</span>
              <span className={styles.statItemValue}>{stats?.totalLessons || 0}</span>
            </div>
          </div>
          <div className={`${styles.statItem} ${styles.lessons}`}>
            <span className={styles.statItemIcon}>✅</span>
            <div className={styles.statItemContent}>
              <span className={styles.statItemLabel}>Hoàn thành</span>
              <span className={styles.statItemValue}>{stats?.completedLessons || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
