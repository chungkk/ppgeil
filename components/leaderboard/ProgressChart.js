import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import styles from '../../styles/leaderboard.module.css';

const fetcher = async (url) => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message);
};

const CRITERIA_OPTIONS = [
  { key: 'points', icon: '💎', color: '#a78bfa' },
  { key: 'streak', icon: '🔥', color: '#f97316' },
  { key: 'time', icon: '⏱️', color: '#3b82f6' },
  { key: 'lessons', icon: '📚', color: '#22c55e' }
];

export default function ProgressChart() {
  const { t } = useTranslation();
  const [selectedCriteria, setSelectedCriteria] = useState('points');
  const [days, setDays] = useState(7);

  const { data, isLoading, error } = useSWR(
    `/api/leaderboard/rank-history?days=${days}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className={`${styles.progressChartCard} ${styles.skeleton}`}>
        <div className={styles.chartSkeletonHeader}></div>
        <div className={styles.chartSkeletonBody}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.progressChartCard}>
        <div className={styles.chartError}>
          {t('leaderboard.progress.noData')}
        </div>
      </div>
    );
  }

  const history = data?.history || [];
  const trend = data?.trend || {};
  const criteriaInfo = CRITERIA_OPTIONS.find(c => c.key === selectedCriteria) || CRITERIA_OPTIONS[0];

  // Get rank data for selected criteria
  const getRankKey = (criteria) => `${criteria}Rank`;
  const rankKey = getRankKey(selectedCriteria);
  
  const chartData = history.map(h => ({
    date: h.date,
    rank: h[rankKey],
    label: new Date(h.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  })).filter(d => d.rank !== null);

  // Calculate chart dimensions
  const minRank = chartData.length > 0 ? Math.min(...chartData.map(d => d.rank)) : 1;
  const maxRank = chartData.length > 0 ? Math.max(...chartData.map(d => d.rank)) : 100;
  const rankRange = maxRank - minRank || 1;

  // Generate SVG path for line chart (inverted because lower rank is better)
  const generatePath = () => {
    if (chartData.length < 2) return '';
    
    const width = 100;
    const height = 60;
    const padding = 5;
    
    const points = chartData.map((d, i) => {
      const x = padding + (i / (chartData.length - 1)) * (width - 2 * padding);
      const y = padding + ((d.rank - minRank) / rankRange) * (height - 2 * padding);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const currentTrend = trend[selectedCriteria] || { change: 0, direction: 'stable' };

  return (
    <div className={styles.progressChartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>
          📊 {t('leaderboard.progress.title')}
        </h3>
        <div className={styles.chartPeriodSelector}>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              className={`${styles.periodBtn} ${days === d ? styles.activePeriodBtn : ''}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Criteria Selector */}
      <div className={styles.chartCriteriaSelector}>
        {CRITERIA_OPTIONS.map(({ key, icon, color }) => (
          <button
            key={key}
            className={`${styles.chartCriteriaBtn} ${selectedCriteria === key ? styles.activeChartCriteria : ''}`}
            style={selectedCriteria === key ? { borderColor: color, color } : {}}
            onClick={() => setSelectedCriteria(key)}
          >
            <span>{icon}</span>
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <div className={styles.chartArea}>
        {isLoading ? (
          <div className={styles.chartLoading}>
            <div className={styles.loadingSpinner}></div>
          </div>
        ) : chartData.length < 2 ? (
          <div className={styles.chartNoData}>
            <p>{t('leaderboard.progress.noData')}</p>
            <span>{t('leaderboard.progress.collectMore')}</span>
          </div>
        ) : (
          <>
            {/* SVG Chart */}
            <svg viewBox="0 0 100 60" className={styles.chartSvg} preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="5" y1="15" x2="95" y2="15" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              <line x1="5" y1="30" x2="95" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              <line x1="5" y1="45" x2="95" y2="45" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              
              {/* Gradient fill under line */}
              <defs>
                <linearGradient id={`gradient-${selectedCriteria}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={criteriaInfo.color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={criteriaInfo.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Area fill */}
              {chartData.length >= 2 && (
                <path
                  d={`${generatePath()} L 95,55 L 5,55 Z`}
                  fill={`url(#gradient-${selectedCriteria})`}
                />
              )}
              
              {/* Line */}
              <path
                d={generatePath()}
                fill="none"
                stroke={criteriaInfo.color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {chartData.map((d, i) => {
                const x = 5 + (i / (chartData.length - 1)) * 90;
                const y = 5 + ((d.rank - minRank) / rankRange) * 50;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="1.5"
                    fill={criteriaInfo.color}
                  />
                );
              })}
            </svg>

            {/* X-axis labels */}
            <div className={styles.chartXAxis}>
              {chartData.length > 0 && (
                <>
                  <span>{chartData[0]?.label}</span>
                  <span>{chartData[chartData.length - 1]?.label}</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Trend Summary */}
      {chartData.length >= 2 && (
        <div className={styles.trendSummary}>
          <div className={styles.trendItem}>
            <span className={styles.trendIcon}>
              {criteriaInfo.icon}
            </span>
            <span className={styles.trendLabel}>
              {t(`leaderboard.criteria.${selectedCriteria}`)}
            </span>
            <span className={`${styles.trendValue} ${styles[`trend${currentTrend.direction}`]}`}>
              {currentTrend.direction === 'up' && '↑'}
              {currentTrend.direction === 'down' && '↓'}
              {currentTrend.direction === 'stable' && '→'}
              {currentTrend.change > 0 && ` ${currentTrend.change}`}
            </span>
          </div>
          <div className={styles.trendRange}>
            #{minRank} - #{maxRank}
          </div>
        </div>
      )}
    </div>
  );
}
