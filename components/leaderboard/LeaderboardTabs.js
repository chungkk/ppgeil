import { useTranslation } from 'react-i18next';
import styles from '../../styles/leaderboard.module.css';

const TIME_TABS = [
  { 
    key: 'weekly', 
    labelKey: 'leaderboard.weekly',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
      </svg>
    )
  },
  { 
    key: 'monthly', 
    labelKey: 'leaderboard.monthly',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
      </svg>
    )
  },
  { 
    key: 'alltime', 
    labelKey: 'leaderboard.allTime',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
      </svg>
    )
  }
];

export default function LeaderboardTabs({ activeTab, onTabChange }) {
  const { t } = useTranslation();

  return (
    <div className={styles.leaderboardTabs}>
      {TIME_TABS.map(({ key, labelKey, icon }) => (
        <button
          key={key}
          className={`${styles.leaderboardTab} ${activeTab === key ? styles.activeLeaderboardTab : ''}`}
          onClick={() => onTabChange(key)}
        >
          <span className={styles.leaderboardTabIcon}>{icon}</span>
          <span className={styles.leaderboardTabLabel}>{t(labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
