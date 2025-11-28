import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import styles from '../../styles/shadowingStates.module.css';

// Error State - When lesson not found or error occurred
export const ErrorState = ({ 
  title, 
  description, 
  lessonId,
  errorType = 'notFound', // 'notFound' | 'network' | 'generic'
  onRetry,
  onBack 
}) => {
  const { t } = useTranslation();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  const icons = {
    notFound: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
        <path d="M8 8l6 6M14 8l-6 6"/>
      </svg>
    ),
    network: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
        <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
        <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round"/>
      </svg>
    ),
    generic: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    )
  };

  return (
    <div className={styles.stateContainer}>
      <div className={styles.stateContent}>
        <div className={`${styles.iconWrapper} ${styles[errorType]}`}>
          {icons[errorType]}
        </div>
        
        <h1 className={styles.title}>
          {title || t('lesson.notFound.title')}
        </h1>
        
        <p className={styles.description}>
          {description || (
            <span dangerouslySetInnerHTML={{ 
              __html: t('lesson.notFound.description', { lessonId }) 
            }} />
          )}
        </p>

        <div className={styles.actions}>
          {onRetry && (
            <button className={styles.retryButton} onClick={onRetry}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Thử lại
            </button>
          )}
          <button className={styles.backButton} onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            {t('lesson.notFound.backButton')}
          </button>
        </div>

        <div className={styles.decoration}>
          <div className={styles.circle1}></div>
          <div className={styles.circle2}></div>
          <div className={styles.circle3}></div>
        </div>
      </div>
    </div>
  );
};

// Empty State - When no transcript data
export const EmptyState = ({ 
  title = 'Không có dữ liệu',
  description = 'Bài học này chưa có transcript. Vui lòng thử lại sau.',
  onBack 
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  return (
    <div className={styles.stateContainer}>
      <div className={styles.stateContent}>
        <div className={`${styles.iconWrapper} ${styles.empty}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>

        <div className={styles.actions}>
          <button className={styles.backButton} onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Quay về trang chủ
          </button>
        </div>

        <div className={styles.decoration}>
          <div className={styles.circle1}></div>
          <div className={styles.circle2}></div>
        </div>
      </div>
    </div>
  );
};

// Loading State with animated text
export const LoadingState = ({ message = 'Đang tải bài học...' }) => {
  return (
    <div className={styles.stateContainer}>
      <div className={styles.stateContent}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerCore}></div>
        </div>
        
        <p className={styles.loadingText}>{message}</p>
        
        <div className={styles.loadingDots}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

const ShadowingStates = { ErrorState, EmptyState, LoadingState };
export default ShadowingStates;
