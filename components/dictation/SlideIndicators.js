import React, { memo } from 'react';
import styles from '../../styles/dictation/dictationMobile.module.css';

/**
 * SlideIndicators - Dots indicator for mobile slide navigation
 * Shows current position and allows quick jumping to specific slides
 */
const SlideIndicators = memo(({
  totalSlides,
  currentIndex,
  completedSentences = [],
  onDotClick
}) => {
  // Limit to show max 15 dots to avoid overflow on small screens
  const maxDots = 15;
  const shouldTruncate = totalSlides > maxDots;
  
  // Calculate which dots to show
  const getVisibleIndices = () => {
    if (!shouldTruncate) {
      return Array.from({ length: totalSlides }, (_, i) => i);
    }
    
    // Show dots around current index
    const halfRange = Math.floor(maxDots / 2);
    let start = Math.max(0, currentIndex - halfRange);
    let end = Math.min(totalSlides, start + maxDots);
    
    // Adjust if we're near the end
    if (end === totalSlides) {
      start = Math.max(0, end - maxDots);
    }
    
    return Array.from({ length: end - start }, (_, i) => start + i);
  };
  
  const visibleIndices = getVisibleIndices();
  const showStartEllipsis = shouldTruncate && visibleIndices[0] > 0;
  const showEndEllipsis = shouldTruncate && visibleIndices[visibleIndices.length - 1] < totalSlides - 1;
  
  const handleDotClick = (index) => {
    if (onDotClick) {
      onDotClick(index);
    }
  };
  
  return (
    <div className={styles.slideIndicators}>
      {/* Start ellipsis */}
      {showStartEllipsis && (
        <div 
          className={styles.slideIndicatorDot}
          style={{ width: '8px', cursor: 'default', opacity: 0.5 }}
        >
          ...
        </div>
      )}
      
      {/* Visible dots */}
      {visibleIndices.map((index) => {
        const isActive = index === currentIndex;
        const isCompleted = completedSentences.includes(index);
        
        return (
          <div
            key={index}
            className={`${styles.slideIndicatorDot} ${
              isActive ? styles.slideIndicatorDotActive : ''
            } ${isCompleted && !isActive ? styles.slideIndicatorDotCompleted : ''}`}
            onClick={() => handleDotClick(index)}
            aria-label={`Slide ${index + 1}${isActive ? ' (current)' : ''}${isCompleted ? ' (completed)' : ''}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDotClick(index);
              }
            }}
          />
        );
      })}
      
      {/* End ellipsis */}
      {showEndEllipsis && (
        <div 
          className={styles.slideIndicatorDot}
          style={{ width: '8px', cursor: 'default', opacity: 0.5 }}
        >
          ...
        </div>
      )}
    </div>
  );
});

SlideIndicators.displayName = 'SlideIndicators';

export default SlideIndicators;
