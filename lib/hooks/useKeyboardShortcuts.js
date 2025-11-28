import { useCallback, useEffect } from 'react';

/**
 * Hook for managing keyboard shortcuts
 * Handles play/pause, seek, and navigation shortcuts
 */
const useKeyboardShortcuts = ({
  isYouTube,
  youtubePlayerRef,
  audioRef,
  duration,
  handleSeek,
  handlePlayPause,
  goToPreviousSentence,
  goToNextSentence
}) => {
  // Global keyboard shortcuts handler
  const handleGlobalKeyDown = useCallback((event) => {
    const isMediaReady = isYouTube 
      ? (youtubePlayerRef?.current && duration > 0) 
      : (audioRef?.current && isFinite(audioRef.current.duration));

    // Check if focus is on an input field
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );

    switch (event.key) {
      case 'ArrowLeft':
        // Arrow left for seek backward (works even when input is focused)
        if (isMediaReady) {
          event.preventDefault();
          handleSeek('backward');
        }
        break;
      case 'ArrowRight':
        // Arrow right for seek forward (works even when input is focused)
        if (isMediaReady) {
          event.preventDefault();
          handleSeek('forward');
        }
        break;
      case ' ':
        // Space for play/pause (only when NOT focused on input)
        if (isMediaReady && !isInputFocused) {
          event.preventDefault();
          handlePlayPause();
        }
        break;
      case 'ArrowUp':
        // Arrow up for previous sentence
        if (!isInputFocused) {
          event.preventDefault();
          goToPreviousSentence();
        }
        break;
      case 'ArrowDown':
        // Arrow down for next sentence
        if (!isInputFocused) {
          event.preventDefault();
          goToNextSentence();
        }
        break;
      default:
        break;
    }
  }, [handleSeek, handlePlayPause, goToPreviousSentence, goToNextSentence, isYouTube, youtubePlayerRef, audioRef, duration]);

  // Attach/detach keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Disable arrow keys in inputs (prevent cursor movement)
  const disableArrowKeys = useCallback((e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  }, []);

  return {
    handleGlobalKeyDown,
    disableArrowKeys
  };
};

export default useKeyboardShortcuts;
