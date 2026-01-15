import React from 'react';
import styles from '../styles/WelcomeUnlockPopup.module.css';

const WelcomeUnlockPopup = ({ onClose }) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        <div className={styles.giftIcon}>🎁</div>
        <h2 className={styles.title}>Chào mừng bạn!</h2>
        <p className={styles.message}>
          Bạn có <strong>2 lượt mở khóa miễn phí</strong> để chọn bài học yêu thích.
        </p>
        <p className={styles.hint}>
          Hãy chọn bài học bạn muốn và bắt đầu học ngay!
        </p>
        <button className={styles.button} onClick={onClose}>
          Chọn bài ngay
        </button>
      </div>
    </div>
  );
};

export default WelcomeUnlockPopup;
