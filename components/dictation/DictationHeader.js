import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useIsNativeApp } from '../../lib/hooks/useIsNativeApp';
import layoutStyles from '../../styles/dictationPage.module.css';
import inputStyles from '../../styles/dictation/dictationInput.module.css';
import headerStyles from '../../styles/dictation/dictationHeader.module.css';

const styles = { ...layoutStyles, ...inputStyles, ...headerStyles };

/**
 * Dictation Header Component (Simplified - Full Sentence Mode Only)
 * Displays title and sentence counter with progress
 * 
 * Mobile: Unified header for both dictation and shadowing modes
 * - Fixed header with mode toggle (click to switch between modes)
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
  autoStop,
  onAutoStopChange,
  learningMode = 'dictation',
  onToggleLearningMode,
  lessonId,
  savedVocabularyCount = 0,
  onShowVocabulary
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isIOS } = useIsNativeApp();

  // Handle back button
  const handleBack = () => {
    router.push('/');
  };

  // Calculate progress percentage
  const progressPercent = totalSentences > 0 ? Math.round((completedCount / totalSentences) * 100) : 0;

  if (isMobile) {
    // Unified mobile header with back button - same for both modes
    return (
      <div className={styles.unifiedMobileHeader}>
        {/* Left: Back button (only on iOS) */}
        <div className={styles.headerLeftMobile}>
          {isIOS && (
            <button 
              className={styles.backButton}
              onClick={handleBack}
              aria-label="Go back"
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Center: Sentence counter */}
        <div className={styles.headerCenter}>
          <span className={styles.sentenceNumber}>#{currentSentenceIndex + 1}</span>
          <span className={styles.sentenceDivider}>/</span>
          <span className={styles.sentenceTotal}>{totalSentences}</span>
        </div>

        {/* Right: Empty space (Settings moved to below video) */}
        <div className={styles.headerRightMobile}>
          {/* Settings button removed - now below video */}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <>
      {/* Floating Mode Toggle Button - HIDDEN */}
      {/* <div className={styles.floatingModeContainer}>
        <button 
          className={`${styles.floatingModeToggle} ${learningMode === 'shadowing' ? styles.floatingModeToggleActive : ''}`}
          onClick={handleModeToggle}
          title="Chuyển chế độ học"
        >
          <span className={styles.floatingModeIcon}>
            {getModeIcon()}
          </span>
          <span className={styles.floatingModeLabel}>
            {getModeLabel()}
          </span>
        </button>
      </div> */}
      
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
