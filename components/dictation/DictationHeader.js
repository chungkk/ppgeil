import React from 'react';
import { useTranslation } from 'react-i18next';
import layoutStyles from '../../styles/dictationPage.module.css';
import inputStyles from '../../styles/dictation/dictationInput.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...inputStyles };

/**
 * Dictation Header Component (Simplified - Full Sentence Mode Only)
 * Displays title and sentence counter with progress
 */
const DictationHeader = ({
  isMobile,
  currentSentenceIndex,
  totalSentences,
  completedCount = 0,
  playbackSpeed,
  onSpeedChange,
  showTranslation,
  onToggleTranslation
}) => {
  const { t } = useTranslation();

  const handleSpeedClick = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed || 1);
    const nextIndex = (currentIndex + 1) % speeds.length;
    onSpeedChange(speeds[nextIndex]);
  };

  // Calculate progress percentage
  const progressPercent = totalSentences > 0 ? Math.round((completedCount / totalSentences) * 100) : 0;

  if (isMobile) {
    return (
      <div className={styles.dictationHeaderMobile}>
        {/* Center: Sentence counter */}
        <div className={styles.headerCenter}>
          <span className={styles.sentenceNumber}>#{currentSentenceIndex + 1}</span>
          <span className={styles.sentenceDivider}>/</span>
          <span className={styles.sentenceTotal}>{totalSentences}</span>
        </div>

        {/* Right: Controls */}
        <div className={styles.headerRightMobile}>
          {/* Speed button */}
          {onSpeedChange && (
            <button 
              className={styles.speedButtonMobile}
              onClick={handleSpeedClick}
              title="Playback speed"
            >
              {playbackSpeed || 1}x
            </button>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={styles.dictationHeader}>
      <h3 className={styles.dictationHeaderTitle}>
        {t('lesson.ui.dictation')}
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Translation Toggle - Desktop Only */}
        {onToggleTranslation && (
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showTranslation}
              onChange={onToggleTranslation}
              className={styles.toggleInput}
            />
            <span className={styles.toggleSlider}></span>
            <span className={styles.toggleText}>Dịch</span>
          </label>
        )}
      </div>
    </div>
  );
};

export default DictationHeader;
