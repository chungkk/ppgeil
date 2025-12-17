import React from 'react';
import styles from '../../styles/dictation/slideLoading.module.css';

/**
 * SlideLoadingPlaceholder - Beautiful loading state for dictation slides
 * 
 * Features:
 * - Shimmer animation with gradient
 * - Content-aware skeleton (matches real slide layout)
 * - Smooth fade-in when content loads
 * - Glass morphism design
 */

const SlideLoadingPlaceholder = ({ mode = 'fill-blanks' }) => {
  return (
    <div className={styles.loadingSlide}>
      {/* Shimmer overlay */}
      <div className={styles.shimmerOverlay} />

      {mode === 'fill-blanks' ? (
        <div className={styles.fillBlanksLoading}>
          {/* Simulate word input boxes with varying widths */}
          <div className={styles.wordRow}>
            {[60, 85, 45, 95, 55, 70].map((width, i) => (
              <div key={i} className={styles.wordBox} style={{ width: `${width}px` }}>
                <div className={styles.hintBubble} />
                <div className={styles.inputBox} />
              </div>
            ))}
          </div>
          <div className={styles.wordRow}>
            {[75, 50, 90, 65, 80].map((width, i) => (
              <div key={i} className={styles.wordBox} style={{ width: `${width}px` }}>
                <div className={styles.hintBubble} />
                <div className={styles.inputBox} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.fullSentenceLoading}>
          {/* Full sentence mode placeholder */}
          <div className={styles.sentenceDisplay}>
            <div className={styles.sentenceLine} style={{ width: '90%' }} />
            <div className={styles.sentenceLine} style={{ width: '75%' }} />
          </div>
          <div className={styles.inputArea} />
          <div className={styles.actionButtons}>
            <div className={styles.button} />
            <div className={styles.button} />
          </div>
        </div>
      )}

      {/* Loading pulse indicator */}
      <div className={styles.pulseIndicator}>
        <div className={styles.pulse} />
        <div className={styles.pulse} style={{ animationDelay: '0.2s' }} />
        <div className={styles.pulse} style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
};

/**
 * SlideTransition - Wrapper for smooth fade-in when content loads
 */
export const SlideTransition = ({ children, isLoading, index = 0 }) => {
  return (
    <div 
      className={`${styles.slideTransition} ${isLoading ? '' : styles.slideTransitionLoaded}`}
      style={{ 
        animationDelay: `${index * 50}ms` // Stagger animation
      }}
    >
      {isLoading ? <SlideLoadingPlaceholder /> : children}
    </div>
  );
};

export default SlideLoadingPlaceholder;
