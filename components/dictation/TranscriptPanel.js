import React, { useRef, useEffect, useCallback } from 'react';
import ProgressIndicator from '../ProgressIndicator';
import layoutStyles from '../../styles/dictationPage.module.css';
import transcriptStyles from '../../styles/dictation/dictationTranscript.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...transcriptStyles };

/**
 * Transcript Panel Component
 * Displays transcript list with progress indicator
 * 
 * CSS: Uses dictationTranscript.module.css for component-specific styles
 */
const TranscriptPanel = ({
  transcriptData,
  currentSentenceIndex,
  completedSentences,
  completedWords,
  checkedSentences,
  revealedHintWords,
  hidePercentage,
  difficultyLevel,
  dictationMode,
  studyTime,
  onSentenceClick,
  maskTextByPercentage,
  isShadowingMode = false
}) => {
  const transcriptSectionRef = useRef(null);
  const transcriptItemRefs = useRef({});

  // Auto-scroll to current sentence
  useEffect(() => {
    if (transcriptItemRefs.current[currentSentenceIndex] && transcriptSectionRef.current) {
      const container = transcriptSectionRef.current;
      const element = transcriptItemRefs.current[currentSentenceIndex];
      
      const elementOffsetTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const containerHeight = container.clientHeight;
      
      const scrollPosition = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2);
      
      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [currentSentenceIndex]);

  // Calculate total words for progress
  const calculateTotalWords = useCallback(() => {
    return transcriptData.reduce((sum, sentence) => {
      const words = sentence.text.split(/\s+/).filter(w => {
        const pureWord = w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        return pureWord.length >= 1;
      });
      return sum + words.length;
    }, 0);
  }, [transcriptData]);

  // Display indices in original order
  const transcriptDisplayIndices = transcriptData.map((_, idx) => idx);

  return (
    <div className={styles.rightSection}>
      <div className={styles.transcriptHeader}>
        <div className={styles.transcriptHeaderLeft}>
          <h3 className={styles.transcriptTitle}>Transcript</h3>
          <span className={styles.transcriptCounter}>
            <span className={styles.transcriptCounterCurrent}>{currentSentenceIndex + 1}</span>
            <span className={styles.transcriptCounterSeparator}>/</span>
            <span className={styles.transcriptCounterTotal}>{transcriptData.length}</span>
          </span>
        </div>
        <ProgressIndicator
          completedSentences={completedSentences}
          totalSentences={transcriptData.length}
          completedWords={completedWords}
          totalWords={calculateTotalWords()}
          difficultyLevel={difficultyLevel}
          hidePercentage={hidePercentage}
          studyTime={studyTime}
        />
      </div>
      
      <div className={styles.transcriptSection} ref={transcriptSectionRef}>
        <div className={styles.transcriptList}>
          {transcriptDisplayIndices.map((originalIndex) => {
            const segment = transcriptData[originalIndex];
            const isCompleted = completedSentences.includes(originalIndex);
            const sentenceWordsCompleted = completedWords[originalIndex] || {};
            const isChecked = checkedSentences.includes(originalIndex);
            
            const effectiveHidePercentage = dictationMode === 'full-sentence' ? 100 : hidePercentage;
            const sentenceRevealedWords = revealedHintWords[originalIndex] || {};
            // Show full text in shadowing mode, or when completed/checked
            const shouldShowFullText = isShadowingMode || isCompleted || (dictationMode === 'full-sentence' && isChecked);

            return (
              <div
                key={originalIndex}
                ref={(el) => {
                  transcriptItemRefs.current[originalIndex] = el;
                }}
                className={`${styles.transcriptItem} ${originalIndex === currentSentenceIndex ? styles.active : ''} ${!isCompleted ? styles.incomplete : ''}`}
                onClick={() => onSentenceClick(segment.start, segment.end)}
              >
                <div className={styles.transcriptItemNumber}>
                  #{originalIndex + 1}
                  {isCompleted && <span className={styles.completedCheck}>✓</span>}
                </div>
                <div className={styles.transcriptItemText}>
                  {shouldShowFullText 
                    ? segment.text 
                    : maskTextByPercentage(segment.text, originalIndex, effectiveHidePercentage, sentenceWordsCompleted, sentenceRevealedWords)
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TranscriptPanel;
