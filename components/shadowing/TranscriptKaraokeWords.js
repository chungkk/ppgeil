import React, { useMemo } from 'react';
import { useKaraokeHighlight } from '../../lib/hooks/useKaraokeHighlight';
import styles from '../../styles/shadowingPage.module.css';

/**
 * TranscriptKaraokeWords - Renders words in transcript list with karaoke highlighting
 */
const TranscriptKaraokeWords = ({
  segment,
  currentTime = 0,
  isPlaying = false,
  isActiveSentence = false,
  onWordClick,
}) => {
  const words = useMemo(() => {
    if (!segment?.text) return [];
    return segment.text.split(/\s+/);
  }, [segment?.text]);

  // Use karaoke highlight hook
  const { wordTimings, activeWordIndex } = useKaraokeHighlight(
    segment,
    currentTime,
    isPlaying,
    isActiveSentence
  );

  if (!segment || !words.length) {
    return null;
  }

  return (
    <>
      {words.map((word, idx) => {
        const cleanWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
        const isActive = isPlaying && isActiveSentence && idx === activeWordIndex;
        const isPassed = isPlaying && isActiveSentence && idx < activeWordIndex;
        const wordTiming = wordTimings[idx];
        const wordDuration = wordTiming ? (wordTiming.end - wordTiming.start) : 0.3;

        // Build class names for inline karaoke
        const classNames = [
          styles.karaokeWordInline,
          isActive ? styles.activeInline : '',
          isPassed ? styles.passedInline : '',
        ].filter(Boolean).join(' ');

        if (cleanWord.length > 0) {
          return (
            <span
              key={idx}
              className={classNames}
              style={{
                marginRight: '6px',
                whiteSpace: 'nowrap',
                display: 'inline-block',
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
          <span 
            key={idx}
            className={classNames}
            style={{ 
              marginRight: '6px', 
              whiteSpace: 'nowrap', 
              display: 'inline-block' 
            }}
          >
            {word}
          </span>
        );
      })}
    </>
  );
};

export default TranscriptKaraokeWords;
