import React from 'react';
import { useTranslation } from 'react-i18next';
import { LessonThumbnail } from './OptimizedImage';
import CategoryTag from './CategoryTag'; // T064: Import CategoryTag
import styles from '../styles/LessonCard.module.css';

const LessonCard = ({ lesson, onClick, onUnlock }) => {
  const { t } = useTranslation();
  const extractYouTubeVideoId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
      /(?:https?:\/\/)?youtu\.be\/([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getYouTubeThumbnail = (url) => {
    const videoId = extractYouTubeVideoId(url);
    // Use mqdefault (320x180) for faster loading - matches card size
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatViewCount = (count) => {
    if (!count) return '0';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getDifficultyClass = (level) => {
    if (!level) return 'beginner';
    const levelLower = level.toLowerCase();
    if (levelLower === 'a1' || levelLower === 'a2') return 'beginner';
    return 'experienced';
  };

  const getDifficultyLabel = (level) => {
    if (!level) return 'A1';
    return level.toUpperCase();
  };

  const handleClick = (e) => {
    if (lesson.isLocked && onUnlock) {
      e.preventDefault();
      e.stopPropagation();
      onUnlock(lesson);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`${styles.lessonCard} ${lesson.isLocked ? styles.locked : ''}`} 
      onClick={handleClick}
    >
      <div className={styles.thumbnailContainer}>
        <LessonThumbnail
          src={lesson.thumbnail || getYouTubeThumbnail(lesson.youtubeUrl) || '/default-thumbnail.jpg'}
          alt={`${lesson.title} - ${lesson.level || 'German'} lesson`}
          className={`${styles.thumbnail} ${lesson.isLocked ? styles.lockedThumbnail : ''}`}
          priority={lesson.featured || false}
        />
        
        {lesson.isLocked && (
          <div className={styles.lockOverlay}>
            <svg className={styles.lockIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <span className={styles.lockText}>100 Points</span>
          </div>
        )}

        <div className={styles.badges}>
          <div className={styles.viewCount}>
            <svg
              className={styles.viewIcon}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>
            <span>{formatViewCount(lesson.viewCount || 0)}</span>
          </div>

          <div
            className={`${styles.difficultyBadge} ${styles[getDifficultyClass(lesson.level)]}`}
          >
            {getDifficultyLabel(lesson.level)}
          </div>
        </div>

        {lesson.videoDuration && (
          <div className={styles.duration}>
            <span>⏱</span>
            <span>{formatDuration(lesson.videoDuration)}</span>
          </div>
        )}

        {lesson.source && (
          <div className={styles.sourceIndicator}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z" />
            </svg>
            <span>Youtube</span>
          </div>
        )}
      </div>

      <div className={styles.cardContent}>
        {/* T065: Add category tag if available */}
        {lesson.category && (
          <div className={styles.categoryContainer}>
            <CategoryTag category={lesson.category} size="small" />
          </div>
        )}
        <h3 className={styles.title}>{lesson.title}</h3>
      </div>
    </div>
  );
};

export default LessonCard;
