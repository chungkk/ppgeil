import { useState, useEffect, useCallback } from 'react';
import {
  cacheLessonComplete,
  removeLessonFromCache,
  isLessonCached,
  getCachedLessons,
  getCacheSize,
  clearAllCachedLessons,
  preCacheTopLessons
} from '../offlineCache';

/**
 * Hook to manage offline cache
 * @returns {Object} - Cache state and actions
 */
export const useOfflineCache = () => {
  const [cachedLessons, setCachedLessons] = useState([]);
  const [cacheSize, setCacheSize] = useState({ usage: 0, quota: 0, percentage: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  const loadCachedLessons = useCallback(async () => {
    try {
      const lessons = await getCachedLessons();
      setCachedLessons(lessons);
    } catch (error) {
      console.error('Failed to load cached lessons:', error);
    }
  }, []);

  const loadCacheSize = useCallback(async () => {
    try {
      const size = await getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('Failed to load cache size:', error);
    }
  }, []);

  // Load cached lessons on mount
  useEffect(() => {
    loadCachedLessons();
    loadCacheSize();
  }, [loadCachedLessons, loadCacheSize]);

  const cacheLesson = useCallback(async (lesson) => {
    setIsLoading(true);
    setDownloadProgress({ currentAsset: 0, totalAssets: 0, lessonTitle: lesson.title });

    try {
      await cacheLessonComplete(lesson, (current, total) => {
        setDownloadProgress({
          currentAsset: current,
          totalAssets: total,
          lessonTitle: lesson.title,
          percentage: Math.round((current / total) * 100)
        });
      });

      await loadCachedLessons();
      await loadCacheSize();
      
      setDownloadProgress(null);
      return true;
    } catch (error) {
      console.error('Failed to cache lesson:', error);
      setDownloadProgress(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedLessons, loadCacheSize]);

  const removeLesson = useCallback(async (lessonId) => {
    setIsLoading(true);
    try {
      await removeLessonFromCache(lessonId);
      await loadCachedLessons();
      await loadCacheSize();
      return true;
    } catch (error) {
      console.error('Failed to remove lesson:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedLessons, loadCacheSize]);

  const checkLessonCached = useCallback(async (lessonId) => {
    try {
      return await isLessonCached(lessonId);
    } catch (error) {
      console.error('Failed to check lesson cache:', error);
      return false;
    }
  }, []);

  const clearAllCache = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearAllCachedLessons();
      await loadCachedLessons();
      await loadCacheSize();
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedLessons, loadCacheSize]);

  const preCacheTop = useCallback(async (lessonIds) => {
    setIsLoading(true);
    setDownloadProgress({ currentLesson: 0, totalLessons: lessonIds.length });

    try {
      const results = await preCacheTopLessons(lessonIds, (progress) => {
        setDownloadProgress({
          currentLesson: progress.currentLesson,
          totalLessons: progress.totalLessons,
          currentAsset: progress.currentAsset,
          totalAssets: progress.totalAssets,
          lessonTitle: progress.lessonTitle,
          percentage: Math.round((progress.currentLesson / progress.totalLessons) * 100)
        });
      });

      await loadCachedLessons();
      await loadCacheSize();
      
      setDownloadProgress(null);
      return results;
    } catch (error) {
      console.error('Failed to pre-cache lessons:', error);
      setDownloadProgress(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedLessons, loadCacheSize]);

  return {
    cachedLessons,
    cacheSize,
    isLoading,
    downloadProgress,
    cacheLesson,
    removeLesson,
    checkLessonCached,
    clearAllCache,
    preCacheTop,
    refresh: loadCachedLessons
  };
};

export default useOfflineCache;
