import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import SEO, { generateVideoStructuredData, generateBreadcrumbStructuredData } from '../SEO';
import ProgressIndicator from '../ProgressIndicator';
import KaraokeText from './KaraokeText';
import TranscriptKaraokeWords from './TranscriptKaraokeWords';
import styles from '../../styles/shadowingPage.module.css';

// Lazy load components that are conditionally rendered
const WordTooltip = dynamic(() => import('../WordTooltip'), {
  loading: () => null,
  ssr: false
});

const ShadowingVoiceRecorder = dynamic(() => import('../ShadowingVoiceRecorder'), {
  loading: () => null,
  ssr: false
});

const ShadowingMobile = ({
  lesson,
  lessonId,
  transcriptData,
  currentTime,
  duration,
  isPlaying,
  currentSentenceIndex,
  autoStop,
  setAutoStop,
  showIPA,
  showTranslation,
  showTooltip,
  setShowTooltip,
  tooltipTranslation,
  tooltipPosition,
  playbackSpeed,
  setPlaybackSpeed,
  recordingStates,
  sentenceProgressData,
  studyTime,
  isYouTube,
  audioRef,
  youtubePlayerRef,
  playerContainerRef,
  activeTranscriptItemRef,
  transcriptListRef,
  handleSentenceClick,
  goToPreviousSentence,
  goToNextSentence,
  handleWordClickForPopup,
  handleVoiceTranscript,
  handleAudioRecorded,
  handleRecordingStateChange,
  playRecordedAudio,
  handlePlayPause,
  formatTime,
  // Bookmarks
  bookmarkCount,
  showOnlyBookmarked,
  setShowOnlyBookmarked,
  toggleBookmark,
  isBookmarked,
  filteredTranscriptData,
}) => {
  const { t } = useTranslation();

  const videoData = lesson.youtubeUrl ? generateVideoStructuredData({
    ...lesson,
    title: lesson.displayTitle || lesson.title,
    description: `Shadowing Übung: ${lesson.title}. Verbessere deine deutsche Aussprache durch aktives Nachsprechen.`,
    thumbnail: lesson.thumbnail,
    videoUrl: lesson.youtubeUrl,
    duration: duration ? `PT${Math.floor(duration)}S` : undefined,
  }) : null;

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Shadowing', url: '/shadowing' },
    { name: lesson.displayTitle || lesson.title, url: `/shadowing/${lessonId}` }
  ]);

  const structuredDataArray = videoData ? [videoData, breadcrumbData] : [breadcrumbData];

  return (
    <>
      <SEO
        title={`${lesson.displayTitle || lesson.title} - Shadowing Übung | PapaGeil`}
        description={`Verbessere deine deutsche Aussprache mit Shadowing: "${lesson.title}". ✓ Level ${lesson.difficulty || 'A1-C2'} ✓ Interaktive Übung ✓ Mit Untertiteln und IPA-Transkription`}
        keywords={`Shadowing ${lesson.title}, Deutsch Aussprache üben, ${lesson.difficulty || 'A1-C2'} Deutsch, Shadowing Methode, PapaGeil ${lesson.displayTitle}, Deutsch sprechen lernen, German pronunciation practice, Hörverstehen Deutsch`}
        ogImage={lesson.thumbnail || '/og-image.jpg'}
        ogType="video.other"
        canonicalUrl={`/shadowing/${lessonId}`}
        locale="de_DE"
        author="PapaGeil"
        publishedTime={lesson.createdAt}
        modifiedTime={lesson.updatedAt || lesson.createdAt}
        structuredData={structuredDataArray}
      />

      {/* Hide footer and header on mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .header,
          footer {
            display: none !important;
          }
        }
      `}</style>

      <div className={`${styles.page} dark-theme`}>
        {!isYouTube && (
          <audio ref={audioRef} controls style={{ display: 'none' }}>
            <source src={lesson.audio} type="audio/mp3" />
            Ihr Browser unterstützt das Audio-Tag nicht.
          </audio>
        )}

        <div className={`${styles.appContainer} ${styles.appContainerOffset}`}>
          <div className={styles.mainContainer}>
            {/* Left Section: Video */}
            <div className={styles.leftSection}>
              {/* Video Section */}
              <div className={styles.videoSection}>
                {/* Video Player */}
                <div className={styles.videoContainer}>
                  {isYouTube ? (
                    <div className={styles.videoWrapper}>
                      <div ref={playerContainerRef} id="youtube-player-shadowing" style={{ width: '100%', height: '100%' }}></div>
                      <div className={styles.videoOverlay} onClick={() => transcriptData[currentSentenceIndex] && handleSentenceClick(transcriptData[currentSentenceIndex].start, transcriptData[currentSentenceIndex].end)}></div>
                    </div>
                  ) : (
                    <div className={styles.videoPlaceholder}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                      </svg>
                    </div>
                  )}
                  <div className={styles.videoTimer}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
              </div>

              {/* Mobile: Current sentence display - Hidden by CSS but keeping structure */}
              {transcriptData[currentSentenceIndex] && (
                <div className={styles.currentSentenceDisplay}>
                  <KaraokeText
                    segment={transcriptData[currentSentenceIndex]}
                    onWordClick={handleWordClickForPopup}
                  />
                  {showIPA && transcriptData[currentSentenceIndex].ipa && (
                    <div className={styles.currentSentenceIPA}>
                      {transcriptData[currentSentenceIndex].ipa}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Section: Transcript */}
            <div className={styles.transcriptSection}>
              {/* Mobile Controls Bar */}
              <div className={styles.mobileControlsBar}>
                {/* Left: Sentence Counter + Bookmark Filter */}
                <div className={styles.mobileControlsLeft}>
                  <span className={styles.sentenceCounterMobile}>#{currentSentenceIndex + 1}/{transcriptData.length}</span>
                  {/* Bookmark Filter Button */}
                  {bookmarkCount > 0 && (
                    <button
                      className={`${styles.bookmarkFilterBtnMobile} ${showOnlyBookmarked ? styles.bookmarkFilterBtnMobileActive : ''}`}
                      onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={showOnlyBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span>{bookmarkCount}</span>
                    </button>
                  )}
                </div>
                
                {/* Right: Controls */}
                <div className={styles.mobileControlsRight}>
                  {/* Speed Control Button */}
                  <button
                    className={styles.mobileControlButton}
                    onClick={() => {
                      const speeds = [0.5, 0.75, 1, 1.25, 1.5];
                      const currentIndex = speeds.indexOf(playbackSpeed);
                      const nextIndex = (currentIndex + 1) % speeds.length;
                      setPlaybackSpeed(speeds[nextIndex]);
                    }}
                  >
                    {playbackSpeed}x
                  </button>
                  
                  {/* Auto Stop Button */}
                  <button
                    className={`${styles.mobileControlButton} ${autoStop ? styles.mobileControlButtonActive : ''}`}
                    onClick={() => setAutoStop(!autoStop)}
                  >
                    {autoStop ? 'Auto ✓' : 'Auto'}
                  </button>
                </div>
              </div>

              <div className={styles.transcriptList} ref={transcriptListRef}>
                {(showOnlyBookmarked ? filteredTranscriptData : transcriptData).map((segment, index) => {
                  const originalIndex = segment.originalIndex !== undefined ? segment.originalIndex : index;
                  const sentenceState = recordingStates[originalIndex] || {};
                  const isActive = currentSentenceIndex === originalIndex;
                  
                  return (
                    <div
                      key={originalIndex}
                      ref={isActive ? activeTranscriptItemRef : null}
                      className={`${styles.transcriptItem} ${isActive ? styles.transcriptItemActive : ''} ${isBookmarked(originalIndex) ? styles.transcriptItemBookmarked : ''}`}
                    >
                      <div onClick={() => handleSentenceClick(segment.start, segment.end)} style={{ position: 'relative' }}>
                        {/* Bookmark Button - Top Right */}
                        <button
                          className={`${styles.bookmarkBtnMobile} ${isBookmarked(originalIndex) ? styles.bookmarkBtnMobileActive : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(originalIndex);
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked(originalIndex) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                          </svg>
                        </button>
                        
                        <div className={styles.transcriptText}>
                          {/* Mobile: Show play button at the beginning */}
                          <button
                            className={styles.sentencePlayButtonMobile}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSentenceClick(segment.start, segment.end);
                            }}
                            aria-label={isPlaying && isActive ? 'Pause' : 'Play'}
                          >
                            {isPlaying && isActive ? (
                              <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                                <rect x="0" y="0" width="2.5" height="10" rx="0.5"/>
                                <rect x="5.5" y="0" width="2.5" height="10" rx="0.5"/>
                              </svg>
                            ) : (
                              <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                                <path d="M0 0L8 5L0 10V0Z"/>
                              </svg>
                            )}
                          </button>
                          
                          {/* Words for transcript list */}
                          <span className={styles.transcriptWordsWrapper}>
                            <TranscriptKaraokeWords
                              segment={segment}
                              onWordClick={handleWordClickForPopup}
                            />
                          </span>
                        </div>
                      
                        {showIPA && segment.ipa && (
                          <div className={styles.transcriptIPA}>{segment.ipa}</div>
                        )}

                        {showTranslation && segment.translation && (
                          <div className={styles.transcriptTranslation}>{segment.translation}</div>
                        )}

                        {/* Footer: Score badge */}
                        {sentenceState.comparisonResult && (
                          <div className={styles.transcriptItemFooter}>
                            <span 
                              className={`${styles.inlineScorePercent} ${sentenceState.comparisonResult.isPassed ? styles.inlineScorePercentPassed : styles.inlineScorePercentFailed}`}
                            >
                              {Math.round(sentenceState.comparisonResult.overallSimilarity)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Control Bar - Mobile Only - Unified Design */}
          <div className={styles.mobileBottomBar}>
            {/* Navigation Group */}
            <div className={styles.mobileControlGroup}>
              <button 
                className={styles.mobileCircleBtn}
                onClick={goToPreviousSentence}
                disabled={currentSentenceIndex === 0}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              
              {/* Play/Pause Button */}
              <button 
                className={`${styles.mobileCircleBtn} ${styles.mobileCircleBtnPlay}`}
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              
              <button 
                className={styles.mobileCircleBtn}
                onClick={goToNextSentence}
                disabled={currentSentenceIndex >= transcriptData.length - 1}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            </div>

            {/* Recording Group */}
            <div className={styles.mobileControlGroup}>
              {/* Record Button */}
              {transcriptData[currentSentenceIndex] ? (
                <ShadowingVoiceRecorder
                  onTranscript={(transcript) => handleVoiceTranscript(currentSentenceIndex, transcript)}
                  onAudioRecorded={(audioBlob) => handleAudioRecorded(currentSentenceIndex, audioBlob)}
                  language="de-DE"
                  size="mobile"
                  onRecordingStateChange={(state) => handleRecordingStateChange(currentSentenceIndex, state)}
                />
              ) : (
                <div className={styles.mobileCircleBtnDisabled}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                  </svg>
                </div>
              )}
              
              {/* Playback Button - Only show if has recording */}
              {recordingStates[currentSentenceIndex]?.recordedBlob && (
                <button
                  className={`${styles.mobileCircleBtn} ${styles.mobileCircleBtnPlayback} ${
                    recordingStates[currentSentenceIndex]?.isPlaying ? styles.playing : ''
                  }`}
                  onClick={() => playRecordedAudio(currentSentenceIndex)}
                >
                  {recordingStates[currentSentenceIndex]?.isPlaying ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <rect x="6" y="4" width="4" height="16" rx="1"/>
                      <rect x="14" y="4" width="4" height="16" rx="1"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Word Tooltip (mobile only - simple translation) */}
        {showTooltip && (
          <WordTooltip
            translation={tooltipTranslation}
            position={tooltipPosition}
            onClose={() => setShowTooltip(false)}
          />
        )}
      </div>
    </>
  );
};

export default ShadowingMobile;
