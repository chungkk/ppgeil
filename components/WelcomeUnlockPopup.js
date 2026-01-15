import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import styles from '../styles/WelcomeUnlockPopup.module.css';

const WelcomeUnlockPopup = ({ onClose }) => {
  const { t } = useTranslation();
  
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        <div className={styles.giftIcon}>🎁</div>
        <h2 className={styles.title}>{t('unlock.welcome.title')}</h2>
        <p className={styles.message}>
          <Trans i18nKey="unlock.welcome.message" values={{ count: 2 }}>
            Bạn có <strong>2 lượt mở khóa miễn phí</strong> để chọn bài học yêu thích.
          </Trans>
        </p>
        <p className={styles.hint}>
          {t('unlock.welcome.hint')}
        </p>
        <button className={styles.button} onClick={onClose}>
          {t('unlock.welcome.button')}
        </button>
      </div>
    </div>
  );
};

export default WelcomeUnlockPopup;
