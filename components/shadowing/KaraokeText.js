import React, { useMemo } from 'react';
import styles from '../../styles/shadowingPage.module.css';

/**
 * KaraokeText - Renders text (karaoke highlight removed)
 */
const KaraokeText = ({
  segment,
  onWordClick,
  className = '',
}) => {
  const words = useMemo(() => {
    if (!segment?.text) return [];
    return segment.text.split(/\s+/);
  }, [segment?.text]);

  if (!segment || !words.length) {
    return null;
  }

  return (
    <div className={`${styles.currentSentenceText} ${className}`}>
      {words.map((word, idx) => {
        const cleanWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');

        if (cleanWord.length > 0) {
          return (
            <span
              key={idx}
              className={styles.word}
              style={{
                cursor: onWordClick ? 'pointer' : 'default',
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
          <span key={idx} className={styles.word}>
            {word}
          </span>
        );
      })}
    </div>
  );
};

export default KaraokeText;
