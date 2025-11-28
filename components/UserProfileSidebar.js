import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/UserProfileSidebar.module.css';

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
