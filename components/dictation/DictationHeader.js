import React from 'react';
import { useTranslation } from 'react-i18next';
import layoutStyles from '../../styles/dictationPage.module.css';
import inputStyles from '../../styles/dictation/dictationInput.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...inputStyles };

/**
 * Dictation Header Component
 * Displays title, difficulty selector, and sentence counter
 * 
 * CSS: Uses dictationInput.module.css for header-related styles
 */
const DictationHeader = ({
  isMobile,
  currentSentenceIndex,
  totalSentences,
  difficultyLevel,
  onDifficultyChange,
  playbackSpeed,
  onSpeedChange
}) => {
  const { t } = useTranslation();

  const handleSpeedClick = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed || 1);
    const nextIndex = (currentIndex + 1) % speeds.length;
    onSpeedChange(speeds[nextIndex]);
  };

  return (
    <div className={styles.dictationHeader}>
      <h3 className={styles.dictationHeaderTitle}>
        {isMobile 
          ? <span className={styles.sentenceNumber}>#{currentSentenceIndex + 1}</span>
          : t('lesson.ui.dictation')}
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Speed Button - Mobile Only */}
        {isMobile && onSpeedChange && (
          <button 
            className={styles.speedButtonMobile}
            onClick={handleSpeedClick}
            title="Playback speed"
          >
            {playbackSpeed || 1}x
          </button>
        )}
        {/* Hide Level Selector */}
        <div className={styles.hideLevelSelector}>
          <select
            value={difficultyLevel}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className={styles.hideLevelDropdown}
            title={t('lesson.ui.difficultySelector')}
          >
            <option value="a1">A1 (10%)</option>
            <option value="a2">A2 (30%)</option>
            <option value="b1">B1 (30%)</option>
            <option value="b2">B2 (60%)</option>
            <option value="c1c2">C1+C2 (100%)</option>
          </select>
        </div>
      </div>
      {!isMobile && (
        <div className={styles.sentenceCounter}>
          #{currentSentenceIndex + 1} / {totalSentences}
        </div>
      )}
    </div>
  );
};

export default DictationHeader;
