import React from 'react';
import dynamic from 'next/dynamic';
import layoutStyles from '../../styles/dictationPage.module.css';
import fullSentenceStyles from '../../styles/dictation/dictationFullSentence.module.css';

const styles = { ...layoutStyles, ...fullSentenceStyles };

const ShadowingVoiceRecorder = dynamic(() => import('../ShadowingVoiceRecorder'), {
  ssr: false,
  loading: () => <div style={{ width: '40px', height: '40px', background: '#f0f0f0', borderRadius: '50%' }}></div>
});

/**
 * Desktop Dictation Area Component
 * Renders the full-sentence mode dictation interface for desktop
 */
const DictationDesktopArea = ({
  transcriptData,
  currentSentenceIndex,
  completedSentences,
  revealedHintWords,
  wordComparisonResults,
  partialRevealedChars,
  fullSentenceInputs,
  showTranslation,
  isLoadingTranslation,
  sentenceTranslation,
  onInputChange,
  onSubmit,
  onHintWordClick,
  onCalculatePartialReveals,
  renderCompletedSentenceWithWordBoxes
}) => {
  const currentSentence = transcriptData[currentSentenceIndex];
  const isCompleted = completedSentences.includes(currentSentenceIndex);

  if (!currentSentence) return null;

  const renderHintWords = () => {
    return currentSentence.text.split(/\s+/).filter(w => w.length > 0).map((word, idx) => {
      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");

      if (pureWord.length === 0) return null;

      const isRevealed = revealedHintWords[currentSentenceIndex]?.[idx];
      const comparisonResult = wordComparisonResults[currentSentenceIndex]?.[idx];
      const partialCount = partialRevealedChars[currentSentenceIndex]?.[idx] || 0;

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
            onClick={(e) => !comparisonResult && !isRevealed && onHintWordClick(currentSentenceIndex, idx, pureWord, e)}
            title={comparisonResult ? (comparisonResult === 'correct' ? 'Đúng' : 'Sai') : (isRevealed ? 'Đã hiện' : 'Click để chọn từ')}
          >
            {displayText}
          </span>
        </span>
      );
    });
  };

  return (
    <div className={styles.fullSentenceMode}>
      {/* Combined Display + Translation Box */}
      <div className={styles.dictationBox}>
        <div className={styles.fullSentenceDisplay}>
          {isCompleted ? (
            <div 
              className={styles.dictationInputArea}
              dangerouslySetInnerHTML={{ __html: renderCompletedSentenceWithWordBoxes(currentSentence.text) }}
            />
          ) : (
            <div className={styles.hintSentenceText} data-sentence-index={currentSentenceIndex}>
              {renderHintWords()}
            </div>
          )}
        </div>

        {/* Sentence Translation - Bottom half */}
        {showTranslation && (
          <div className={styles.sentenceTranslation}>
            {isLoadingTranslation ? (
              <span className={styles.translationLoading}>...</span>
            ) : sentenceTranslation ? (
              <span>{sentenceTranslation}</span>
            ) : null}
          </div>
        )}
      </div>

      <div className={styles.textareaWithVoice}>
        <textarea
          className={styles.fullSentenceInput}
          placeholder="Nhập toàn bộ câu..."
          value={fullSentenceInputs[currentSentenceIndex] || ''}
          onChange={(e) => {
            onInputChange(currentSentenceIndex, e.target.value);
            onCalculatePartialReveals(currentSentenceIndex, e.target.value, currentSentence.text);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(currentSentenceIndex);
            }
          }}
          disabled={isCompleted}
          rows={3}
        />
        {!isCompleted && (
          <div className={styles.dictationVoiceButton}>
            <ShadowingVoiceRecorder
              onTranscript={(text) => {
                onInputChange(currentSentenceIndex, text);
                onCalculatePartialReveals(currentSentenceIndex, text, currentSentence.text);
              }}
              onAudioRecorded={() => {}}
              language="de-DE"
            />
          </div>
        )}
      </div>

      <div className={styles.dictationActions}>
        <button
          className={styles.checkButton}
          onClick={() => onSubmit(currentSentenceIndex)}
          disabled={isCompleted}
        >
          Kiểm tra
        </button>
      </div>
    </div>
  );
};

export default DictationDesktopArea;
