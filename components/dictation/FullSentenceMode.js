import React from 'react';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import layoutStyles from '../../styles/dictationPage.module.css';
import fullSentenceStyles from '../../styles/dictation/dictationFullSentence.module.css';
import inputStyles from '../../styles/dictation/dictationInput.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...inputStyles, ...fullSentenceStyles };

const ShadowingVoiceRecorder = dynamic(() => import('../ShadowingVoiceRecorder'), {
  ssr: false,
  loading: () => <div style={{ width: '40px', height: '40px', background: '#f0f0f0', borderRadius: '50%' }}></div>
});

/**
 * Full Sentence Mode Component
 * For C1+C2 difficulty level - user types the entire sentence
 * 
 * CSS: Uses dictationFullSentence.module.css for full sentence mode styles
 */
const FullSentenceMode = ({
  sentence,
  sentenceIndex,
  isCompleted,
  isActive,
  fullSentenceInputs,
  revealedHintWords,
  wordComparisonResults,
  partialRevealedChars,
  onInputChange,
  onSubmit,
  onToggleRevealWord,
  onCalculatePartialReveals,
  onGoToNext,
  canGoNext,
  renderCompletedSentenceWithWordBoxes,
  isMobile = false,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const { t } = useTranslation();

  const words = sentence.text.split(/\s+/).filter(w => w.length > 0);

  const renderHintWords = () => {
    return words.map((word, idx) => {
      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
      
      if (pureWord.length === 0) return null;

      const isRevealed = revealedHintWords[sentenceIndex]?.[idx];
      const comparisonResult = wordComparisonResults[sentenceIndex]?.[idx];
      const partialCount = partialRevealedChars[sentenceIndex]?.[idx] || 0;

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
            className={`${styles.hintWordBox} ${wordClass}`}
            onClick={() => !comparisonResult && onToggleRevealWord(sentenceIndex, idx)}
            title={comparisonResult ? (comparisonResult === 'correct' ? 'Đúng' : 'Sai') : (isRevealed ? 'Click để ẩn' : 'Click để hiện gợi ý')}
          >
            {displayText}
          </span>
        </span>
      );
    });
  };

  const touchHandlers = isMobile ? {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  } : {};

  return (
    <div className={styles.fullSentenceMode} {...touchHandlers}>
      <div className={styles.fullSentenceDisplay}>
        {isCompleted ? (
          <div 
            className={styles.dictationInputArea}
            dangerouslySetInnerHTML={{ __html: renderCompletedSentenceWithWordBoxes(sentence.text) }}
          />
        ) : (
          <div className={styles.hintSentenceText} data-sentence-index={sentenceIndex}>
            {renderHintWords()}
          </div>
        )}
      </div>

      {/* Desktop: Show textarea for typing full sentence */}
      {!isMobile && (
        <div className={styles.textareaWithVoice} style={{ position: 'relative' }}>
          <textarea
            className={styles.fullSentenceInput}
            placeholder="Nhập toàn bộ câu..."
            value={fullSentenceInputs[sentenceIndex] || ''}
            onChange={(e) => {
              onInputChange(sentenceIndex, e.target.value);
              onCalculatePartialReveals(sentenceIndex, e.target.value, sentence.text);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(sentenceIndex);
              }
            }}
            disabled={isCompleted}
            rows={3}
          />
          {!isCompleted && (
            <div className={styles.dictationVoiceButton}>
              <ShadowingVoiceRecorder
                onTranscript={(text) => {
                  onInputChange(sentenceIndex, text);
                  onCalculatePartialReveals(sentenceIndex, text, sentence.text);
                }}
                onAudioRecorded={(audioBlob) => console.log('Audio recorded:', audioBlob)}
                language="de-DE"
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile: Only show word boxes - user taps to reveal words */}
      {/* Textarea is hidden on mobile - interaction is through word boxes only */}

      {isActive && !isCompleted && (
        <div className={styles.dictationActions}>
          <button
            className={styles.checkButton}
            onClick={(e) => {
              e.stopPropagation();
              onSubmit(sentenceIndex);
            }}
          >
            Kiểm tra
          </button>

          <button
            className={styles.nextButton}
            onClick={(e) => {
              e.stopPropagation();
              onGoToNext();
            }}
            disabled={!canGoNext}
          >
            {t('lesson.ui.next')}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FullSentenceMode;
