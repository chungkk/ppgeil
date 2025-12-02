import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../styles/leaderboard.module.css';

const BADGE_COLORS = {
  top_monthly: {
    bg: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%)',
    border: 'rgba(255, 215, 0, 0.5)',
    text: '#fbbf24'
  },
  top_alltime: {
    bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
    border: 'rgba(168, 85, 247, 0.5)',
    text: '#a78bfa'
  }
};

export default function BadgeDisplay({ badges = [], size = 'small', showTooltip = true }) {
  const { t } = useTranslation();
  const [activeTooltip, setActiveTooltip] = useState(null);

  if (!badges || badges.length === 0) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getMonthName = (month) => {
    if (!month) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  };

  return (
    <div className={`${styles.badgeContainer} ${styles[`badgeSize${size}`]}`}>
      {badges.slice(0, 3).map((badge, index) => {
        const colors = BADGE_COLORS[badge.type] || BADGE_COLORS.top_monthly;
        const isActive = activeTooltip === index;

        return (
          <div
            key={`${badge.type}-${badge.year}-${badge.month}-${index}`}
            className={styles.badgeWrapper}
            onMouseEnter={() => showTooltip && setActiveTooltip(index)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <div
              className={`${styles.badge} ${badge.isCurrent ? styles.badgeCurrent : ''}`}
              style={{
                background: colors.bg,
                borderColor: colors.border
              }}
            >
              <span className={styles.badgeIcon}>{badge.icon}</span>
              {size !== 'small' && badge.rank && (
                <span className={styles.badgeRank} style={{ color: colors.text }}>
                  #{badge.rank}
                </span>
              )}
            </div>

            {/* Tooltip */}
            {showTooltip && isActive && (
              <div className={styles.badgeTooltip}>
                <div className={styles.tooltipHeader}>
                  <span className={styles.tooltipIcon}>{badge.icon}</span>
                  <span className={styles.tooltipName}>{badge.name}</span>
                </div>
                <p className={styles.tooltipDesc}>{badge.description}</p>
                <div className={styles.tooltipMeta}>
                  {badge.rank && (
                    <span>Rank #{badge.rank}</span>
                  )}
                  {badge.month && badge.year && (
                    <span>{getMonthName(badge.month)} {badge.year}</span>
                  )}
                  {badge.isCurrent && (
                    <span className={styles.tooltipCurrent}>
                      {t('leaderboard.badges.current')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Show +N if more badges */}
      {badges.length > 3 && (
        <div className={styles.badgeMore}>
          +{badges.length - 3}
        </div>
      )}
    </div>
  );
}

// Simplified inline badge for lists
export function BadgeInline({ badges = [] }) {
  if (!badges || badges.length === 0) return null;

  return (
    <span className={styles.badgeInline}>
      {badges.slice(0, 2).map((badge, i) => (
        <span key={i} className={styles.badgeInlineIcon} title={badge.name}>
          {badge.icon || (badge.type === 'top_monthly' ? '🏆' : '👑')}
        </span>
      ))}
    </span>
  );
}
