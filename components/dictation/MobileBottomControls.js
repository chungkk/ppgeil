import React from 'react';
import layoutStyles from '../../styles/dictationPage.module.css';
import mobileStyles from '../../styles/dictation/dictationMobile.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...mobileStyles };

/**
 * Mobile Bottom Controls Component
 * Fixed position controls for mobile view
 * Synced with shadowingPage design (circular buttons)
 * 
 * CSS: Uses dictationMobile.module.css for component-specific styles
 */
const MobileBottomControls = ({
  isPlaying,
  onPlayPause,
  onReplay
}) => {
  return (
    <div className={styles.mobileBottomControls}>
      {/* Replay Button */}
      <button 
        className={`${styles.mobileControlBtn} ${styles.mobileControlBtnReplay}`}
        onClick={onReplay}
        title="Replay"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      {/* Play/Pause Button - Center & Larger */}
      <button 
        className={`${styles.mobileControlBtn} ${styles.mobileControlBtnPlay}`}
        onClick={onPlayPause}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default MobileBottomControls;
