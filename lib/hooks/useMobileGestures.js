import { useState, useCallback, useRef } from 'react';
import { hapticEvents } from '../haptics';

/**
 * Hook for managing mobile touch/swipe gestures
 * Handles swipe navigation between sentences
 */
const useMobileGestures = ({
  goToNextSentence,
  goToPreviousSentence,
  isProgrammaticScrollRef
}) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

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
      
      // Mark as programmatic to prevent scroll handler interference
      if (isProgrammaticScrollRef) {
        isProgrammaticScrollRef.current = true;
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 500);
      }
      
      goToNextSentence();
    } else if (isRightSwipe) {
      e.preventDefault();
      hapticEvents.slideSwipe();
      
      if (isProgrammaticScrollRef) {
        isProgrammaticScrollRef.current = true;
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 500);
      }
      
      goToPreviousSentence();
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, goToNextSentence, goToPreviousSentence, isProgrammaticScrollRef]);

  return {
    touchStart,
    touchEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};

export default useMobileGestures;
