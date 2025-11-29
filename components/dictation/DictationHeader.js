import React from 'react';
import { useTranslation } from 'react-i18next';
import layoutStyles from '../../styles/dictationPage.module.css';
import inputStyles from '../../styles/dictation/dictationInput.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...inputStyles };

/**
 * Dictation Header Component (Simplified - Full Sentence Mode Only)
 * Displays title and sentence counter
 */
const DictationHeader = ({
  isMobile,
  currentSentenceIndex,
  totalSentences,
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
        {/* Translation Toggle - Desktop Only */}
        {!isMobile && onToggleTranslation && (
          <button
            className={`${styles.translationToggleBtn} ${showTranslation ? styles.translationToggleBtnActive : ''}`}
            onClick={onToggleTranslation}
            title={showTranslation ? 'Ẩn dịch' : 'Hiện dịch'}
          >
            <span className={styles.translationToggleLabel}>Dịch</span>
            <div className={styles.translationToggleSwitch}>
              <div className={styles.translationToggleSlider} />
            </div>
          </button>
        )}
        {/* Sentence Counter */}
        <div className={styles.sentenceCounter}>
          #{currentSentenceIndex + 1} / {totalSentences}
        </div>
      </div>
    </div>
  );
};

export default DictationHeader;
