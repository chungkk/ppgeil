import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/UnlockModal.module.css';

const UnlockModal = ({ 
  lesson, 
  userUnlockInfo, 
  onConfirm, 
  onClose,
  isLoading 
}) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  
  if (!lesson) return null;

  const freeUnlocksRemaining = userUnlockInfo?.freeUnlocksRemaining ?? 0;
  const userPoints = userUnlockInfo?.points ?? 0;
  const unlockCost = 100;
  
  const canUnlockFree = freeUnlocksRemaining > 0;
  const canUnlockWithPoints = userPoints >= unlockCost;
  const canUnlock = canUnlockFree || canUnlockWithPoints;

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm(lesson.id);
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra');
    }
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

        <h2 className={styles.title}>Mở khóa bài học</h2>
        <p className={styles.lessonTitle}>{lesson.title || lesson.displayTitle}</p>

        <div className={styles.infoBox}>
          {canUnlockFree ? (
            <div className={styles.freeUnlock}>
              <span className={styles.freeIcon}>🎁</span>
              <div>
                <strong>Miễn phí!</strong>
                <p>Bạn còn {freeUnlocksRemaining} lượt mở khóa miễn phí</p>
              </div>
            </div>
          ) : (
            <div className={styles.pointsInfo}>
              <div className={styles.costRow}>
                <span>Chi phí:</span>
                <span className={styles.cost}>{unlockCost} Points</span>
              </div>
              <div className={styles.balanceRow}>
                <span>Số dư của bạn:</span>
                <span className={canUnlockWithPoints ? styles.sufficient : styles.insufficient}>
                  {userPoints} Points
                </span>
              </div>
            </div>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!canUnlock && !canUnlockFree && (
          <p className={styles.warning}>
            Bạn không đủ points để mở khóa. Hãy học thêm để kiếm points!
          </p>
        )}

        <div className={styles.actions}>
          <button 
            className={styles.cancelBtn} 
            onClick={onClose}
            disabled={isLoading}
          >
            Hủy
          </button>
          <button 
            className={`${styles.confirmBtn} ${!canUnlock ? styles.disabled : ''}`}
            onClick={handleConfirm}
            disabled={!canUnlock || isLoading}
          >
            {isLoading ? 'Đang xử lý...' : canUnlockFree ? 'Mở khóa miễn phí' : `Mở khóa (${unlockCost} Points)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnlockModal;
