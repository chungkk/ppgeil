import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import ProgressIndicator from '../ProgressIndicator';
import { useKaraokeHighlight } from '../../lib/hooks/useKaraokeHighlight';
import { speakText } from '../../lib/textToSpeech';
import layoutStyles from '../../styles/dictationPage.module.css';
import transcriptStyles from '../../styles/dictation/dictationTranscript.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...transcriptStyles };

/**
 * Transcript Panel Component
 * Displays transcript list with progress indicator and vocabulary
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
  learningMode = 'dictation',
  showOnMobile = false,
  currentTime = 0,
  isPlaying = false,
  vocabulary = [],
  isLoadingVocabulary = false,
  onWordClickForPopup
}) => {
  // Tab state: 'transcript' or 'vocabulary'
  const [activeTab, setActiveTab] = useState('transcript');
  const transcriptSectionRef = useRef(null);
  const transcriptItemRefs = useRef({});

  // Karaoke highlight for active sentence (all modes)
  const activeSentence = transcriptData[currentSentenceIndex];
  const { wordTimings, activeWordIndex } = useKaraokeHighlight(
    activeSentence,
    currentTime,
    isPlaying,
    true // Always enable karaoke for transcript panel
  );

  // Render text with karaoke highlighting
  const renderKaraokeText = useCallback((text, segment, originalIndex) => {
    const isActiveSentence = originalIndex === currentSentenceIndex;
    
    // Apply karaoke to active sentence when playing (for all modes)
    if (!isActiveSentence || !isPlaying) {
      return text;
    }

    const words = text.split(/\s+/);
    
    return (
      <span className={styles.karaokeText}>
        {words.map((word, idx) => {
          const isSpoken = idx < activeWordIndex;
          const isCurrent = idx === activeWordIndex;
          
          return (
            <span
              key={idx}
              className={`${styles.karaokeWord} ${isSpoken ? styles.karaokeWordSpoken : ''} ${isCurrent ? styles.karaokeWordCurrent : ''}`}
            >
              {word}{idx < words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </span>
    );
  }, [currentSentenceIndex, isPlaying, activeWordIndex]);

  // Render masked text with karaoke highlighting (for dictation mode)
  const renderMaskedKaraokeText = useCallback((text, originalIndex, effectiveHidePercentage, sentenceWordsCompleted, sentenceRevealedWords) => {
    const isActiveSentence = originalIndex === currentSentenceIndex;
    
    // Get masked text as string
    const maskedText = maskTextByPercentage(text, originalIndex, effectiveHidePercentage, sentenceWordsCompleted, sentenceRevealedWords);
    
    // If not active sentence or not playing, return plain masked text
    if (!isActiveSentence || !isPlaying) {
      return maskedText;
    }

    // Split both original and masked text to get word-by-word mapping
    const maskedWords = maskedText.split(/\s+/);
    
    return (
      <span className={styles.karaokeText}>
        {maskedWords.map((word, idx) => {
          const isSpoken = idx < activeWordIndex;
          const isCurrent = idx === activeWordIndex;
          
          return (
            <span
              key={idx}
              className={`${styles.karaokeWord} ${isSpoken ? styles.karaokeWordSpoken : ''} ${isCurrent ? styles.karaokeWordCurrent : ''}`}
            >
              {word}{idx < maskedWords.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </span>
    );
  }, [currentSentenceIndex, isPlaying, activeWordIndex, maskTextByPercentage]);

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

  // Handle vocabulary word click
  const handleVocabWordClick = useCallback((word, e) => {
    speakText(word);
    if (onWordClickForPopup) {
      onWordClickForPopup(word, e);
    }
  }, [onWordClickForPopup]);

  return (
    <div className={`${styles.rightSection} ${showOnMobile ? styles.showOnMobile : ''}`}>
      <div className={styles.transcriptHeader}>
        <div className={styles.transcriptHeaderLeft}>
          {/* Tab buttons */}
          <div className={styles.transcriptTabs}>
            <button 
              className={`${styles.transcriptTab} ${activeTab === 'transcript' ? styles.transcriptTabActive : ''}`}
              onClick={() => setActiveTab('transcript')}
            >
              Transcript
              <span className={styles.transcriptTabCount}>{transcriptData.length}</span>
            </button>
            <button 
              className={`${styles.transcriptTab} ${activeTab === 'vocabulary' ? styles.transcriptTabActive : ''}`}
              onClick={() => setActiveTab('vocabulary')}
            >
              Từ vựng
              {vocabulary.length > 0 && (
                <span className={styles.transcriptTabCount}>{vocabulary.length}</span>
              )}
            </button>
          </div>
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
      
      {/* Transcript View */}
      {activeTab === 'transcript' && (
        <div className={styles.transcriptSection} ref={transcriptSectionRef}>
          <div className={styles.transcriptList}>
            {transcriptDisplayIndices.map((originalIndex) => {
              const segment = transcriptData[originalIndex];
              const isCompleted = completedSentences.includes(originalIndex);
              const sentenceWordsCompleted = completedWords[originalIndex] || {};
              const isChecked = checkedSentences.includes(originalIndex);
              
              const effectiveHidePercentage = dictationMode === 'full-sentence' ? 100 : hidePercentage;
              const sentenceRevealedWords = revealedHintWords[originalIndex] || {};
              // Show full text when completed/checked OR when in shadowing mode (NOT for dictation - keep text hidden)
              const isActiveSentencePlaying = originalIndex === currentSentenceIndex && isPlaying;
              const shouldShowFullText = learningMode === 'shadowing' || isCompleted || (dictationMode === 'full-sentence' && isChecked);

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
                  <div className={`${styles.transcriptItemText} ${isActiveSentencePlaying ? styles.shadowingText : ''}`}>
                    {shouldShowFullText 
                      ? renderKaraokeText(segment.text, segment, originalIndex)
                      : renderMaskedKaraokeText(segment.text, originalIndex, effectiveHidePercentage, sentenceWordsCompleted, sentenceRevealedWords)
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vocabulary View */}
      {activeTab === 'vocabulary' && (
        <div className={styles.transcriptSection}>
          <div className={styles.vocabularyList}>
            {isLoadingVocabulary ? (
              <div className={styles.vocabularyLoading}>
                <span>Đang tải từ vựng...</span>
              </div>
            ) : vocabulary.length === 0 ? (
              <div className={styles.vocabularyEmpty}>
                <span>Chưa có từ vựng cho bài này</span>
              </div>
            ) : (
              vocabulary.map((item, idx) => (
                <div 
                  key={idx} 
                  className={styles.vocabularyItem}
                  onClick={(e) => handleVocabWordClick(item.word, e)}
                >
                  <div className={styles.vocabularyWord}>
                    <span className={styles.vocabularyWordText}>{item.word}</span>
                    {item.partOfSpeech && (
                      <span className={styles.vocabularyPos}>{item.partOfSpeech}</span>
                    )}
                  </div>
                  <div className={styles.vocabularyTranslation}>
                    {item.translation}
                  </div>
                  {item.note && (
                    <div className={styles.vocabularyNote}>
                      {item.note}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptPanel;
