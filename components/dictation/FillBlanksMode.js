import React from 'react';
import { useTranslation } from 'react-i18next';
import layoutStyles from '../../styles/dictationPage.module.css';
import inputStyles from '../../styles/dictation/dictationInput.module.css';

// Merge styles - component styles override layout styles
const styles = { ...layoutStyles, ...inputStyles };

/**
 * Fill Blanks Mode Component
 * For A1-B2 difficulty levels - user fills in hidden words
 * 
 * CSS: Uses dictationInput.module.css for word input styles
 */
const FillBlanksMode = ({
  processedText,
  sentenceIndex,
  isActive,
  onShowAllWords,
  onGoToNext,
  canGoNext,
  isMobile = false,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  const { t } = useTranslation();

  const touchHandlers = isMobile ? {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  } : {};

  return (
    <>
      <div
        className={styles.dictationInputArea}
        data-sentence-index={sentenceIndex}
        dangerouslySetInnerHTML={{ __html: processedText }}
        {...touchHandlers}
      />

      {isActive && (
        <div className={styles.dictationActions}>
          <button
            className={styles.showAllWordsButton}
            onClick={(e) => {
              e.stopPropagation();
              onShowAllWords(sentenceIndex);
            }}
          >
            {t('lesson.ui.showAll')}
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
    </>
  );
};

export default FillBlanksMode;
