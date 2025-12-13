import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOfflineCache } from '../lib/hooks/useOfflineCache';
import styles from '../styles/OfflineDownloadManager.module.css';

const OfflineDownloadManager = () => {
  const { t } = useTranslation();
  const {
    cachedLessons,
    cacheSize,
    isLoading,
    downloadProgress,
    cacheLesson,
    removeLesson,
    clearAllCache,
    preCacheTop
  } = useOfflineCache();

  const [availableLessons, setAvailableLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Fetch available lessons
  useEffect(() => {
    fetchAvailableLessons();
  }, []);

  const fetchAvailableLessons = async () => {
    try {
      const response = await fetch('/api/lessons');
      if (response.ok) {
        const data = await response.json();
        setAvailableLessons(data.lessons || []);
      }
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleCacheLesson = async (lesson) => {
    try {
      await cacheLesson(lesson);
      alert(`✓ ${lesson.title} đã được tải xuống!`);
    } catch (error) {
      alert(`✗ Lỗi khi tải ${lesson.title}`);
    }
  };

  const handleRemoveLesson = async (lessonId) => {
    if (confirm('Bạn có chắc muốn xóa bài học này khỏi bộ nhớ offline?')) {
      try {
        await removeLesson(lessonId);
        alert('✓ Đã xóa bài học');
      } catch (error) {
        alert('✗ Lỗi khi xóa bài học');
      }
    }
  };

  const handleClearAllCache = async () => {
    setShowConfirmClear(false);
    try {
      await clearAllCache();
      alert('✓ Đã xóa toàn bộ cache offline');
    } catch (error) {
      alert('✗ Lỗi khi xóa cache');
    }
  };

  const handlePreCacheTop = async () => {
    if (confirm('Tải xuống 10 bài học phổ biến nhất để dùng offline?')) {
      try {
        const topLessonIds = availableLessons.slice(0, 10).map(l => l._id);
        const results = await preCacheTop(topLessonIds);
        alert(`✓ Đã tải ${results.success} bài học. ${results.failed > 0 ? `Lỗi: ${results.failed}` : ''}`);
      } catch (error) {
        alert('✗ Lỗi khi tải bài học');
      }
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isLessonCached = (lessonId) => {
    return cachedLessons.some(cached => cached.lessonId === lessonId);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>📥 Tải xuống Offline</h2>
        <p className={styles.subtitle}>
          Tải bài học về máy để học không cần internet
        </p>
      </div>

      {/* Storage Info */}
      <div className={styles.storageInfo}>
        <div className={styles.storageBar}>
          <div 
            className={styles.storageBarFill} 
            style={{ width: `${Math.min(cacheSize.percentage, 100)}%` }}
          />
        </div>
        <div className={styles.storageText}>
          <span>{formatBytes(cacheSize.usage)} / {formatBytes(cacheSize.quota)}</span>
          <span>{cacheSize.percentage}% đã dùng</span>
        </div>
      </div>

      {/* Download Progress */}
      {downloadProgress && (
        <div className={styles.progressContainer}>
          <div className={styles.progressInfo}>
            <span className={styles.progressTitle}>
              {downloadProgress.lessonTitle || 'Đang tải...'}
            </span>
            <span className={styles.progressPercent}>
              {downloadProgress.percentage || 0}%
            </span>
          </div>
          {downloadProgress.totalLessons && (
            <div className={styles.progressSubInfo}>
              Bài {downloadProgress.currentLesson}/{downloadProgress.totalLessons}
            </div>
          )}
          <div className={styles.progressBar}>
            <div 
              className={styles.progressBarFill}
              style={{ width: `${downloadProgress.percentage || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Cached Lessons */}
      {cachedLessons.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Đã tải xuống ({cachedLessons.length})</h3>
            <button
              className={styles.clearBtn}
              onClick={() => setShowConfirmClear(true)}
              disabled={isLoading}
            >
              Xóa tất cả
            </button>
          </div>
          
          <div className={styles.lessonList}>
            {cachedLessons.map(lesson => (
              <div key={lesson.lessonId} className={styles.lessonItem}>
                <div className={styles.lessonInfo}>
                  <span className={styles.lessonIcon}>✓</span>
                  <div className={styles.lessonDetails}>
                    <div className={styles.lessonTitle}>{lesson.title}</div>
                    <div className={styles.lessonMeta}>
                      {new Date(lesson.cachedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveLesson(lesson.lessonId)}
                  disabled={isLoading}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className={styles.section}>
        <h3>Tải nhanh</h3>
        <button
          className={styles.preCacheBtn}
          onClick={handlePreCacheTop}
          disabled={isLoading || loadingLessons}
        >
          📦 Tải 10 bài phổ biến nhất
        </button>
      </div>

      {/* Available Lessons */}
      <div className={styles.section}>
        <h3>Tất cả bài học</h3>
        
        {loadingLessons ? (
          <div className={styles.loading}>Đang tải danh sách...</div>
        ) : (
          <div className={styles.lessonList}>
            {availableLessons.map(lesson => {
              const cached = isLessonCached(lesson._id);
              return (
                <div key={lesson._id} className={styles.lessonItem}>
                  <div className={styles.lessonInfo}>
                    <span className={styles.lessonIcon}>
                      {cached ? '✓' : '📄'}
                    </span>
                    <div className={styles.lessonDetails}>
                      <div className={styles.lessonTitle}>{lesson.title}</div>
                      <div className={styles.lessonMeta}>
                        {lesson.category} • Level {lesson.level || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {cached ? (
                    <button
                      className={styles.cachedBtn}
                      disabled
                    >
                      Đã tải
                    </button>
                  ) : (
                    <button
                      className={styles.downloadBtn}
                      onClick={() => handleCacheLesson(lesson)}
                      disabled={isLoading}
                    >
                      ⬇️ Tải
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Clear Dialog */}
      {showConfirmClear && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Xóa tất cả cache?</h3>
            <p>Bạn sẽ cần tải lại các bài học để dùng offline.</p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalBtnCancel}
                onClick={() => setShowConfirmClear(false)}
              >
                Hủy
              </button>
              <button
                className={styles.modalBtnConfirm}
                onClick={handleClearAllCache}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineDownloadManager;
