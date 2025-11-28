import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for Web Speech API
 * Supports multiple languages including German
 */
export const useSpeechRecognition = ({
  language = 'de-DE',
  continuous = false,
  interimResults = true,
  onResult,
  onError
} = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = continuous;
        recognitionRef.current.interimResults = interimResults;
        recognitionRef.current.lang = language;

        // Handle results
        recognitionRef.current.onresult = (event) => {
          let interimText = '';
          let finalText = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript;
            } else {
              interimText += transcript;
            }
          }

          if (finalText) {
            setTranscript(finalText);
            setInterimTranscript('');
            if (onResult) {
              onResult(finalText, true);
            }
          } else if (interimText) {
            setInterimTranscript(interimText);
            if (onResult) {
              onResult(interimText, false);
            }
          }
        };

        // Handle errors
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setError(event.error);
          setIsListening(false);
          isListeningRef.current = false;

          if (onError) {
            onError(event.error);
          }
        };

        // Handle end
        recognitionRef.current.onend = () => {
          setIsListening(false);
          isListeningRef.current = false;
        };
      }
    }

    return () => {
      if (recognitionRef.current && isListeningRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
    };
  }, [language, continuous, interimResults, onResult, onError]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      const errorMsg = 'Speech recognition is not supported in this browser';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (recognitionRef.current && !isListeningRef.current) {
      try {
        setTranscript('');
        setInterimTranscript('');
        setError(null);
        recognitionRef.current.start();
        setIsListening(true);
        isListeningRef.current = true;
      } catch (e) {
        console.error('Error starting recognition:', e);
        setError(e.message);
        if (onError) onError(e.message);
      }
    }
  }, [isSupported, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
  }, []);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Change language
  const setLanguage = useCallback((newLanguage) => {
    if (recognitionRef.current) {
      const wasListening = isListeningRef.current;
      if (wasListening) {
        stopListening();
      }
      recognitionRef.current.lang = newLanguage;
      if (wasListening) {
        setTimeout(() => startListening(), 100);
      }
    }
  }, [startListening, stopListening]);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setLanguage
  };
};
