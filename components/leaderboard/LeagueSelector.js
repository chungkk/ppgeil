import { useTranslation } from 'react-i18next';
import styles from '../../styles/leaderboard.module.css';
import { LEAGUES } from '../../lib/constants/leagues';

const LEAGUE_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export default function LeagueSelector({ 
  activeLeague, 
  onLeagueChange, 
  userLeague,
  leagueStats = {}
}) {
  const { t } = useTranslation();

  return (
    <div className={styles.leagueSelector}>
      <div className={styles.leagueSelectorHeader}>
        <span className={styles.leagueSelectorTitle}>
          {t('leaderboard.leagues.title')}
        </span>
      </div>
      
      <div className={styles.leagueButtons}>
        {LEAGUE_ORDER.map((leagueKey) => {
          const league = LEAGUES[leagueKey];
          if (!league) return null;
          
          const isActive = activeLeague === leagueKey;
          const isUserLeague = userLeague === leagueKey;
          const stats = leagueStats[leagueKey];

          return (
            <button
              key={leagueKey}
              className={`${styles.leagueButton} ${isActive ? styles.activeLeagueButton : ''} ${isUserLeague ? styles.userLeagueButton : ''}`}
              style={{
                '--league-color': league.color,
                borderColor: isActive ? league.color : 'transparent'
              }}
              onClick={() => onLeagueChange(leagueKey)}
              title={`${league.name} (${(league.min || 0).toLocaleString()}+ pts)`}
            >
              <span className={styles.leagueButtonIcon}>{league.icon}</span>
              <span className={styles.leagueButtonName}>{league.name}</span>
              {isUserLeague && (
                <span className={styles.leagueYouBadge}>You</span>
              )}
              {stats?.totalUsers && (
                <span className={styles.leagueUserCount}>
                  {stats.totalUsers}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Compact league indicator for headers/cards
export function LeagueIndicator({ league, size = 'small', showName = true }) {
  const leagueInfo = LEAGUES[league] || LEAGUES.bronze;

  return (
    <span 
      className={`${styles.leagueIndicator} ${styles[`leagueSize${size}`]}`}
      style={{ color: leagueInfo.color }}
    >
      <span className={styles.leagueIndicatorIcon}>{leagueInfo.icon}</span>
      {showName && (
        <span className={styles.leagueIndicatorName}>{leagueInfo.name}</span>
      )}
    </span>
  );
}
