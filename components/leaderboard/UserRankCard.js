import { useTranslation } from 'react-i18next';
import styles from '../../styles/leaderboard.module.css';
import { LEAGUES } from '../../lib/constants/leagues';
import { BadgeInline } from './BadgeDisplay';

export default function UserRankCard({ 
  userData, 
  criteria = 'points',
  animationDelay = 0,
  animate = true 
}) {
  const { t } = useTranslation();

  const leagueInfo = LEAGUES[userData.league] || LEAGUES.bronze;

  const getDisplayValue = () => {
    if (userData.valueLabel) {
      return userData.valueLabel;
    }
    switch (criteria) {
      case 'streak':
        return `${userData.streak || 0} ${t('leaderboard.days').toLowerCase()}`;
      case 'time':
        const hours = Math.floor((userData.timeSpent || 0) / 3600);
        const mins = Math.floor(((userData.timeSpent || 0) % 3600) / 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      case 'lessons':
        return `${userData.lessonsCompleted || 0}`;
      case 'improved':
        return `+${userData.weeklyPoints || 0}`;
      default:
        return `${userData.points || userData.value || 0}`;
    }
  };

  const getCriteriaIcon = () => {
    switch (criteria) {
      case 'streak': return '🔥';
      case 'time': return '⏱️';
      case 'lessons': return '📚';
      case 'improved': return '📈';
      default: return '💎';
    }
  };

  return (
    <div
      className={`${styles.userCard} ${userData.isCurrentUser ? styles.isCurrentUser : ''} ${animate ? styles.fadeInUp : ''}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className={styles.userCardLeft}>
        <div className={styles.userRank}>#{userData.rank}</div>
        <div className={styles.userAvatar}>
          {userData.name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userNameRow}>
            <h3 className={styles.userName}>
              {userData.name}
              {userData.badges && userData.badges.length > 0 && (
                <BadgeInline badges={userData.badges} />
              )}
            </h3>
            {userData.isCurrentUser && <span className={styles.youBadge}>You</span>}
          </div>
          <div className={styles.userLeague} style={{ color: leagueInfo.color }}>
            {leagueInfo.icon} {leagueInfo.name}
          </div>
        </div>
      </div>
      <div className={styles.userCardRight}>
        <span className={styles.pointIcon}>{getCriteriaIcon()}</span>
        <span className={styles.userPoints}>{getDisplayValue()}</span>
      </div>
    </div>
  );
}
