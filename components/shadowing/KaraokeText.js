import React, { useMemo } from 'react';
import { useKaraokeHighlight } from '../../lib/hooks/useKaraokeHighlight';
import styles from '../../styles/shadowingPage.module.css';

/**
 * KaraokeText - Renders text with karaoke-style word highlighting
 */
const KaraokeText = ({
  segment,
  currentTime = 0,
  isPlaying = false,
  onWordClick,
  className = '',
}) => {
  const words = useMemo(() => {
    if (!segment?.text) return [];
    return segment.text.split(/\s+/);
  }, [segment?.text]);

  // Use karaoke highlight hook
  const { wordTimings, activeWordIndex, wordProgress } = useKaraokeHighlight(
    segment,
    currentTime,
    isPlaying,
    true // isActiveSentence - always true for main display
  );

  if (!segment || !words.length) {
    return null;
  }

  return (
    <div className={`${styles.currentSentenceText} ${className}`}>
      {words.map((word, idx) => {
        const cleanWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
        const isActive = isPlaying && idx === activeWordIndex;
        const isPassed = isPlaying && idx < activeWordIndex;
        const wordTiming = wordTimings[idx];
        const wordDuration = wordTiming ? (wordTiming.end - wordTiming.start) : 0.5;

        // Build class names
        const classNames = [
          styles.karaokeWord,
          isActive ? styles.active : '',
          isPassed ? styles.passed : '',
        ].filter(Boolean).join(' ');

        if (cleanWord.length > 0) {
          return (
            <span
              key={idx}
              className={classNames}
              style={{
                cursor: onWordClick ? 'pointer' : 'default',
                '--word-duration': `${wordDuration}s`,
              }}
              onClick={(e) => {
                if (onWordClick) {
                  e.stopPropagation();
                  onWordClick(word, e);
                }
              }}
            >
              {word}
            </span>
          );
        }
        
        return (
          <span key={idx} className={classNames}>
            {word}
          </span>
        );
      })}
    </div>
  );
};

export default KaraokeText;
