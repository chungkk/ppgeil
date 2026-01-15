import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/LockedLessonOverlay.module.css';

const LockedLessonOverlay = ({ lesson, onUnlockSuccess }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const freeUnlocksRemaining = lesson?.userFreeUnlocks ?? 0;
  const userPoints = lesson?.userPoints ?? 0;
  const unlockCost = lesson?.unlockCost ?? 100;

  const canUnlockFree = freeUnlocksRemaining > 0;
  const canUnlockWithPoints = userPoints >= unlockCost;
  const canUnlock = canUnlockFree || canUnlockWithPoints;

  const handleUnlock = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/lessons/${lesson.id}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Không thể mở khóa bài học');
      }

      if (onUnlockSuccess) {
        onUnlockSuccess();
      } else {
        // Reload page to get unlocked content
        window.location.reload();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.lockIcon}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        </div>

        <h2 className={styles.title}>Bài học bị khóa</h2>
        <p className={styles.lessonTitle}>{lesson?.title || lesson?.displayTitle}</p>

        <div className={styles.infoBox}>
          {!user ? (
            <p className={styles.loginPrompt}>
              Vui lòng đăng nhập để mở khóa bài học
            </p>
          ) : canUnlockFree ? (
            <div className={styles.freeUnlock}>
              <span className={styles.freeIcon}>🎁</span>
              <div>
                <strong>Miễn phí!</strong>
                <p>Bạn còn {freeUnlocksRemaining} lượt mở khóa miễn phí</p>
              </div>
            </div>
          ) : (
            <div className={styles.pointsInfo}>
              <div className={styles.row}>
                <span>Chi phí:</span>
                <span className={styles.cost}>{unlockCost} Points</span>
              </div>
              <div className={styles.row}>
                <span>Số dư:</span>
                <span className={canUnlockWithPoints ? styles.sufficient : styles.insufficient}>
                  {userPoints} Points
                </span>
              </div>
            </div>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {user && !canUnlock && !canUnlockFree && (
          <p className={styles.warning}>
            Bạn không đủ points. Hãy học thêm để kiếm points!
          </p>
        )}

        <div className={styles.actions}>
          <button className={styles.backBtn} onClick={handleBack} disabled={loading}>
            ← Quay lại
          </button>
          {!user ? (
            <button className={styles.loginBtn} onClick={() => router.push('/login')}>
              Đăng nhập
            </button>
          ) : (
            <button 
              className={`${styles.unlockBtn} ${!canUnlock ? styles.disabled : ''}`}
              onClick={handleUnlock}
              disabled={!canUnlock || loading}
            >
              {loading ? 'Đang xử lý...' : canUnlockFree ? 'Mở khóa miễn phí' : `Mở khóa (${unlockCost} Points)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LockedLessonOverlay;
