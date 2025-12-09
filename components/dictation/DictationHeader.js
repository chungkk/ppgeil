import React from 'react';
import { useTranslation } from 'react-i18next';
import layoutStyles from '../../styles/dictationPage.module.css';
import inputStyles from '../../styles/dictation/dictationInput.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...inputStyles };

/**
 * Dictation Header Component (Simplified - Full Sentence Mode Only)
 * Displays title and sentence counter with progress
 * 
 * Mobile: Unified header for both dictation and shadowing modes
 * - Fixed header with mode toggle
 * - Only content below changes when switching modes
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
  learningMode = 'dictation',
  onToggleLearningMode
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
    // Unified mobile header - same for both modes
    return (
      <div className={styles.unifiedMobileHeader}>
        {/* Left: Learning mode toggle */}
        <div className={styles.headerLeftMobile}>
          {onToggleLearningMode && (
            <button 
              className={`${styles.modeToggleButton} ${learningMode === 'shadowing' ? styles.modeToggleActive : ''}`}
              onClick={onToggleLearningMode}
              title={learningMode === 'dictation' ? 'Chuyển sang Shadowing' : 'Chuyển sang Dictation'}
            >
              {learningMode === 'dictation' ? '📝' : '👀'}
              <span className={styles.modeLabel}>
                {learningMode === 'dictation' ? 'Diktat' : 'Shadow'}
              </span>
            </button>
          )}
        </div>

        {/* Center: Sentence counter */}
        <div className={styles.headerCenter}>
          <span className={styles.sentenceNumber}>#{currentSentenceIndex + 1}</span>
          <span className={styles.sentenceDivider}>/</span>
          <span className={styles.sentenceTotal}>{totalSentences}</span>
        </div>

        {/* Right: Controls */}
        <div className={styles.headerRightMobile}>
          {/* Translation toggle */}
          {onToggleTranslation && (
            <button 
              className={`${styles.translationToggleMobile} ${showTranslation ? styles.translationToggleActive : ''}`}
              onClick={onToggleTranslation}
              title={showTranslation ? 'Ẩn dịch' : 'Hiện dịch'}
            >
              🌐
            </button>
          )}
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
    <>
      {/* Floating Mode Toggle Button - Outside column */}
      {onToggleLearningMode && (
        <button 
          className={`${styles.floatingModeToggle} ${learningMode === 'shadowing' ? styles.floatingModeToggleActive : ''}`}
          onClick={onToggleLearningMode}
          title={learningMode === 'dictation' ? 'Chuyển sang Shadowing' : 'Chuyển sang Dictation'}
        >
          <span className={styles.floatingModeIcon}>
            {learningMode === 'dictation' ? '📝' : '👀'}
          </span>
          <span className={styles.floatingModeLabel}>
            {learningMode === 'dictation' ? 'Diktat' : 'Shadow'}
          </span>
        </button>
      )}
      
      <div className={styles.dictationHeader}>
        <h3 className={styles.dictationHeaderTitle}>
          {learningMode === 'dictation' ? t('lesson.ui.dictation') : t('lesson.ui.shadowing')}
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
    </>
  );
};

export default DictationHeader;
