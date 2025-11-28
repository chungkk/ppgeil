import React from 'react';
import { useTranslation } from 'react-i18next';
import layoutStyles from '../../styles/dictationPage.module.css';
import videoStyles from '../../styles/dictation/dictationVideo.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...videoStyles };

/**
 * Dictation Video Section Component
 * Handles video player, header, and controls
 * 
 * CSS: Uses dictationVideo.module.css for component-specific styles
 */
const DictationVideoSection = ({
  lesson,
  isYouTube,
  audioRef,
  currentTime,
  duration,
  autoStop,
  onAutoStopChange,
  studyTime,
  formatStudyTime,
  formatTime,
  isMobile,
  onVideoClick,
  // Control handlers
  isPlaying,
  onPlayPause,
  onReplayFromStart,
  onPrevSentence,
  onNextSentence,
  playbackSpeed,
  onSpeedChange
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.leftSection}>
      {/* Video Header */}
      <div className={styles.videoHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 className={styles.transcriptTitle}>{t('lesson.ui.video')}</h3>
          <div className={styles.studyTimer}>
            <span className={styles.timerIcon}>⏱️</span>
            <span className={styles.timerText}>{formatStudyTime(studyTime)}</span>
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={autoStop}
                onChange={(e) => onAutoStopChange(e.target.checked)}
                className={styles.toggleInput}
              />
              <span className={styles.toggleSlider}></span>
              <span className={styles.toggleText}>{t('lesson.ui.autoStop')}</span>
            </label>
            <button 
              className={styles.speedButton} 
              onClick={() => {
                const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                const currentIndex = speeds.indexOf(playbackSpeed || 1);
                const nextIndex = (currentIndex + 1) % speeds.length;
                onSpeedChange(speeds[nextIndex]);
              }}
            >
              ⚡ {playbackSpeed || 1}x
            </button>
          </div>
        )}
      </div>

      <div className={styles.videoWrapper}>
        {/* Video Container */}
        <div className={styles.videoContainer}>
          {isYouTube ? (
            <div className={styles.videoPlayerWrapper}>
              <div id="youtube-player"></div>
              <div className={styles.videoOverlay} onClick={onVideoClick}>
                <div className={styles.videoTimer}>
                  ⏱️ {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>
          ) : lesson.audioUrl ? (
            <div className={styles.videoPlaceholder}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <div className={styles.videoTimer}>
                ⏱️ {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          ) : null}
          <audio ref={audioRef} src={lesson.audioUrl} preload="metadata"></audio>
        </div>

        {/* Video Controls */}
        {!isMobile && (
          <div className={styles.videoControls}>
            {/* Playback Controls Row */}
            <div className={styles.playbackControlsRow}>
              {/* Previous Sentence */}
              <button
                className={styles.controlBtn}
                onClick={onPrevSentence}
                title={t('lesson.ui.previous')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
                </svg>
              </button>

              {/* Replay from Start */}
              <button
                className={styles.controlBtn}
                onClick={onReplayFromStart}
                title={t('lesson.ui.replay')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
              </button>

              {/* Play/Pause (Large) */}
              <button
                className={`${styles.controlBtn} ${styles.playPauseBtn}`}
                onClick={onPlayPause}
                title={isPlaying ? t('lesson.ui.pause') : t('lesson.ui.play')}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next Sentence */}
              <button
                className={styles.controlBtn}
                onClick={onNextSentence}
                title={t('lesson.ui.next')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Video Title */}
        <div className={styles.videoTitleBox}>
          <h3>{lesson.displayTitle || lesson.title}</h3>
        </div>
      </div>
    </div>
  );
};

export default DictationVideoSection;
