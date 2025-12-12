import React, { memo } from 'react';
import { renderCompletedSentenceWithWordBoxes } from '../../lib/dictationUtils';
import layoutStyles from '../../styles/dictationPage.module.css';
import fullSentenceStyles from '../../styles/dictation/dictationFullSentence.module.css';
import mobileStyles from '../../styles/dictation/dictationMobile.module.css';

// Merge styles
const styles = { ...layoutStyles, ...fullSentenceStyles, ...mobileStyles };

/**
 * DictationMobileSlide - A single slide for mobile dictation view
 * Extracted from the main dictation page to reduce complexity
 */
const DictationMobileSlide = memo(({
  // Slide identification
  originalIndex,
  arrayIndex,
  lazySlideRangeStart,
  
  // Sentence data
  sentence,
  isCompleted,
  isActive,
  currentSentenceIndex,
  
  // State data
  revealedHintWords,
  wordComparisonResults,
  partialRevealedChars,
  fullSentenceInputs,
  sortedTranscriptIndices,
  learningMode = 'dictation',
  showTranslation = false,
  
  // Event handlers
  onSlideClick,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onHintWordClick,
  onWordClickForPopup,
  onInputChange,
  onCheckSubmit,
  onNextClick,
  
  // Utilities
  calculatePartialReveals,
  t
}) => {
  // Handle slide click (for inactive slides)
  const handleSlideClick = () => {
    if (!isActive && onSlideClick) {
      onSlideClick(originalIndex, sentence);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    onInputChange(originalIndex, value);
    calculatePartialReveals(originalIndex, value, sentence.text);
  };

  // Handle key down (Enter to submit)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCheckSubmit(originalIndex);
    }
  };

  // Handle check button click
  const handleCheckClick = (e) => {
    e.stopPropagation();
    onCheckSubmit(originalIndex);
  };

  // Handle next button click
  const handleNextClick = (e) => {
    e.stopPropagation();
    onNextClick();
  };

  // Check if next button should be disabled
  const isNextDisabled = sortedTranscriptIndices.indexOf(currentSentenceIndex) >= sortedTranscriptIndices.length - 1;

  // Helper function to get adaptive size class based on word length
  const getWordSizeClass = (wordLength) => {
    if (wordLength <= 3) return styles.hintWordBoxShort;
    if (wordLength <= 6) return styles.hintWordBoxMedium;
    if (wordLength <= 10) return styles.hintWordBoxLong;
    return styles.hintWordBoxXLong;
  };

  return (
    <div
      key={originalIndex}
      data-slide-index={lazySlideRangeStart + arrayIndex}
      className={`${styles.dictationSlide} ${isActive ? styles.dictationSlideActive : ''}`}
      onClick={handleSlideClick}
    >
      {isCompleted && (
        <div className={styles.slideHeader}>
          <span className={styles.slideCompleted}>✓</span>
        </div>
      )}

      {/* Full Sentence Mode */}
      <div
        className={styles.fullSentenceMode}
        onTouchStart={isActive ? onTouchStart : undefined}
        onTouchMove={isActive ? onTouchMove : undefined}
        onTouchEnd={isActive ? onTouchEnd : undefined}
      >
        <div className={styles.fullSentenceDisplay}>
          {learningMode === 'shadowing' ? (
            // Shadowing mode: show full text
            <div className={styles.shadowingText}>
              {sentence.text}
            </div>
          ) : isCompleted ? (
            <div 
              className={styles.dictationInputArea}
              dangerouslySetInnerHTML={{ __html: renderCompletedSentenceWithWordBoxes(sentence.text) }}
            />
          ) : (
            <div className={styles.hintSentenceText} data-sentence-index={originalIndex}>
              {sentence.text.split(/\s+/).filter(w => w.length > 0).map((word, idx) => {
                const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
                const punctuation = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");

                if (pureWord.length === 0) return null;

                const isRevealed = revealedHintWords[originalIndex]?.[idx];
                const comparisonResult = wordComparisonResults[originalIndex]?.[idx];
                const partialCount = partialRevealedChars[originalIndex]?.[idx] || 0;

                // Get adaptive size class based on word length
                const sizeClass = getWordSizeClass(pureWord.length);

                const wordClass = comparisonResult
                  ? (comparisonResult === 'correct' ? styles.hintWordCorrect : styles.hintWordIncorrect)
                  : (isRevealed ? styles.hintWordRevealed : (partialCount > 0 ? styles.hintWordPartial : ''));

                let displayText;
                if (comparisonResult || isRevealed) {
                  displayText = pureWord;
                } else if (partialCount > 0) {
                  displayText = pureWord.substring(0, partialCount) + '\u00A0'.repeat(pureWord.length - partialCount);
                } else {
                  displayText = '\u00A0'.repeat(pureWord.length);
                }

                return (
                  <span key={idx} className={styles.hintWordContainer}>
                    <span
                      className={`${styles.hintWordBox} ${sizeClass} ${wordClass}`}
                      onClick={(e) => {
                        if (comparisonResult || isRevealed) {
                          // Word is revealed or compared - show translation popup
                          onWordClickForPopup && onWordClickForPopup(pureWord, e);
                        } else {
                          // Word not revealed - show hint word suggestion
                          onHintWordClick(originalIndex, idx, pureWord, e);
                        }
                      }}
                      title={comparisonResult ? (comparisonResult === 'correct' ? 'Đúng' : 'Sai') : (isRevealed ? 'Click để xem dịch' : 'Click để chọn từ')}
                    >
                      {displayText}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Translation display */}
        {showTranslation && sentence.translation && (
          <div className={styles.slideTranslation}>
            {sentence.translation}
          </div>
        )}
      </div>
    </div>
  );
});

DictationMobileSlide.displayName = 'DictationMobileSlide';

export default DictationMobileSlide;
