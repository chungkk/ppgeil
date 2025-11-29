import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import SEO, { generateVideoStructuredData, generateBreadcrumbStructuredData } from '../SEO';
import ProgressIndicator from '../ProgressIndicator';
import KaraokeText from './KaraokeText';
import styles from '../../styles/shadowingPage.module.css';

// Lazy load heavy components that are conditionally rendered
const DictionaryPopup = dynamic(() => import('../DictionaryPopup'), {
  loading: () => null, // No loader needed for popup
  ssr: false // Dictionary popup doesn't need SSR
});

const ShadowingVoiceRecorder = dynamic(() => import('../ShadowingVoiceRecorder'), {
  loading: () => null,
  ssr: false // Voice recorder needs browser APIs
});

const ShadowingDesktop = ({
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
  setShowTranslation,
  playbackSpeed,
  setPlaybackSpeed,
  showVocabPopup,
  setShowVocabPopup,
  selectedWord,
  popupPosition,
  popupArrowPosition,
  clickedWordElement,
  setClickedWordElement,
  showWordLoading,
  loadingPosition,
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
  handleSeek,
  handlePlayPause,
  formatTime,
  formatStudyTime,
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

      <div className={`${styles.page} dark-theme`}>
        {!isYouTube && (
          <audio ref={audioRef} controls style={{ display: 'none' }}>
            <source src={lesson.audio} type="audio/mp3" />
            Ihr Browser unterstützt das Audio-Tag nicht.
          </audio>
        )}

        <div className={`${styles.appContainer} ${styles.appContainerOffset}`}>
          <div className={styles.mainContainer}>
            {/* Left Section: Video + Current Sentence + Controls */}
            <div className={styles.leftSection}>
              {/* Video Section */}
              <div className={styles.videoSection}>
                <div className={styles.videoHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 className={styles.transcriptTitle}>{t('lesson.ui.video')}</h3>
                    <div className={styles.studyTimer}>
                      <span className={styles.timerIcon}>⏱️</span>
                      <span className={styles.timerText}>{formatStudyTime(studyTime)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={autoStop}
                        onChange={(e) => setAutoStop(e.target.checked)}
                        className={styles.toggleInput}
                      />
                      <span className={styles.toggleSlider}></span>
                      <span className={styles.toggleText}>{t('lesson.ui.autoStop')}</span>
                    </label>
                    <button className={styles.speedButton} onClick={() => {
                      const speeds = [0.5, 0.75, 1, 1.25, 1.5];
                      const currentIndex = speeds.indexOf(playbackSpeed);
                      const nextIndex = (currentIndex + 1) % speeds.length;
                      setPlaybackSpeed(speeds[nextIndex]);
                    }}>
                      ⚡ {playbackSpeed}x
                    </button>
                  </div>
                </div>

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

              {/* Video Controls - Desktop Only - Unified Circular Design */}
              {transcriptData[currentSentenceIndex] && (
                <div className={styles.videoControlsSection}>
                  {/* Unified Control Bar */}
                  <div className={styles.unifiedControlBar}>
                    {/* Video Navigation Group */}
                    <div className={styles.controlGroup}>
                      {/* Previous Sentence */}
                      <button 
                        className={styles.unifiedBtn}
                        onClick={goToPreviousSentence}
                        disabled={currentSentenceIndex === 0}
                        title="Câu trước"
                        data-label="Trước"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
                        </svg>
                      </button>
                      
                      {/* Replay 3s */}
                      <button 
                        className={styles.unifiedBtn}
                        onClick={() => handleSeek('backward')}
                        title="Lùi 3 giây"
                        data-label="-3s"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Main Play/Pause Button */}
                    <button 
                      className={`${styles.unifiedBtn} ${styles.unifiedBtnPlay}`}
                      onClick={handlePlayPause}
                      title={isPlaying ? 'Tạm dừng' : 'Phát'}
                      data-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>

                    {/* Forward Navigation Group */}
                    <div className={styles.controlGroup}>
                      {/* Forward 3s */}
                      <button 
                        className={styles.unifiedBtn}
                        onClick={() => handleSeek('forward')}
                        title="Tiến 3 giây"
                        data-label="+3s"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                        </svg>
                      </button>
                      
                      {/* Next Sentence */}
                      <button 
                        className={styles.unifiedBtn}
                        onClick={goToNextSentence}
                        disabled={currentSentenceIndex >= transcriptData.length - 1}
                        title="Câu sau"
                        data-label="Sau"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Divider */}
                    <div className={styles.controlDivider}></div>

                    {/* Recording Group */}
                    <div className={styles.controlGroup}>
                      {/* Record Button - Using ShadowingVoiceRecorder with unified style */}
                      <ShadowingVoiceRecorder
                        onTranscript={(transcript) => handleVoiceTranscript(currentSentenceIndex, transcript)}
                        onAudioRecorded={(audioBlob) => handleAudioRecorded(currentSentenceIndex, audioBlob)}
                        language="de-DE"
                        size="unified"
                        onRecordingStateChange={(state) => handleRecordingStateChange(currentSentenceIndex, state)}
                      />
                      
                      {/* Playback Recorded Audio Button - Always visible, dimmed when no recording */}
                      <button
                        className={`${styles.unifiedBtn} ${styles.unifiedBtnPlayback} ${
                          recordingStates[currentSentenceIndex]?.isPlaying ? styles.playing : ''
                        }`}
                        onClick={() => playRecordedAudio(currentSentenceIndex)}
                        disabled={!recordingStates[currentSentenceIndex]?.recordedBlob}
                        title={recordingStates[currentSentenceIndex]?.recordedBlob 
                          ? (recordingStates[currentSentenceIndex]?.isPlaying ? 'Đang phát' : 'Nghe lại')
                          : 'Chưa có ghi âm'
                        }
                        data-label="Nghe lại"
                      >
                        {recordingStates[currentSentenceIndex]?.isPlaying ? (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1"/>
                            <rect x="14" y="4" width="4" height="16" rx="1"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Current Sentence Display */}
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
                </div>
              )}
            </div>

            {/* Right Section: Transcript */}
            <div className={styles.transcriptSection}>
              <div className={styles.transcriptHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 className={styles.transcriptTitle}>{t('lesson.ui.transcript')}</h3>
                  <span className={styles.sentenceCounter}>#{currentSentenceIndex + 1}/{transcriptData.length}</span>
                  {/* Bookmark Filter Button */}
                  {bookmarkCount > 0 && (
                    <button
                      className={`${styles.bookmarkFilterBtn} ${showOnlyBookmarked ? styles.bookmarkFilterBtnActive : ''}`}
                      onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
                      title={showOnlyBookmarked ? 'Hiện tất cả' : 'Chỉ hiện đã bookmark'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={showOnlyBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span>{bookmarkCount}</span>
                    </button>
                  )}
                  {/* Translation Toggle Button */}
                  <button
                    className={`${styles.translationToggleBtn} ${showTranslation ? styles.translationToggleBtnActive : ''}`}
                    onClick={() => setShowTranslation(!showTranslation)}
                    title={showTranslation ? 'Ẩn bản dịch' : 'Hiện bản dịch'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 8l6 6"/>
                      <path d="M4 14l6-6 2-3"/>
                      <path d="M2 5h12"/>
                      <path d="M7 2h1"/>
                      <path d="M22 22l-5-10-5 10"/>
                      <path d="M14 18h6"/>
                    </svg>
                    <span>Dịch</span>
                  </button>
                </div>
                <div style={{ pointerEvents: 'none' }}>
                    <ProgressIndicator
                      completedSentences={Object.keys(sentenceProgressData).map(idx => parseInt(idx))}
                      totalSentences={transcriptData.length}
                      completedWords={{}}
                      totalWords={0}
                      difficultyLevel={lesson?.difficulty?.toLowerCase() || 'b1'}
                      hidePercentage={30}
                      studyTime={studyTime}
                    />
                </div>
              </div>

              <div className={styles.transcriptList} ref={transcriptListRef}>
                {(showOnlyBookmarked ? filteredTranscriptData : transcriptData).map((segment, index) => {
                  const originalIndex = segment.originalIndex !== undefined ? segment.originalIndex : index;
                  const sentenceState = recordingStates[originalIndex] || {};
                  const isActive = currentSentenceIndex === originalIndex;
                  
                  return (
                    <div
                      key={index}
                      ref={isActive ? activeTranscriptItemRef : null}
                      className={`${styles.transcriptItem} ${isActive ? styles.transcriptItemActive : ''}`}
                    >
                      <div onClick={() => handleSentenceClick(segment.start, segment.end)} className={styles.transcriptItemRow}>
                        {/* Desktop: Play Button Circle - Left of text */}
                        <button
                          className={styles.sentencePlayButton}
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
                        
                        {/* Content area - flex grow */}
                        <div className={styles.transcriptContent}>
                          <div className={styles.transcriptText}>
                            {segment.text.split(/\s+/).map((word, idx) => {
                              const cleanWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
                              if (cleanWord.length > 0) {
                                return (
                                  <span
                                    key={idx}
                                    style={{ marginRight: '6px', whiteSpace: 'nowrap', display: 'inline-block' }}
                                  >
                                    {word}
                                  </span>
                                );
                              }
                              return <span key={idx} style={{ marginRight: '6px', whiteSpace: 'nowrap', display: 'inline-block' }}>{word}</span>;
                            })}
                          </div>
                        
                          {showIPA && segment.ipa && (
                            <div className={styles.transcriptIPA}>{segment.ipa}</div>
                          )}

                          {showTranslation && segment.translation && (
                            <div className={styles.transcriptTranslation}>{segment.translation}</div>
                          )}
                        </div>

                        {/* Right controls area - Score & Bookmark */}
                        <div className={styles.transcriptRightControls}>
                          {/* Score badge */}
                          {sentenceState.comparisonResult ? (
                            <div 
                              className={`${styles.scoreBadge} ${sentenceState.comparisonResult.isPassed ? styles.scoreBadgePassed : styles.scoreBadgeFailed}`}
                              title={sentenceState.comparisonResult.feedback}
                            >
                              {Math.round(sentenceState.comparisonResult.overallSimilarity)}%
                            </div>
                          ) : (
                            <div className={styles.scoreBadgePlaceholder}></div>
                          )}
                          
                          {/* Bookmark Button */}
                          <button
                            className={`${styles.bookmarkBtn} ${isBookmarked(originalIndex) ? styles.bookmarkBtnActive : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookmark(originalIndex);
                            }}
                            title={isBookmarked(originalIndex) ? 'Bỏ bookmark' : 'Thêm bookmark'}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked(originalIndex) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Loading indicator for word lookup */}
        {showWordLoading && (
          <>
            <style>{`
              @keyframes wordLoadingSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
            <div
              style={{
                position: 'fixed',
                top: `${loadingPosition.top}px`,
                left: `${loadingPosition.left}px`,
                transform: 'translateX(-50%)',
                zIndex: 10000,
                background: 'rgba(0, 0, 0, 0.85)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'wordLoadingSpin 0.6s linear infinite'
                }}
              />
              Loading...
            </div>
          </>
        )}

        {/* Dictionary Popup */}
        {showVocabPopup && (
          <DictionaryPopup
            word={selectedWord}
            position={popupPosition}
            arrowPosition={popupArrowPosition}
            lessonId={lessonId}
            context={transcriptData[currentSentenceIndex]?.text || ''}
            sentenceTranslation={transcriptData[currentSentenceIndex]?.translation || ''}
            transcriptData={transcriptData}
            onClose={() => {
              setShowVocabPopup(false);
              setClickedWordElement(null);
            }}
          />
        )}
      </div>
    </>
  );
};

export default ShadowingDesktop;
