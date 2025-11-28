import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/FooterControls.module.css';

const FooterControls = ({
  currentIndex,
  totalSentences,
  onPrevious,
  onNext,
  onComplete,
  showComplete = false,
  completedCount = 0,
}) => {
  const { t } = useTranslation();
  const progress = totalSentences > 0 ? ((currentIndex + 1) / totalSentences) * 100 : 0;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressText}>
              {t('footerControls.sentenceProgress', { current: currentIndex + 1, total: totalSentences })}
            </span>
            {completedCount > 0 && (
              <span className={styles.completedText}>
                ✓ {t('footerControls.completed', { count: completedCount })}
              </span>
            )}
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>

        <div className={styles.navigation}>
          <button
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className={styles.buttonBack}
          >
            <span>←</span>
            <span>{t('footerControls.back')}</span>
          </button>

          <div className={styles.spacer} />

          {showComplete && currentIndex === totalSentences - 1 ? (
            <button onClick={onComplete} className={styles.buttonComplete}>
              <span>{t('footerControls.completeLesson')}</span>
              <span>✓</span>
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={currentIndex >= totalSentences - 1}
              className={styles.buttonNext}
            >
              <span>{t('footerControls.next')}</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FooterControls;
