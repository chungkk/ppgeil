import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { navigateWithLocale } from '../lib/navigation';
import styles from '../styles/UnlockModal.module.css';

const GuestLockedPopup = ({ lesson, onClose }) => {
  const { t } = useTranslation();
  const router = useRouter();

  const handleGoToIndex = () => {
    onClose();
    navigateWithLocale(router, '/');
  };

  const handleLogin = () => {
    onClose();
    router.push('/login');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        
        <div className={styles.lockIconContainer}>
          <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        </div>

        <h2 className={styles.title}>{t('unlock.lockedTitle')}</h2>
        <p className={styles.lessonTitle}>{lesson?.title || lesson?.displayTitle}</p>

        <div className={styles.infoBox}>
          <p style={{ textAlign: 'center', margin: 0 }}>
            {t('unlock.loginRequired')}
          </p>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.cancelBtn} 
            onClick={handleGoToIndex}
          >
            ← {t('unlock.goBack')}
          </button>
          <button 
            className={styles.confirmBtn}
            onClick={handleLogin}
          >
            {t('header.auth.login')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestLockedPopup;
