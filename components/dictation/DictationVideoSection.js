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
  onSpeedChange,
  // Voice recording props
  currentSentence,
  onVoiceRecordingComplete,
  onComparisonResultChange,
  youtubePlayerRef,
  // Settings props
  showTranslation,
  onToggleTranslation,
  savedVocabularyCount,
  onShowVocabulary
}) => {
  const { t } = useTranslation();
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);
  const settingsRef = React.useRef(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [recordedBlob, setRecordedBlob] = React.useState(null);
  const [isPlayingRecording, setIsPlayingRecording] = React.useState(false);
  const [comparisonResult, setComparisonResult] = React.useState(null);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const playbackRef = React.useRef(null);

  // Close settings menu when clicking outside
  React.useEffect(() => {
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

  // Start recording
  const startRecording = async () => {
    try {
      // Pause video/audio before starting recording
      if (isPlaying) {
        if (isYouTube && youtubePlayerRef?.current) {
          youtubePlayerRef.current.pauseVideo();
        } else if (audioRef?.current) {
          audioRef.current.pause();
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: audioChunksRef.current[0]?.type || 'audio/webm'
        });
        setRecordedBlob(audioBlob);
        await processRecording(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setComparisonResult(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Không thể truy cập microphone');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  // Process recording with Whisper
  const processRecording = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-recording.webm');
      formData.append('language', 'de');

      const response = await fetch('/api/whisper-transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.text) {
        const transcribedText = data.text.trim();
        
        // Check for error messages from Whisper
        const errorPhrases = [
          'Untertitelung aufgrund der Audioqualität nicht möglich',
          'Untertitel',
          'Bitte',
          'Danke',
        ];
        
        const isErrorMessage = errorPhrases.some(phrase => 
          transcribedText.toLowerCase().includes(phrase.toLowerCase())
        );
        
        // Only show comparison if transcription is valid (not an error message and has reasonable length)
        if (!isErrorMessage && transcribedText.length > 2) {
          const originalText = currentSentence?.text || '';
          const { similarity, wordComparison } = calculateSimilarity(transcribedText, originalText);
          
          const result = {
            transcribed: transcribedText,
            original: originalText,
            similarity: similarity,
            isCorrect: similarity >= 80,
            wordComparison: wordComparison
          };
          
          setComparisonResult(result);
          
          // Notify parent component
          if (onComparisonResultChange) {
            onComparisonResultChange(result);
          }

          if (onVoiceRecordingComplete) {
            onVoiceRecordingComplete({
              transcribed: transcribedText,
              similarity: similarity,
              wordComparison: wordComparison
            });
          }
        } else {
          // Clear any previous results and show error
          setComparisonResult(null);
          if (onComparisonResultChange) {
            onComparisonResultChange(null);
          }
          alert('Không thể nhận diện giọng nói. Vui lòng thử lại với âm thanh rõ hơn.');
        }
      } else {
        setComparisonResult(null);
        alert('Không thể nhận diện giọng nói');
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setComparisonResult(null);
      alert('Lỗi xử lý âm thanh');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate text similarity and word-by-word comparison
  const calculateSimilarity = (transcribedText, originalText) => {
    const normalize = (str) => str.toLowerCase().trim().replace(/[.,!?;:"""''„]/g, '').replace(/\s+/g, ' ');
    const normalized1 = normalize(transcribedText);
    const normalized2 = normalize(originalText);
    
    const words1 = normalized1.split(' ').filter(w => w.length > 0);
    const words2 = normalized2.split(' ').filter(w => w.length > 0);
    
    // Word-by-word comparison
    const wordComparison = {};
    const maxLength = Math.max(words1.length, words2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const userWord = words1[i] || '';
      const correctWord = words2[i] || '';
      
      if (userWord && correctWord) {
        wordComparison[i] = userWord === correctWord ? 'correct' : 'incorrect';
      } else if (correctWord && !userWord) {
        wordComparison[i] = 'missing';
      }
    }
    
    // Calculate overall similarity
    let matches = 0;
    words1.forEach(word => {
      if (words2.includes(word)) {
        matches++;
      }
    });
    
    const similarity = maxLength > 0 ? Math.round((matches / maxLength) * 100) : 0;
    
    return { similarity, wordComparison };
  };

  // Play recorded audio
  const playRecordedAudio = () => {
    if (!recordedBlob) return;

    if (isPlayingRecording && playbackRef.current) {
      playbackRef.current.pause();
      playbackRef.current = null;
      setIsPlayingRecording(false);
      return;
    }

    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    playbackRef.current = audio;

    audio.onended = () => {
      setIsPlayingRecording(false);
      playbackRef.current = null;
      URL.revokeObjectURL(url);
    };

    audio.play();
    setIsPlayingRecording(true);
  };

  // Clear recording
  const clearRecording = () => {
    if (playbackRef.current) {
      playbackRef.current.pause();
      playbackRef.current = null;
    }
    setRecordedBlob(null);
    setComparisonResult(null);
    setIsPlayingRecording(false);
    
    // Notify parent to clear result
    if (onComparisonResultChange) {
      onComparisonResultChange(null);
    }
  };

  // Handle recording button click
  const handleRecordingClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

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

              {/* Voice Recording Button */}
              <button
                className={`${styles.controlBtn} ${styles.recordBtn} ${isRecording ? styles.recording : ''}`}
                onClick={handleRecordingClick}
                disabled={isProcessing}
                title={isRecording ? 'Dừng ghi âm' : 'Ghi âm'}
              >
                {isProcessing ? (
                  <svg className={styles.spinner} viewBox="0 0 24 24" width="20" height="20">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                ) : isRecording ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1h2v1a5 5 0 0 0 10 0v-1h2z"/>
                    <path d="M11 18h2v4h-2z"/>
                    <path d="M8 22h8v2H8z"/>
                  </svg>
                )}
              </button>

              {/* Playback recorded audio */}
              {recordedBlob && (
                <button
                  className={`${styles.controlBtn} ${styles.playbackRecordBtn}`}
                  onClick={playRecordedAudio}
                  title={isPlayingRecording ? 'Dừng phát' : 'Phát lại ghi âm'}
                >
                  {isPlayingRecording ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}

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

        {/* Settings Button (Mobile Only) - Below Video */}
        {isMobile && (
          <div className={styles.mobileSettingsContainer} ref={settingsRef}>
            <button 
              className={`${styles.settingsButtonMobile} ${showSettingsMenu ? styles.settingsButtonActive : ''}`}
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              title="Cài đặt"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span className={styles.settingsButtonText}>Cài đặt</span>
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
                    {savedVocabularyCount > 0 && (
                      <span className={styles.settingsMenuValue}>{savedVocabularyCount}</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DictationVideoSection;
