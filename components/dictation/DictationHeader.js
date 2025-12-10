import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  onToggleLearningMode,
  lessonId
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSpeedClick = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed || 1);
    const nextIndex = (currentIndex + 1) % speeds.length;
    onSpeedChange(speeds[nextIndex]);
  };

  const handleModeSelect = (mode) => {
    setShowModeDropdown(false);
    if (mode === 'practice') {
      router.push(`/practice/${lessonId}`);
    } else if (mode !== learningMode) {
      onToggleLearningMode && onToggleLearningMode();
    }
  };

  const getModeIcon = (mode) => {
    switch(mode) {
      case 'dictation': return '📝';
      case 'shadowing': return '👀';
      case 'practice': return '🎯';
      default: return '📝';
    }
  };

  const getModeLabel = (mode) => {
    switch(mode) {
      case 'dictation': return 'Diktat';
      case 'shadowing': return 'Shadow';
      case 'practice': return 'Luyện tập';
      default: return 'Diktat';
    }
  };

  // Calculate progress percentage
  const progressPercent = totalSentences > 0 ? Math.round((completedCount / totalSentences) * 100) : 0;

  if (isMobile) {
    // Unified mobile header - same for both modes
    return (
      <div className={styles.unifiedMobileHeader}>
        {/* Left: Learning mode dropdown */}
        <div className={styles.headerLeftMobile} ref={dropdownRef}>
          <button 
            className={`${styles.modeToggleButton} ${learningMode === 'shadowing' ? styles.modeToggleActive : ''}`}
            onClick={() => setShowModeDropdown(!showModeDropdown)}
            title="Chọn chế độ học"
          >
            {getModeIcon(learningMode)}
            <span className={styles.modeLabel}>
              {getModeLabel(learningMode)}
            </span>
            <span className={styles.dropdownArrow}>▼</span>
          </button>
          
          {showModeDropdown && (
            <div className={styles.modeDropdownMobile}>
              <button 
                className={`${styles.modeDropdownItem} ${learningMode === 'dictation' ? styles.modeDropdownItemActive : ''}`}
                onClick={() => handleModeSelect('dictation')}
              >
                <span>📝</span> Diktat
              </button>
              <button 
                className={`${styles.modeDropdownItem} ${learningMode === 'shadowing' ? styles.modeDropdownItemActive : ''}`}
                onClick={() => handleModeSelect('shadowing')}
              >
                <span>👀</span> Shadow
              </button>
              <button 
                className={styles.modeDropdownItem}
                onClick={() => handleModeSelect('practice')}
              >
                <span>🎯</span> Luyện tập
              </button>
            </div>
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
      {/* Floating Mode Dropdown Button - Outside column */}
      <div className={styles.floatingModeContainer} ref={dropdownRef}>
        <button 
          className={`${styles.floatingModeToggle} ${learningMode === 'shadowing' ? styles.floatingModeToggleActive : ''}`}
          onClick={() => setShowModeDropdown(!showModeDropdown)}
          title="Chọn chế độ học"
        >
          <span className={styles.floatingModeIcon}>
            {getModeIcon(learningMode)}
          </span>
          <span className={styles.floatingModeLabel}>
            {getModeLabel(learningMode)}
          </span>
          <span className={styles.floatingDropdownArrow}>▼</span>
        </button>
        
        {showModeDropdown && (
          <div className={styles.floatingModeDropdown}>
            <button 
              className={`${styles.floatingDropdownItem} ${learningMode === 'dictation' ? styles.floatingDropdownItemActive : ''}`}
              onClick={() => handleModeSelect('dictation')}
            >
              <span className={styles.floatingDropdownIcon}>📝</span>
              <span>Diktat</span>
            </button>
            <button 
              className={`${styles.floatingDropdownItem} ${learningMode === 'shadowing' ? styles.floatingDropdownItemActive : ''}`}
              onClick={() => handleModeSelect('shadowing')}
            >
              <span className={styles.floatingDropdownIcon}>👀</span>
              <span>Shadow</span>
            </button>
            <div className={styles.floatingDropdownDivider}></div>
            <button 
              className={styles.floatingDropdownItem}
              onClick={() => handleModeSelect('practice')}
            >
              <span className={styles.floatingDropdownIcon}>🎯</span>
              <span>Luyện tập</span>
            </button>
          </div>
        )}
      </div>
      
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
