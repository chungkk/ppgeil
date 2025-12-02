import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpeechRecognition } from '../lib/hooks/useSpeechRecognition';
import styles from '../styles/VoiceInputButton.module.css';

/**
 * VoiceInputButton Component
 * Supports both Web Speech API and OpenAI Whisper API
 *
 * @param {Object} props
 * @param {Function} props.onTranscript - Callback when transcription is complete
 * @param {string} props.language - Language code (de-DE, vi-VN, etc.)
 * @param {'web-speech'|'whisper'} props.mode - Recognition mode
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Disable the button
 */
const VoiceInputButton = ({
  onTranscript,
  language = 'de-DE',
  mode = 'web-speech',
  className = '',
  disabled = false
}) => {
  const { t } = useTranslation('common');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Web Speech API hook
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: isSpeechSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    language: language,
    continuous: false,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal && onTranscript) {
        onTranscript(text);
      }
    },
    onError: (err) => {
      setError(err);
      setIsRecording(false);
    }
  });

  // Handle transcript from Web Speech API
  useEffect(() => {
    if (mode === 'web-speech' && transcript) {
      // Transcript is already handled in onResult callback
      resetTranscript();
    }
  }, [transcript, mode, resetTranscript]);

  // Process audio with Whisper API
  const processWhisperAudio = useCallback(async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: audioChunksRef.current[0]?.type || 'audio/webm'
      });

      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-input.webm');
      formData.append('language', language.split('-')[0]); // Extract language code (de from de-DE)

      // Send to API
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
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  }, [language, onTranscript, t]);

  // Start recording for Whisper mode
  const startWhisperRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine MIME type
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
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Process the recorded audio
        await processWhisperAudio();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(t('voiceRecorder.microphoneFailed'));
      setIsRecording(false);
    }
  }, [processWhisperAudio, t]);

  // Stop recording for Whisper mode
  const stopWhisperRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  }, [isRecording]);

  // Handle button click
  const handleClick = useCallback(() => {
    if (disabled) return;

    if (mode === 'web-speech') {
      // Web Speech API mode
      if (!isSpeechSupported) {
        setError(t('voiceRecorder.browserNotSupported'));
        return;
      }

      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    } else {
      // Whisper API mode
      if (isRecording) {
        stopWhisperRecording();
      } else {
        startWhisperRecording();
      }
    }
  }, [
    disabled,
    mode,
    isSpeechSupported,
    isListening,
    isRecording,
    startListening,
    stopListening,
    startWhisperRecording,
    stopWhisperRecording,
    t
  ]);

  const isActive = mode === 'web-speech' ? isListening : isRecording;

  return (
    <div className={`${styles.container} ${className}`}>
      <button
        className={`${styles.voiceButton} ${isActive ? styles.active : ''} ${isProcessing ? styles.processing : ''}`}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        title={isActive ? t('voiceRecorder.stopRecording') : t('voiceRecorder.startRecording')}
        type="button"
      >
        {isProcessing ? (
          <svg className={styles.spinner} width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="0">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        ) : isActive ? (
          <>
            <svg className={styles.micIcon} width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
              <path d="M12 18v4"/>
              <path d="M8 22h8"/>
            </svg>
            <span className={styles.pulse}></span>
          </>
        ) : (
          <svg className={styles.micIcon} width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <path d="M12 18v4"/>
            <path d="M8 22h8"/>
          </svg>
        )}
      </button>

      {/* Interim transcript display for Web Speech API */}
      {mode === 'web-speech' && interimTranscript && (
        <div className={styles.interimText}>
          {interimTranscript}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Mode indicator (optional, for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.modeIndicator}>
          {mode === 'web-speech' ? 'Web' : 'Whisper'}
        </div>
      )}
    </div>
  );
};

export default VoiceInputButton;
