import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import IOSBackButton from '../IOSBackButton';
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
// Retro flip clock component for study timer
const RetroFlipClock = ({ timeString }) => {
  const digits = timeString.replace(/:/g, '').split('');

  const digitStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '32px',
    background: '#00cec9',
    border: '2px solid #2d3436',
    borderRadius: '6px',
    fontFamily: "'SF Mono', 'Monaco', 'Courier New', monospace",
    fontSize: '16px',
    fontWeight: 800,
    color: '#1a1a2e',
    boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.15)'
  };

  const colonStyle = {
    fontFamily: "'SF Mono', 'Monaco', 'Courier New', monospace",
    fontSize: '18px',
    fontWeight: 900,
    color: '#1a1a2e',
    margin: '0 2px'
  };

  return (
    <>
      <span style={digitStyle}>{digits[0]}</span>
      <span style={digitStyle}>{digits[1]}</span>
      <span style={colonStyle}>:</span>
      <span style={digitStyle}>{digits[2]}</span>
      <span style={digitStyle}>{digits[3]}</span>
      <span style={colonStyle}>:</span>
      <span style={digitStyle}>{digits[4]}</span>
      <span style={digitStyle}>{digits[5]}</span>
    </>
  );
};

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
  onShowVocabulary,
  studyTime = 0,
  formatStudyTime
}) => {
  const { t } = useTranslation();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
    };
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showSettingsMenu]);

  const handleSpeedClick = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed || 1);
    const nextIndex = (currentIndex + 1) % speeds.length;
    onSpeedChange(speeds[nextIndex]);
  };

  const handleModeToggle = () => {
    onToggleLearningMode && onToggleLearningMode();
  };

  const getModeIcon = () => {
    return learningMode === 'dictation' ? '📝' : '👀';
  };

  const getModeLabel = () => {
    return learningMode === 'dictation' ? 'Diktat' : 'Shadow';
  };

  // Calculate progress percentage
  const progressPercent = totalSentences > 0 ? Math.round((completedCount / totalSentences) * 100) : 0;

  if (isMobile) {
    // Unified mobile header - same for both modes
    return (
      <>
        {/* iOS Back Button */}
        <IOSBackButton />
        
        <div className={styles.unifiedMobileHeader}>
          {/* Left: Learning mode toggle button - HIDDEN */}
          {/* <div className={styles.headerLeftMobile}>
            <button 
              className={`${styles.modeToggleButton} ${learningMode === 'shadowing' ? styles.modeToggleActive : ''}`}
              onClick={handleModeToggle}
              title="Chuyển chế độ học"
            >
              {getModeIcon()}
              <span className={styles.modeLabel}>
                {getModeLabel()}
              </span>
            </button>
          </div> */}

          {/* Center: Sentence counter */}
          <div className={styles.headerCenter}>
          <span className={styles.sentenceNumber}>#{currentSentenceIndex + 1}</span>
          <span className={styles.sentenceDivider}>/</span>
          <span className={styles.sentenceTotal}>{totalSentences}</span>
        </div>

        {/* Right: Settings button with dropdown */}
        <div className={styles.headerRightMobile} ref={settingsRef}>
          <button 
            className={`${styles.settingsButtonMobile} ${showSettingsMenu ? styles.settingsButtonActive : ''}`}
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            title="Cài đặt"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          {/* Settings dropdown menu */}
          {showSettingsMenu && (
            <div className={styles.settingsDropdownMobile}>
              {/* Translation toggle */}
              {onToggleTranslation && (
                <button 
                  className={`${styles.settingsMenuItem} ${showTranslation ? styles.settingsMenuItemActive : ''}`}
                  onClick={() => {
                    onToggleTranslation();
                  }}
                >
                  <span className={styles.settingsMenuIcon}>🌐</span>
                  <span className={styles.settingsMenuText}>Hiện dịch</span>
                  <span className={styles.settingsMenuToggle}>
                    {showTranslation ? '✓' : ''}
                  </span>
                </button>
              )}
              
              {/* Speed control */}
              {onSpeedChange && (
                <button 
                  className={styles.settingsMenuItem}
                  onClick={handleSpeedClick}
                >
                  <span className={styles.settingsMenuIcon}>⚡</span>
                  <span className={styles.settingsMenuText}>Tốc độ</span>
                  <span className={styles.settingsMenuValue}>{playbackSpeed || 1}x</span>
                </button>
              )}
              
              {/* Auto stop toggle */}
              {onAutoStopChange && (
                <button 
                  className={`${styles.settingsMenuItem} ${autoStop ? styles.settingsMenuItemActive : ''}`}
                  onClick={() => onAutoStopChange(!autoStop)}
                >
                  <span className={styles.settingsMenuIcon}>⏸️</span>
                  <span className={styles.settingsMenuText}>Auto stop</span>
                  <span className={styles.settingsMenuToggle}>
                    {autoStop ? '✓' : ''}
                  </span>
                </button>
              )}
              
              {/* Vocabulary button */}
              {onShowVocabulary && (
                <button 
                  className={styles.settingsMenuItem}
                  onClick={() => {
                    onShowVocabulary();
                    setShowSettingsMenu(false);
                  }}
                >
                  <span className={styles.settingsMenuIcon}>📚</span>
                  <span className={styles.settingsMenuText}>Từ vựng</span>
                  <span className={styles.settingsMenuValue}>{savedVocabularyCount}</span>
                </button>
              )}
            </div>
          )}
        </div>
        </div>
      </>
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
      
      <div className={styles.dictationHeader} style={{ justifyContent: 'space-between' }}>
        {/* Left - Title */}
        <h3 className={styles.dictationHeaderTitle} style={{
          fontSize: '16px',
          fontWeight: 800,
          color: '#1a1a2e',
          lineHeight: 1,
          margin: 0,
          padding: '6px 12px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          background: '#fdcb6e',
          border: '2px solid #2d3436',
          borderRadius: '8px',
          boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.15)',
          display: 'inline-block',
          fontFamily: "'SF Mono', 'Monaco', 'Courier New', monospace"
        }}>
          {learningMode === 'dictation' ? t('lesson.ui.dictation') : t('lesson.ui.shadowing')}
        </h3>
        
        {/* Center - Study Timer */}
        {formatStudyTime && (
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            background: 'white',
            border: '2px solid #2d3436',
            borderRadius: '8px',
            boxShadow: '3px 3px 0 rgba(0, 0, 0, 0.15)'
          }}>
            <RetroFlipClock timeString={formatStudyTime(studyTime)} />
          </div>
        )}
        
        {/* Right - Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onToggleTranslation && (
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={showTranslation}
                onChange={onToggleTranslation}
                className={styles.toggleInput}
              />
              <span className={styles.toggleSlider}></span>
              <span className={styles.toggleText}>{t('dictationPage.translate')}</span>
            </label>
          )}
        </div>
      </div>
    </>
  );
};

export default DictationHeader;
