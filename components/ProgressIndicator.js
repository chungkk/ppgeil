import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/progressIndicator.module.css';

const ProgressIndicator = ({ 
  completedSentences = [],
  totalSentences = 0,
  completedWords = {},
  totalWords = 0,
  difficultyLevel = 'b1',
  hidePercentage = 30,
  studyTime = 0
}) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Sentence completion
    const sentenceCount = completedSentences.length;
    const sentencePercent = totalSentences > 0 ? Math.round((sentenceCount / totalSentences) * 100) : 0;

    // Word accuracy - count total correct words
    let correctWordsCount = 0;
    Object.keys(completedWords).forEach(sentenceIdx => {
      const sentenceWords = completedWords[sentenceIdx];
      correctWordsCount += Object.keys(sentenceWords).length;
    });
    const wordAccuracyPercent = totalWords > 0 ? Math.round((correctWordsCount / totalWords) * 100) : 0;

    // Overall progress (weighted average: 70% sentences, 30% words)
    // If all sentences completed, show 100%
    const overallPercent = sentencePercent === 100 
      ? 100 
      : Math.round(sentencePercent * 0.7 + wordAccuracyPercent * 0.3);

    // Study time formatted
    const hours = Math.floor(studyTime / 3600);
    const minutes = Math.floor((studyTime % 3600) / 60);
    const seconds = Math.floor(studyTime % 60);
    const timeFormatted = hours > 0 
      ? `${hours}h ${minutes}m`
      : minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;

    return {
      sentenceCount,
      sentencePercent,
      correctWordsCount,
      wordAccuracyPercent,
      overallPercent,
      timeFormatted
    };
  }, [completedSentences, totalSentences, completedWords, totalWords, studyTime]);

  // Difficulty color scheme
  const difficultyColors = {
    'a1': { primary: '#10b981', secondary: '#d1fae5', glow: 'rgba(16, 185, 129, 0.4)' }, // Green
    'a2': { primary: '#84cc16', secondary: '#ecfccb', glow: 'rgba(132, 204, 22, 0.4)' },  // Lime
    'b1': { primary: '#eab308', secondary: '#fef9c3', glow: 'rgba(234, 179, 8, 0.4)' },   // Yellow
    'b2': { primary: '#f97316', secondary: '#ffedd5', glow: 'rgba(249, 115, 22, 0.4)' },  // Orange
    'c1': { primary: '#ef4444', secondary: '#fee2e2', glow: 'rgba(239, 68, 68, 0.4)' },   // Red
    'c2': { primary: '#dc2626', secondary: '#fecaca', glow: 'rgba(220, 38, 38, 0.4)' }    // Dark Red
  };

  const colorScheme = difficultyColors[difficultyLevel] || difficultyColors['b1'];

  // SVG Circle calculations - Smaller size for compact display
  const size = 48;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (metrics.overallPercent / 100) * circumference;

  // Milestone detection (for glow effect)
  const isMilestone = metrics.overallPercent === 25 || metrics.overallPercent === 50 || 
                      metrics.overallPercent === 75 || metrics.overallPercent === 100;

  return (
    <div 
      className={styles.progressContainer}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Circular Progress */}
      <div 
        className={`${styles.circularProgress} ${isMilestone ? styles.milestone : ''}`}
        style={{
          '--progress-color': colorScheme.primary,
          '--progress-glow': colorScheme.glow
        }}
      >
        <svg width={size} height={size} className={styles.progressRing}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border-color)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorScheme.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={styles.progressCircle}
            style={{
              filter: isMilestone ? `drop-shadow(0 0 8px ${colorScheme.glow})` : 'none'
            }}
          />
        </svg>
        
        {/* Center text */}
        <div className={styles.progressText}>
          <span className={styles.progressPercent}>{metrics.overallPercent}</span>
          <span className={styles.progressSymbol}>%</span>
        </div>
      </div>

      {/* Compact Stats */}
      <div className={styles.compactStats}>
        <div className={styles.statBadge} style={{ borderColor: colorScheme.primary }}>
          <span className={styles.statIcon}>📝</span>
          <span className={styles.statValue}>{metrics.sentenceCount}/{totalSentences}</span>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipHeader}>
            <span className={styles.tooltipTitle}>{t('progressIndicator.title')}</span>
            <span 
              className={styles.tooltipBadge}
              style={{ 
                background: colorScheme.secondary,
                color: colorScheme.primary 
              }}
            >
              {difficultyLevel.toUpperCase()} ({hidePercentage}%)
            </span>
          </div>
          
          <div className={styles.tooltipContent}>
            {/* Sentences */}
            <div className={styles.tooltipRow}>
              <div className={styles.tooltipLabel}>
                <span className={styles.tooltipIcon}>📝</span>
                {t('progressIndicator.sentencesCompleted')}
              </div>
              <div className={styles.tooltipValue}>
                <span className={styles.tooltipNumber}>{metrics.sentenceCount}</span>
                <span className={styles.tooltipDivider}>/</span>
                <span className={styles.tooltipTotal}>{totalSentences}</span>
                <span className={styles.tooltipPercent}>({metrics.sentencePercent}%)</span>
              </div>
            </div>

            {/* Words */}
            <div className={styles.tooltipRow}>
              <div className={styles.tooltipLabel}>
                <span className={styles.tooltipIcon}>✏️</span>
                {t('progressIndicator.wordsAccuracy')}
              </div>
              <div className={styles.tooltipValue}>
                <span className={styles.tooltipNumber}>{metrics.correctWordsCount}</span>
                <span className={styles.tooltipDivider}>/</span>
                <span className={styles.tooltipTotal}>{totalWords}</span>
                <span className={styles.tooltipPercent}>({metrics.wordAccuracyPercent}%)</span>
              </div>
            </div>

            {/* Study Time */}
            <div className={styles.tooltipRow}>
              <div className={styles.tooltipLabel}>
                <span className={styles.tooltipIcon}>⏱️</span>
                {t('progressIndicator.timeSpent')}
              </div>
              <div className={styles.tooltipValue}>
                <span className={styles.tooltipNumber}>{metrics.timeFormatted}</span>
              </div>
            </div>

            {/* Difficulty Info */}
            <div className={styles.tooltipDividerLine} />
            <div className={styles.tooltipInfo}>
              <span className={styles.tooltipInfoIcon}>ℹ️</span>
              <span className={styles.tooltipInfoText}>
                {t('progressIndicator.levelInfo', { level: difficultyLevel.toUpperCase(), percent: hidePercentage })}
              </span>
            </div>
          </div>

          {/* Milestone celebration */}
          {isMilestone && (
            <div 
              className={styles.tooltipCelebration}
              style={{ background: colorScheme.secondary, color: colorScheme.primary }}
            >
              🎉 {t('progressIndicator.milestone', { percent: metrics.overallPercent })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
