import { useState, useCallback, useMemo, useRef } from 'react';
import { hapticEvents } from '../haptics';

/**
 * Custom hook for sentence navigation in dictation mode
 * Handles navigation, touch swipe, keyboard shortcuts, and slide management
 */
export const useSentenceNavigation = ({
  transcriptData,
  completedSentences,
  onSentenceClick,
  onSeek,
  onPlayPause,
  isYouTube,
  duration,
  audioRef,
  youtubePlayerRef
}) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  
  // Touch swipe handling
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Track programmatic vs manual scroll
  const isProgrammaticScrollRef = useRef(false);

  // Sorted transcript indices (incomplete first, then completed)
  const sortedTranscriptIndices = useMemo(() => {
    if (!transcriptData || transcriptData.length === 0) return [];
    
    const indices = [...Array(transcriptData.length).keys()];
    
    // Sort: incomplete sentences first, then completed
    return indices.sort((a, b) => {
      const aCompleted = completedSentences.includes(a);
      const bCompleted = completedSentences.includes(b);
      
      if (aCompleted === bCompleted) return a - b; // Keep original order within group
      return aCompleted ? 1 : -1; // Incomplete first
    });
  }, [transcriptData, completedSentences]);

  // Mobile visible indices (all sentences in normal order)
  const mobileVisibleIndices = useMemo(() => {
    if (!transcriptData || transcriptData.length === 0) return [];
    return [...Array(transcriptData.length).keys()];
  }, [transcriptData]);

  // Lazy slide range for performance
  const lazySlideRange = useMemo(() => {
    if (mobileVisibleIndices.length === 0) {
      return { start: 0, end: 0 };
    }

    const currentSlideIndex = mobileVisibleIndices.indexOf(currentSentenceIndex);
    
    if (currentSlideIndex === -1) {
      return { start: 0, end: mobileVisibleIndices.length };
    }

    const start = Math.max(0, currentSlideIndex - 1);
    const end = Math.min(mobileVisibleIndices.length, currentSlideIndex + 2);

    return { start, end };
  }, [mobileVisibleIndices, currentSentenceIndex]);

  // Slides to render (lazy loaded)
  const lazySlidesToRender = useMemo(() => {
    return mobileVisibleIndices.slice(lazySlideRange.start, lazySlideRange.end);
  }, [mobileVisibleIndices, lazySlideRange]);

  // Go to previous sentence
  const goToPreviousSentence = useCallback(() => {
    const currentPositionInSorted = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    if (currentPositionInSorted > 0) {
      isProgrammaticScrollRef.current = true;

      const newIndex = sortedTranscriptIndices[currentPositionInSorted - 1];
      setCurrentSentenceIndex(newIndex);
      
      const item = transcriptData[newIndex];
      if (item && onSentenceClick) {
        onSentenceClick(item.start, item.end);
      }

      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    }
  }, [currentSentenceIndex, transcriptData, onSentenceClick, sortedTranscriptIndices]);

  // Go to next sentence
  const goToNextSentence = useCallback(() => {
    const currentPositionInSorted = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    if (currentPositionInSorted < sortedTranscriptIndices.length - 1) {
      isProgrammaticScrollRef.current = true;

      const newIndex = sortedTranscriptIndices[currentPositionInSorted + 1];
      setCurrentSentenceIndex(newIndex);
      
      const item = transcriptData[newIndex];
      if (item && onSentenceClick) {
        onSentenceClick(item.start, item.end);
      }

      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    }
  }, [currentSentenceIndex, transcriptData, onSentenceClick, sortedTranscriptIndices]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;

    if (isLeftSwipe) {
      e.preventDefault();
      hapticEvents.slideSwipe();
      goToNextSentence();
    } else if (isRightSwipe) {
      e.preventDefault();
      hapticEvents.slideSwipe();
      goToPreviousSentence();
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, goToNextSentence, goToPreviousSentence]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((event) => {
    const isMediaReady = isYouTube 
      ? (youtubePlayerRef?.current && duration > 0) 
      : (audioRef?.current && isFinite(audioRef.current.duration));

    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );

    switch (event.key) {
      case 'ArrowLeft':
        if (isMediaReady) {
          event.preventDefault();
          onSeek?.('backward');
        }
        break;
      case 'ArrowRight':
        if (isMediaReady) {
          event.preventDefault();
          onSeek?.('forward');
        }
        break;
      case ' ':
        if (isMediaReady && !isInputFocused) {
          event.preventDefault();
          onPlayPause?.();
        }
        break;
      case 'ArrowUp':
        if (!isInputFocused) {
          event.preventDefault();
          goToPreviousSentence();
        }
        break;
      case 'ArrowDown':
        if (!isInputFocused) {
          event.preventDefault();
          goToNextSentence();
        }
        break;
      default:
        break;
    }
  }, [isYouTube, duration, audioRef, youtubePlayerRef, onSeek, onPlayPause, goToPreviousSentence, goToNextSentence]);

  // Jump to sentence
  const jumpToSentence = useCallback((sentenceIndex) => {
    if (sentenceIndex < 0 || sentenceIndex >= transcriptData.length) return;
    
    isProgrammaticScrollRef.current = true;
    setCurrentSentenceIndex(sentenceIndex);
    
    const item = transcriptData[sentenceIndex];
    if (item && onSentenceClick) {
      onSentenceClick(item.start, item.end);
    }

    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 500);
  }, [transcriptData, onSentenceClick]);

  // Check if can go to next
  const canGoNext = useMemo(() => {
    const currentPositionInSorted = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    return currentPositionInSorted < sortedTranscriptIndices.length - 1;
  }, [currentSentenceIndex, sortedTranscriptIndices]);

  // Check if can go to previous
  const canGoPrevious = useMemo(() => {
    const currentPositionInSorted = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    return currentPositionInSorted > 0;
  }, [currentSentenceIndex, sortedTranscriptIndices]);

  return {
    // State
    currentSentenceIndex,
    setCurrentSentenceIndex,
    
    // Computed
    sortedTranscriptIndices,
    mobileVisibleIndices,
    lazySlideRange,
    lazySlidesToRender,
    canGoNext,
    canGoPrevious,
    
    // Navigation
    goToPreviousSentence,
    goToNextSentence,
    jumpToSentence,
    
    // Touch handling
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Keyboard
    handleKeyDown,
    
    // Refs
    isProgrammaticScrollRef
  };
};

export default useSentenceNavigation;
