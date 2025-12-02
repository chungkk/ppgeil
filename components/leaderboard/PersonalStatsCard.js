import { useTranslation } from 'react-i18next';
import styles from '../../styles/leaderboard.module.css';
import { LEAGUES } from '../../lib/constants/leagues';
import BadgeDisplay from './BadgeDisplay';

export default function PersonalStatsCard({ data, isLoading }) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className={`${styles.personalStatsCard} ${styles.skeleton}`}>
        <div className={styles.skeletonAvatarLarge}></div>
        <div className={styles.skeletonNameLarge}></div>
        <div className={styles.skeletonPointsLarge}></div>
      </div>
    );
  }

  if (!data) return null;

  const { user, ranks, league, badges, surrounding } = data;
  const leagueInfo = LEAGUES[league?.current] || LEAGUES.bronze;

  // New user empty state
  if (!user || (user.points === 0 && user.streak === 0)) {
    return (
      <div className={styles.personalStatsCard}>
        <div className={styles.newUserWelcome}>
          <div className={styles.welcomeIcon}>🌟</div>
          <h3 className={styles.welcomeTitle}>{t('leaderboard.stats.welcomeTitle')}</h3>
          <p className={styles.welcomeText}>{t('leaderboard.stats.welcomeText')}</p>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    if (!seconds) return '0h';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getPercentile = (rank, total) => {
    if (!total || !rank) return 0;
    return Math.round(((total - rank + 1) / total) * 100);
  };

  return (
    <div className={styles.personalStatsCard}>
      {/* Header with Avatar and Name */}
      <div className={styles.personalHeader}>
        <div className={styles.personalAvatar} style={{ borderColor: leagueInfo.color }}>
          {user.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className={styles.personalInfo}>
          <h2 className={styles.personalName}>{user.name}</h2>
          <div className={styles.personalLeague} style={{ color: leagueInfo.color }}>
            {leagueInfo.icon} {leagueInfo.name}
            {league?.rankInLeague && (
              <span className={styles.leagueRank}>
                #{league.rankInLeague}/{league.totalInLeague}
              </span>
            )}
          </div>
          {/* Promotion/Demotion Status */}
          {league?.willPromote && (
            <div className={styles.promotionBadge}>
              🚀 {t('leaderboard.leagues.promotion')}
            </div>
          )}
          {league?.willDemote && (
            <div className={styles.demotionBadge}>
              ⚠️ {t('leaderboard.leagues.demotion')}
            </div>
          )}
        </div>
      </div>

      {/* Multi-criteria Ranks */}
      <div className={styles.ranksGrid}>
        <div className={styles.rankItem}>
          <span className={styles.rankIcon}>💎</span>
          <div className={styles.rankDetails}>
            <span className={styles.rankLabel}>{t('leaderboard.criteria.points')}</span>
            <span className={styles.rankValue}>#{ranks?.points?.rank || '-'}</span>
            <span className={styles.rankPercentile}>
              Top {getPercentile(ranks?.points?.rank, ranks?.points?.total)}%
            </span>
          </div>
        </div>
        <div className={styles.rankItem}>
          <span className={styles.rankIcon}>🔥</span>
          <div className={styles.rankDetails}>
            <span className={styles.rankLabel}>{t('leaderboard.criteria.streak')}</span>
            <span className={styles.rankValue}>#{ranks?.streak?.rank || '-'}</span>
            <span className={styles.rankPercentile}>
              Top {getPercentile(ranks?.streak?.rank, ranks?.streak?.total)}%
            </span>
          </div>
        </div>
        <div className={styles.rankItem}>
          <span className={styles.rankIcon}>⏱️</span>
          <div className={styles.rankDetails}>
            <span className={styles.rankLabel}>{t('leaderboard.criteria.time')}</span>
            <span className={styles.rankValue}>#{ranks?.time?.rank || '-'}</span>
            <span className={styles.rankPercentile}>
              Top {getPercentile(ranks?.time?.rank, ranks?.time?.total)}%
            </span>
          </div>
        </div>
        <div className={styles.rankItem}>
          <span className={styles.rankIcon}>📚</span>
          <div className={styles.rankDetails}>
            <span className={styles.rankLabel}>{t('leaderboard.criteria.lessons')}</span>
            <span className={styles.rankValue}>#{ranks?.lessons?.rank || '-'}</span>
            <span className={styles.rankPercentile}>
              Top {getPercentile(ranks?.lessons?.rank, ranks?.lessons?.total)}%
            </span>
          </div>
        </div>
        <div className={styles.rankItem}>
          <span className={styles.rankIcon}>📈</span>
          <div className={styles.rankDetails}>
            <span className={styles.rankLabel}>{t('leaderboard.criteria.improved')}</span>
            <span className={styles.rankValue}>#{ranks?.improved?.rank || '-'}</span>
            <span className={styles.rankPercentile}>
              Top {getPercentile(ranks?.improved?.rank, ranks?.improved?.total)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className={styles.statsSummary}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{user.points?.toLocaleString() || 0}</span>
          <span className={styles.statLabel}>{t('leaderboard.stats.totalPoints')}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{user.streak || 0}</span>
          <span className={styles.statLabel}>{t('leaderboard.stats.currentStreak')}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{formatTime(user.timeSpent)}</span>
          <span className={styles.statLabel}>{t('leaderboard.stats.timeSpent')}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{user.lessonsCompleted || 0}</span>
          <span className={styles.statLabel}>{t('leaderboard.stats.lessonsCompleted')}</span>
        </div>
      </div>

      {/* Surrounding Users */}
      {(surrounding?.above?.length > 0 || surrounding?.below?.length > 0) && (
        <div className={styles.surroundingSection}>
          <div className={styles.surroundingTitle}>{t('leaderboard.stats.nearbyRanks')}</div>
          
          {/* Users Above */}
          {surrounding?.above?.map((u, i) => (
            <div key={`above-${i}`} className={styles.surroundingUser}>
              <span className={styles.surroundingRank}>#{u.rank}</span>
              <span className={styles.surroundingName}>{u.name}</span>
              <span className={styles.surroundingPoints}>
                💎 {u.points?.toLocaleString()}
              </span>
            </div>
          ))}

          {/* Current User */}
          <div className={`${styles.surroundingUser} ${styles.currentSurrounding}`}>
            <span className={styles.surroundingRank}>#{ranks?.points?.rank}</span>
            <span className={styles.surroundingName}>{user.name} (You)</span>
            <span className={styles.surroundingPoints}>
              💎 {user.points?.toLocaleString()}
            </span>
          </div>

          {/* Users Below */}
          {surrounding?.below?.map((u, i) => (
            <div key={`below-${i}`} className={styles.surroundingUser}>
              <span className={styles.surroundingRank}>#{u.rank}</span>
              <span className={styles.surroundingName}>{u.name}</span>
              <span className={styles.surroundingPoints}>
                💎 {u.points?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Badges */}
      {badges?.length > 0 && (
        <div className={styles.badgesSection}>
          <div className={styles.badgesTitle}>{t('leaderboard.badges.title')}</div>
          <BadgeDisplay 
            badges={badges.map(b => ({
              ...b,
              icon: b.type === 'top_monthly' ? '🏆' : '👑',
              name: b.type === 'top_monthly' 
                ? t('leaderboard.badges.topMonthly') 
                : t('leaderboard.badges.topAlltime'),
              description: b.type === 'top_monthly'
                ? t('leaderboard.badges.topMonthlyDesc')
                : t('leaderboard.badges.topAlltimeDesc')
            }))}
            size="medium"
            showTooltip={true}
          />
        </div>
      )}
    </div>
  );
}
