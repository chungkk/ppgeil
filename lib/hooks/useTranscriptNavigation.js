import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to manage transcript navigation and auto-scroll
 * @param {Object} options
 * @param {number} options.totalSentences - Total number of sentences
 * @returns {Object}
 */
export const useTranscriptNavigation = ({ totalSentences = 0 } = {}) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  
  // Refs for scroll management
  const activeTranscriptItemRef = useRef(null);
  const transcriptListRef = useRef(null);
  const observerRef = useRef(null);
  const isActiveVisibleRef = useRef(true);

  // Setup IntersectionObserver for active transcript item
  useEffect(() => {
    if (!transcriptListRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isActiveVisibleRef.current = entry.isIntersecting;
        });
      },
      {
        root: transcriptListRef.current,
        rootMargin: '-50px 0px -50px 0px',
        threshold: 0.5
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Observe active item when it changes
  useEffect(() => {
    const observer = observerRef.current;
    const activeItem = activeTranscriptItemRef.current;

    if (observer && activeItem) {
      observer.disconnect();
      observer.observe(activeItem);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [currentSentenceIndex]);

  // Scroll to active sentence
  const scrollToActiveSentence = useCallback((force = false) => {
    const activeItem = activeTranscriptItemRef.current;
    const container = transcriptListRef.current;

    if (!activeItem || !container) return;

    // Always scroll when sentence changes (force = true by default from auto-scroll)
    // Or when explicitly forced, or when not visible
    if (force || !isActiveVisibleRef.current) {
      // Calculate optimal scroll position to center the active sentence
      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();

      const containerScrollTop = container.scrollTop;
      const itemOffsetTop = itemRect.top - containerRect.top + containerScrollTop;
      const containerHeight = container.clientHeight;
      const itemHeight = activeItem.offsetHeight;

      // Position the active sentence in the upper third of the container
      // This makes it more comfortable to read (not exactly center, but higher up)
      const targetScrollTop = itemOffsetTop - (containerHeight / 3) + (itemHeight / 2);

      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  }, []);

  // Auto-scroll when sentence changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Always force scroll when sentence index changes
      scrollToActiveSentence(true);
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [currentSentenceIndex, scrollToActiveSentence]);

  // Go to specific sentence
  const goToSentence = useCallback((index) => {
    if (index >= 0 && index < totalSentences) {
      setCurrentSentenceIndex(index);
      return true;
    }
    return false;
  }, [totalSentences]);

  // Go to next sentence
  const goToNextSentence = useCallback(() => {
    if (currentSentenceIndex < totalSentences - 1) {
      const newIndex = currentSentenceIndex + 1;
      setCurrentSentenceIndex(newIndex);
      return newIndex;
    }
    return null;
  }, [currentSentenceIndex, totalSentences]);

  // Go to previous sentence
  const goToPreviousSentence = useCallback(() => {
    if (currentSentenceIndex > 0) {
      const newIndex = currentSentenceIndex - 1;
      setCurrentSentenceIndex(newIndex);
      return newIndex;
    }
    return null;
  }, [currentSentenceIndex]);

  // Check if can go next/previous
  const canGoNext = currentSentenceIndex < totalSentences - 1;
  const canGoPrevious = currentSentenceIndex > 0;

  return {
    // State
    currentSentenceIndex,
    setCurrentSentenceIndex,
    
    // Refs
    activeTranscriptItemRef,
    transcriptListRef,
    
    // Navigation
    goToSentence,
    goToNextSentence,
    goToPreviousSentence,
    canGoNext,
    canGoPrevious,
    
    // Scroll
    scrollToActiveSentence,
    isActiveVisibleRef
  };
};

export default useTranscriptNavigation;
