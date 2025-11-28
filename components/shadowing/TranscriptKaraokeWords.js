import React, { useMemo } from 'react';
import styles from '../../styles/shadowingPage.module.css';

/**
 * TranscriptKaraokeWords - Renders words in transcript list (karaoke highlight removed)
 */
const TranscriptKaraokeWords = ({
  segment,
  onWordClick,
}) => {
  const words = useMemo(() => {
    if (!segment?.text) return [];
    return segment.text.split(/\s+/);
  }, [segment?.text]);

  if (!segment || !words.length) {
    return null;
  }

  return (
    <>
      {words.map((word, idx) => {
        const cleanWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');

        if (cleanWord.length > 0) {
          return (
            <span
              key={idx}
              className={styles.word}
              style={{
                marginRight: '6px',
                whiteSpace: 'nowrap',
                display: 'inline-block',
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
            className={styles.word}
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
