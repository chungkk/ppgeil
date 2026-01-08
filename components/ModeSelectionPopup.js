import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/ModeSelectionPopup.module.css';

const ModeSelectionPopup = ({ lesson, onClose, onSelectMode }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const formatStudyTime = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const modes = [
    {
      id: 'shadowing',
      name: t('modeSelectionPopup.shadowing.name'),
      icon: '🗣️',
      description: t('modeSelectionPopup.shadowing.description'),
      studyTime: lesson.shadowStudyTime || 0
    },
    {
      id: 'dictation',
      name: t('modeSelectionPopup.dictation.name'),
      icon: '✍️',
      description: t('modeSelectionPopup.dictation.description'),
      studyTime: lesson.dictationStudyTime || 0
    }
  ];

  const handleModeClick = (mode) => {
    onSelectMode(lesson, mode.id);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.popup}>
        <button className={styles.closeBtn} onClick={onClose} aria-label={t('modeSelection.close')}>
          ✕
        </button>

        <h2 className={styles.popupTitle}>{t('modeSelectionPopup.title')}</h2>

        <div className={styles.lessonInfo}>
          <div className={styles.lessonTitle}>{lesson.title}</div>
        </div>

        <div className={styles.modesContainer}>
          {modes.map((mode) => (
            <div
              key={mode.id}
              className={styles.modeOption}
              onClick={() => handleModeClick(mode)}
            >
              <div className={styles.modeHeader}>
                <div className={styles.modeIcon}>{mode.icon}</div>
                <div className={styles.modeName}>{mode.name}</div>
              </div>
              <div className={styles.modeDescription}>{mode.description}</div>
              {user && (
                <div className={styles.modeStudyTime}>
                  <span className={styles.studyTimeIcon}>⏱️</span>
                  <span className={styles.studyTimeText}>{t('modeSelection.studied', { time: formatStudyTime(mode.studyTime) })}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModeSelectionPopup;
