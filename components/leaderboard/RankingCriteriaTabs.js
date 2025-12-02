import { useTranslation } from 'react-i18next';
import styles from '../../styles/leaderboard.module.css';

const CRITERIA_OPTIONS = [
  { key: 'points', icon: '💎' },
  { key: 'streak', icon: '🔥' },
  { key: 'time', icon: '⏱️' },
  { key: 'lessons', icon: '📚' },
  { key: 'improved', icon: '📈' }
];

export default function RankingCriteriaTabs({ activeCriteria, onCriteriaChange }) {
  const { t } = useTranslation();

  return (
    <div className={styles.criteriaTabs}>
      {CRITERIA_OPTIONS.map(({ key, icon }) => (
        <button
          key={key}
          className={`${styles.criteriaTab} ${activeCriteria === key ? styles.activeCriteriaTab : ''}`}
          onClick={() => onCriteriaChange(key)}
          title={t(`leaderboard.criteria.${key}`)}
        >
          <span className={styles.criteriaIcon}>{icon}</span>
          <span className={styles.criteriaLabel}>
            {t(`leaderboard.criteria.${key}`)}
          </span>
        </button>
      ))}
    </div>
  );
}
