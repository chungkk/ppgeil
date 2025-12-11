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
  // Saved vocabulary props
  savedVocabulary = [],
  onDeleteVocabulary,
  lessonId
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

  // Handle delete vocabulary
  const handleDeleteVocab = useCallback(async (vocabId, e) => {
    e.stopPropagation();
    if (onDeleteVocabulary) {
      onDeleteVocabulary(vocabId);
    }
  }, [onDeleteVocabulary]);

  return (
    <div className={`${styles.rightSection} ${showOnMobile ? styles.showOnMobile : ''}`}>
      <div className={styles.transcriptHeader}>
        <div className={styles.transcriptHeaderLeft}>
          {/* Tabs */}
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
              <span className={styles.transcriptTabCount}>{savedVocabulary.length}</span>
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
      
      <div className={styles.transcriptSection} ref={transcriptSectionRef}>
        {/* Transcript Tab Content */}
        {activeTab === 'transcript' && (
          <div className={styles.transcriptList}>
            {transcriptDisplayIndices.map((originalIndex) => {
              const segment = transcriptData[originalIndex];
              const isCompleted = completedSentences.includes(originalIndex);
              const sentenceWordsCompleted = completedWords[originalIndex] || {};
              const isChecked = checkedSentences.includes(originalIndex);
              
              const effectiveHidePercentage = dictationMode === 'full-sentence' ? 100 : hidePercentage;
              const sentenceRevealedWords = revealedHintWords[originalIndex] || {};
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
                    <span 
                      className={styles.transcriptPlayIcon}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSentenceClick(segment.start, segment.end);
                      }}
                      title="Phát câu này"
                    >
                      ▶
                    </span>
                    {shouldShowFullText 
                      ? renderKaraokeText(segment.text, segment, originalIndex)
                      : renderMaskedKaraokeText(segment.text, originalIndex, effectiveHidePercentage, sentenceWordsCompleted, sentenceRevealedWords)
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Vocabulary Tab Content */}
        {activeTab === 'vocabulary' && (
          <div className={styles.vocabularyList}>
            {savedVocabulary.length === 0 ? (
              <div className={styles.vocabularyEmpty}>
                Chưa có từ vựng nào được lưu cho bài này.
                <br />
                <small>Click vào từ trong transcript rồi ấn ⭐ Lưu để thêm từ vựng.</small>
              </div>
            ) : (
              savedVocabulary.map((vocab) => (
                <div key={vocab._id} className={styles.vocabularyItem}>
                  <div className={styles.vocabularyWord}>
                    <span 
                      className={styles.vocabularyWordText}
                      onClick={() => speakText(vocab.word)}
                      style={{ cursor: 'pointer' }}
                    >
                      🔊 {vocab.word}
                    </span>
                    {vocab.partOfSpeech && (
                      <span className={styles.vocabularyPos}>{vocab.partOfSpeech}</span>
                    )}
                    <button
                      className={styles.vocabularyDeleteBtn}
                      onClick={(e) => handleDeleteVocab(vocab._id, e)}
                      title="Xóa từ vựng"
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.vocabularyTranslation}>{vocab.translation}</div>
                  {vocab.context && (
                    <div className={styles.vocabularyNote}>
                      📝 {vocab.context}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptPanel;
