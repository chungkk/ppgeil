import { useEffect } from 'react';

/**
 * Hook to expose functions to window object for dynamic HTML event handlers
 * These functions are called from dynamically generated HTML (innerHTML)
 * via onclick, oninput, etc. Since the HTML is created as strings, we can't
 * use React event handlers directly.
 */
const useWindowGlobals = ({
  audioRef,
  youtubePlayerRef,
  checkWord,
  handleInputClick,
  handleInputFocus,
  handleInputBlur,
  saveWord,
  showHint,
  showHintFromInput,
  handleWordClickForPopup,
  showPointsAnimation
}) => {
  // Expose audio refs globally for components to pause when speaking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.mainAudioRef = audioRef;
    window.mainYoutubePlayerRef = youtubePlayerRef;
    
    return () => {
      window.mainAudioRef = null;
      window.mainYoutubePlayerRef = null;
    };
  }, [audioRef, youtubePlayerRef]);

  // Expose dictation functions for dynamic HTML handlers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.checkWord = checkWord;
    window.handleInputClick = handleInputClick;
    window.handleInputFocus = handleInputFocus;
    window.handleInputBlur = handleInputBlur;
    window.saveWord = saveWord;
    window.showHint = showHint;
    window.showHintFromInput = showHintFromInput;
    window.handleWordClickForPopup = handleWordClickForPopup;
    window.showPointsAnimation = showPointsAnimation;
    window.disableArrowKeys = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    };

    return () => {
      window.checkWord = null;
      window.handleInputClick = null;
      window.handleInputFocus = null;
      window.handleInputBlur = null;
      window.saveWord = null;
      window.showHint = null;
      window.showHintFromInput = null;
      window.handleWordClickForPopup = null;
      window.showPointsAnimation = null;
      window.disableArrowKeys = null;
    };
  }, [
    checkWord,
    handleInputClick,
    handleInputFocus,
    handleInputBlur,
    saveWord,
    showHint,
    showHintFromInput,
    handleWordClickForPopup,
    showPointsAnimation
  ]);
};

export default useWindowGlobals;
