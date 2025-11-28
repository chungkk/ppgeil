import { useRef, useCallback } from 'react';

/**
 * Hook to manage audio playback for recorded audio blobs
 * @param {Object} options
 * @param {Function} options.onPlayStart - Callback when playback starts
 * @param {Function} options.onPlayEnd - Callback when playback ends
 * @param {Function} options.onPlayError - Callback when playback errors
 * @returns {Object}
 */
export const useAudioPlayback = ({
  onPlayStart,
  onPlayEnd,
  onPlayError,
} = {}) => {
  const audioRef = useRef(null);
  const currentUrlRef = useRef(null);

  // Stop current playback
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
  }, []);

  // Check if currently playing
  const isPlaying = useCallback(() => {
    return audioRef.current !== null;
  }, []);

  // Play audio from blob
  const playAudioBlob = useCallback((audioBlob, sentenceIndex) => {
    if (!audioBlob) return false;

    // If already playing, stop it
    if (audioRef.current) {
      stopPlayback();
      onPlayEnd?.(sentenceIndex);
      return false;
    }

    // Create audio URL and play
    const audioUrl = URL.createObjectURL(audioBlob);
    currentUrlRef.current = audioUrl;
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentUrlRef.current = null;
      audioRef.current = null;
      onPlayEnd?.(sentenceIndex);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      currentUrlRef.current = null;
      audioRef.current = null;
      onPlayError?.(sentenceIndex);
    };

    audio.play();
    onPlayStart?.(sentenceIndex);
    return true;
  }, [stopPlayback, onPlayStart, onPlayEnd, onPlayError]);

  return {
    playAudioBlob,
    stopPlayback,
    isPlaying,
  };
};

export default useAudioPlayback;
