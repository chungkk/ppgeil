import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/ShadowingVoiceRecorder.module.css';

/**
 * Voice Recorder Component for Shadowing Practice
 * Uses Whisper API for transcription
 *
 * @param {Object} props
 * @param {Function} props.onTranscript - Callback when transcription is complete
 * @param {Function} props.onAudioRecorded - Callback when audio is recorded (returns blob)
 * @param {string} props.language - Language code (de-DE, vi-VN, etc.)
 * @param {string} props.size - Size variant: 'small' (inline) or 'large' (bottom bar)
 * @param {Function} props.onRecordingStateChange - Callback when recording state changes
 */
const ShadowingVoiceRecorder = ({
  onTranscript,
  onAudioRecorded,
  language = 'de-DE',
  size = 'small',
  onRecordingStateChange,
  triggerAttribute = null
}) => {
  const { t } = useTranslation('common');
  const [internalIsRecording, setInternalIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [internalIsProcessing, setInternalIsProcessing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);

  // Always use internal state for UI
  const isRecording = internalIsRecording;
  const isProcessing = internalIsProcessing;

  const updateRecordingState = useCallback((value) => {
    setInternalIsRecording(value);
    if (onRecordingStateChange) {
      onRecordingStateChange({ isRecording: value, isProcessing: internalIsProcessing });
    }
  }, [onRecordingStateChange, internalIsProcessing]);

  const updateProcessingState = useCallback((value) => {
    setInternalIsProcessing(value);
    if (onRecordingStateChange) {
      onRecordingStateChange({ isRecording: internalIsRecording, isProcessing: value });
    }
  }, [onRecordingStateChange, internalIsRecording]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordedBlob(null);
      audioChunksRef.current = [];

      // Check if browser supports required APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(t('voiceRecorder.browserNotSupported'));
        return;
      }

      // Check for HTTPS on iOS Safari (required for getUserMedia)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

      if (isIOS && !isSecure) {
        setError(t('voiceRecorder.iosHttpsRequired'));
        return;
      }

      // Check if MediaRecorder is supported
      if (typeof MediaRecorder === 'undefined') {
        setError(t('voiceRecorder.recordingNotSupported'));
        return;
      }

      // Pause audio/video when starting recording so user can speak clearly
      if (typeof window !== 'undefined') {
        // Pause YouTube player
        if (window.mainYoutubePlayerRef?.current) {
          const player = window.mainYoutubePlayerRef.current;
          if (player.pauseVideo && player.getPlayerState && player.getPlayerState() === window.YT?.PlayerState?.PLAYING) {
            player.pauseVideo();
          }
        }
        // Pause audio player
        if (window.mainAudioRef?.current) {
          const audio = window.mainAudioRef.current;
          if (!audio.paused) {
            audio.pause();
          }
        }
      }

      // Start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Create blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: audioChunksRef.current[0]?.type || 'audio/webm'
        });
        setRecordedBlob(audioBlob);

        if (onAudioRecorded) {
          onAudioRecorded(audioBlob);
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      updateRecordingState(true);
    } catch (err) {
      console.error('Error starting recording:', err);

      // Provide translated error messages based on error type
      let errorMessage = t('voiceRecorder.microphoneFailed');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = t('voiceRecorder.microphoneDenied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = t('voiceRecorder.noMicrophoneFound');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = t('voiceRecorder.microphoneInUse');
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage = t('voiceRecorder.microphoneSettingsNotSupported');
      } else if (err.name === 'SecurityError') {
        errorMessage = t('voiceRecorder.httpsRequired');
      }

      setError(errorMessage);
      updateRecordingState(false);
    }
  }, [onAudioRecorded, updateRecordingState, t]);

  // Process audio with Whisper API
  const processWhisperAudio = useCallback(async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: audioChunksRef.current[0]?.type || 'audio/webm'
      });

      const formData = new FormData();
      formData.append('audio', audioBlob, 'shadowing-voice.webm');
      formData.append('language', language.split('-')[0]);

      const response = await fetch('/api/whisper-transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.text) {
        if (onTranscript) {
          onTranscript(data.text);
        }
        setError(null);
      } else {
        setError(data.message || t('voiceRecorder.transcriptionFailed'));
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(t('voiceRecorder.audioProcessingError'));
    } finally {
      updateProcessingState(false);
    }
  }, [language, onTranscript, updateProcessingState, t]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    updateRecordingState(false);

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Process the recorded audio with Whisper
    updateProcessingState(true);

    // Wait for blob to be ready
    setTimeout(async () => {
      if (audioChunksRef.current.length > 0) {
        await processWhisperAudio();
      }
    }, 100);
  }, [processWhisperAudio, updateRecordingState, updateProcessingState]);

  // Handle button click
  const handleButtonClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const buttonProps = triggerAttribute ? { [triggerAttribute]: true } : {};

  // Unified style for desktop control bar
  if (size === 'unified') {
    return (
      <button
        className={`${styles.unifiedRecordBtn} ${isRecording ? styles.unifiedRecording : ''} ${isProcessing ? styles.unifiedProcessing : ''}`}
        onClick={handleButtonClick}
        disabled={isProcessing}
        type="button"
        title={error ? error : (isProcessing ? t('voiceRecorder.processing') : isRecording ? t('voiceRecorder.stopRecording') : t('voiceRecorder.record'))}
        data-label={t('voiceRecorder.record')}
      >
        {isProcessing ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
          </svg>
        ) : isRecording ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <path d="M12 18v4"/>
            <path d="M8 22h8"/>
          </svg>
        )}
      </button>
    );
  }

  // Mobile style - circular button matching mobile control bar
  if (size === 'mobile') {
    return (
      <button
        className={`${styles.mobileRecordBtn} ${isRecording ? styles.mobileRecording : ''} ${isProcessing ? styles.mobileProcessing : ''}`}
        onClick={handleButtonClick}
        disabled={isProcessing}
        type="button"
      >
        {isProcessing ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
          </svg>
        ) : isRecording ? (
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <path d="M12 18v4"/>
            <path d="M8 22h8"/>
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className={`${styles.container} ${size === 'large' ? styles.containerLarge : ''}`}>
      <button
        className={`${styles.recordButton} ${size === 'large' ? styles.recordButtonLarge : ''} ${isRecording ? styles.recording : ''} ${isProcessing ? styles.processing : ''} ${error ? styles.error : ''}`}
        onClick={handleButtonClick}
        disabled={isProcessing}
        type="button"
        title={error ? error : (isProcessing ? t('voiceRecorder.processing') : isRecording ? t('voiceRecorder.stopRecording') : t('voiceRecorder.startRecording'))}
        {...buttonProps}
      >
        {isProcessing ? (
          <>
            <span className={styles.spinner}>
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"/>
              </svg>
            </span>
            {size === 'large' && <span>{t('voiceRecorder.processing')}</span>}
          </>
        ) : isRecording ? (
          <>
            <span className={styles.stopIcon}>
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </span>
            {size === 'large' && <span>{t('voiceRecorder.stopRecording')}</span>}
          </>
        ) : (
          <>
            <span className={styles.micIcon}>
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                <path d="M12 18v4"/>
                <path d="M8 22h8"/>
              </svg>
            </span>
            {size === 'large' && <span>{t('voiceRecorder.record')}</span>}
          </>
        )}
      </button>
    </div>
  );
};

export default ShadowingVoiceRecorder;
