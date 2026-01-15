import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/LockedLessonOverlay.module.css';

const LockedLessonOverlay = ({ lesson, onUnlockSuccess }) => {
  const { t } = useTranslation();
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

        <h2 className={styles.title}>{t('unlock.lockedTitle')}</h2>
        <p className={styles.lessonTitle}>{lesson?.title || lesson?.displayTitle}</p>

        <div className={styles.infoBox}>
          {!user ? (
            <p className={styles.loginPrompt}>
              {t('unlock.loginRequired')}
            </p>
          ) : canUnlockFree ? (
            <div className={styles.freeUnlock}>
              <span className={styles.freeIcon}>🎁</span>
              <div>
                <strong>{t('unlock.free')}</strong>
                <p>{t('unlock.freeUnlocksLeft', { count: freeUnlocksRemaining })}</p>
              </div>
            </div>
          ) : (
            <div className={styles.pointsInfo}>
              <div className={styles.row}>
                <span>{t('unlock.cost')}:</span>
                <span className={styles.cost}>{unlockCost} {t('unlock.points')}</span>
              </div>
              <div className={styles.row}>
                <span>{t('unlock.balance')}:</span>
                <span className={canUnlockWithPoints ? styles.sufficient : styles.insufficient}>
                  {userPoints} {t('unlock.points')}
                </span>
              </div>
            </div>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {user && !canUnlock && !canUnlockFree && (
          <p className={styles.warning}>
            {t('unlock.notEnoughPoints')}
          </p>
        )}

        <div className={styles.actions}>
          <button className={styles.backBtn} onClick={handleBack} disabled={loading}>
            ← {t('unlock.goBack')}
          </button>
          {!user ? (
            <button className={styles.loginBtn} onClick={() => router.push('/login')}>
              {t('header.auth.login')}
            </button>
          ) : (
            <button 
              className={`${styles.unlockBtn} ${!canUnlock ? styles.disabled : ''}`}
              onClick={handleUnlock}
              disabled={!canUnlock || loading}
            >
              {loading ? t('unlock.processing') : canUnlockFree ? t('unlock.unlockFree') : t('unlock.unlockWithPoints', { cost: unlockCost })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LockedLessonOverlay;
