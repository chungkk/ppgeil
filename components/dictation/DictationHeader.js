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
  onToggleTranslation,
  isShadowingMode = false,
  onToggleShadowingMode
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
        {/* Left: Shadowing/Dictation toggle */}
        {onToggleShadowingMode && (
          <button 
            className={`${styles.modeToggleMobile} ${isShadowingMode ? styles.modeToggleMobileActive : ''}`}
            onClick={onToggleShadowingMode}
            title={isShadowingMode ? 'Switch to Dictation' : 'Switch to Shadowing'}
          >
            {isShadowingMode ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>Shadow</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <span>Diktat</span>
              </>
            )}
          </button>
        )}

        {/* Center: Sentence counter */}
        <div className={styles.headerCenter}>
          <span className={styles.sentenceNumber}>#{currentSentenceIndex + 1}</span>
          <span className={styles.sentenceDivider}>/</span>
          <span className={styles.sentenceTotal}>{totalSentences}</span>
        </div>

        {/* Right: Speed button */}
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
    );
  }

  // Desktop layout
  return (
    <div className={styles.dictationHeader}>
      <h3 className={styles.dictationHeaderTitle}>
        {isShadowingMode ? 'Shadowing' : t('lesson.ui.dictation')}
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
