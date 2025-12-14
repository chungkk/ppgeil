import React, { useState, useRef, useEffect } from 'react';
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
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  // Voice recording props
  currentSentence = null,
  onVoiceRecordingComplete = null,
  showRecordButton = true,
  // Refs for pausing playback
  audioRef = null,
  youtubePlayerRef = null,
  isYouTube = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const playbackAudioRef = useRef(null);

  // Calculate text similarity
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

  // Start recording
  const startRecording = async () => {
    try {
      // Pause video/audio before recording
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
        
        // Check for error messages
        const errorPhrases = [
          'Untertitelung aufgrund der Audioqualität nicht möglich',
          'Untertitel',
          'Bitte',
          'Danke',
        ];
        
        const isErrorMessage = errorPhrases.some(phrase => 
          transcribedText.toLowerCase().includes(phrase.toLowerCase())
        );
        
        if (!isErrorMessage && transcribedText.length > 2 && currentSentence) {
          const originalText = currentSentence.text || '';
          const { similarity, wordComparison } = calculateSimilarity(transcribedText, originalText);
          
          const result = {
            transcribed: transcribedText,
            original: originalText,
            similarity: similarity,
            isCorrect: similarity >= 80,
            wordComparison: wordComparison
          };
          
          if (onVoiceRecordingComplete) {
            onVoiceRecordingComplete(result);
          }
        } else {
          alert('Không thể nhận diện giọng nói. Vui lòng thử lại với âm thanh rõ hơn.');
        }
      } else {
        alert('Không thể nhận diện giọng nói');
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      alert('Lỗi xử lý âm thanh');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle recording
  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Play recorded audio
  const playRecording = () => {
    if (!recordedBlob) return;

    // If already playing, stop it
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
      setIsPlayingRecording(false);
      return;
    }

    const audioUrl = URL.createObjectURL(recordedBlob);
    const audio = new Audio(audioUrl);
    playbackAudioRef.current = audio;
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      playbackAudioRef.current = null;
      setIsPlayingRecording(false);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      playbackAudioRef.current = null;
      setIsPlayingRecording(false);
      alert('Lỗi phát lại audio');
    };

    audio.play();
    setIsPlayingRecording(true);
  };

  // Clear recorded blob when sentence changes
  useEffect(() => {
    setRecordedBlob(null);
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
      setIsPlayingRecording(false);
    }
  }, [currentSentence]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
        playbackAudioRef.current = null;
      }
    };
  }, []);
  return (
    <div className={styles.mobileBottomControls}>
      {/* Previous Sentence Button */}
      <button 
        className={`${styles.mobileControlBtn} ${styles.mobileControlBtnNav}`}
        onClick={onPrevious}
        disabled={!canGoPrevious}
        title="Previous"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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

      {/* Voice Recording Button */}
      {showRecordButton && (
        <button 
          className={`${styles.mobileControlBtn} ${styles.mobileControlBtnRecord} ${isRecording ? styles.recording : ''}`}
          onClick={handleRecordingToggle}
          disabled={isProcessing}
          title={isRecording ? 'Dừng ghi âm' : 'Ghi âm'}
        >
          {isProcessing ? (
            <svg className={styles.spinner} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </circle>
            </svg>
          ) : isRecording ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="7" y="7" width="10" height="10" rx="2"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1h2v1a5 5 0 0 0 10 0v-1h2z"/>
              <path d="M11 18h2v4h-2z"/>
              <path d="M8 22h8v2H8z"/>
            </svg>
          )}
        </button>
      )}

      {/* Playback Recording Button */}
      {showRecordButton && recordedBlob && (
        <button 
          className={`${styles.mobileControlBtn} ${styles.mobileControlBtnReplay} ${isPlayingRecording ? styles.playing : ''}`}
          onClick={playRecording}
          title={isPlayingRecording ? 'Dừng phát' : 'Phát lại bản ghi'}
        >
          {isPlayingRecording ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
      )}

      {/* Next Sentence Button */}
      <button 
        className={`${styles.mobileControlBtn} ${styles.mobileControlBtnNav}`}
        onClick={onNext}
        disabled={!canGoNext}
        title="Next"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default MobileBottomControls;
