/**
 * Offline Cache Manager
 * Pre-cache lessons and manage offline content
 * 
 * @module offlineCache
 */

const CACHE_NAME = 'deutsch-learning-lessons-v1';

/**
 * Cache a complete lesson with all assets
 * @param {Object} lesson - Lesson object with id, title, videoId, transcript
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<boolean>}
 */
export async function cacheLessonComplete(lesson, onProgress) {
  if (!lesson || !lesson._id) {
    throw new Error('Invalid lesson object');
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const assetsToCacheCount = [];
    let cachedCount = 0;

    // 1. Cache lesson data (API response)
    const lessonUrl = `/api/lessons/${lesson._id}`;
    assetsToCacheCount.push(lessonUrl);

    // 2. Cache transcript if available
    if (lesson.transcript) {
      const transcriptUrl = lesson.transcript.startsWith('http') 
        ? lesson.transcript 
        : `${window.location.origin}${lesson.transcript}`;
      assetsToCacheCount.push(transcriptUrl);
    }

    // 3. Cache YouTube thumbnail
    if (lesson.videoId) {
      const thumbnailUrl = `https://i.ytimg.com/vi/${lesson.videoId}/maxresdefault.jpg`;
      assetsToCacheCount.push(thumbnailUrl);
    }

    // 4. Cache audio files if available
    if (lesson.audioFiles && Array.isArray(lesson.audioFiles)) {
      lesson.audioFiles.forEach(audioUrl => {
        const fullAudioUrl = audioUrl.startsWith('http') 
          ? audioUrl 
          : `${window.location.origin}${audioUrl}`;
        assetsToCacheCount.push(fullAudioUrl);
      });
    }

    const totalAssets = assetsToCacheCount.length;
    
    // Fetch and cache each asset
    for (const url of assetsToCacheCount) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          cachedCount++;
          if (onProgress) {
            onProgress(cachedCount, totalAssets);
          }
        }
      } catch (error) {
        console.warn(`Failed to cache asset: ${url}`, error);
      }
    }

    // Save lesson metadata to IndexedDB
    await saveLessonMetadata({
      lessonId: lesson._id,
      title: lesson.title,
      videoId: lesson.videoId,
      cached: true,
      cachedAt: Date.now(),
      assetCount: cachedCount
    });

    return true;
  } catch (error) {
    console.error('Failed to cache lesson:', error);
    throw error;
  }
}

/**
 * Remove lesson from cache
 * @param {string} lessonId
 * @returns {Promise<boolean>}
 */
export async function removeLessonFromCache(lessonId) {
  try {
    // Get lesson data to find all cached URLs
    const metadata = await getLessonMetadata(lessonId);
    
    if (!metadata) {
      return false;
    }

    const cache = await caches.open(CACHE_NAME);
    
    // Remove lesson API response
    await cache.delete(`/api/lessons/${lessonId}`);

    // Remove from metadata
    await deleteLessonMetadata(lessonId);

    return true;
  } catch (error) {
    console.error('Failed to remove lesson from cache:', error);
    return false;
  }
}

/**
 * Check if lesson is cached
 * @param {string} lessonId
 * @returns {Promise<boolean>}
 */
export async function isLessonCached(lessonId) {
  try {
    const metadata = await getLessonMetadata(lessonId);
    return metadata && metadata.cached;
  } catch (error) {
    return false;
  }
}

/**
 * Get all cached lessons
 * @returns {Promise<Array>}
 */
export async function getCachedLessons() {
  try {
    const db = await openCacheDB();
    const transaction = db.transaction(['lessons'], 'readonly');
    const store = transaction.objectStore('lessons');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get cached lessons:', error);
    return [];
  }
}

/**
 * Get cache size estimation
 * @returns {Promise<Object>} {usage, quota}
 */
export async function getCacheSize() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { usage: 0, quota: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? (estimate.usage / estimate.quota * 100).toFixed(2) : 0
    };
  } catch (error) {
    console.error('Failed to estimate storage:', error);
    return { usage: 0, quota: 0, percentage: 0 };
  }
}

/**
 * Clear all cached lessons
 * @returns {Promise<boolean>}
 */
export async function clearAllCachedLessons() {
  try {
    await caches.delete(CACHE_NAME);
    
    // Clear lesson metadata
    const db = await openCacheDB();
    const transaction = db.transaction(['lessons'], 'readwrite');
    const store = transaction.objectStore('lessons');
    
    return new Promise((resolve) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return false;
  }
}

// ============ IndexedDB Helpers ============

const DB_NAME = 'OfflineCacheDB';
const DB_VERSION = 1;

function openCacheDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('lessons')) {
        const store = db.createObjectStore('lessons', { keyPath: 'lessonId' });
        store.createIndex('cached', 'cached', { unique: false });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
  });
}

async function saveLessonMetadata(metadata) {
  const db = await openCacheDB();
  const transaction = db.transaction(['lessons'], 'readwrite');
  const store = transaction.objectStore('lessons');
  
  return new Promise((resolve, reject) => {
    const request = store.put(metadata);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getLessonMetadata(lessonId) {
  const db = await openCacheDB();
  const transaction = db.transaction(['lessons'], 'readonly');
  const store = transaction.objectStore('lessons');
  
  return new Promise((resolve, reject) => {
    const request = store.get(lessonId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteLessonMetadata(lessonId) {
  const db = await openCacheDB();
  const transaction = db.transaction(['lessons'], 'readwrite');
  const store = transaction.objectStore('lessons');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(lessonId);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Pre-cache top lessons on app startup
 * @param {Array<string>} lessonIds - Array of lesson IDs to cache
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} {success: number, failed: number}
 */
export async function preCacheTopLessons(lessonIds, onProgress) {
  const results = { success: 0, failed: 0 };
  
  for (let i = 0; i < lessonIds.length; i++) {
    try {
      const lessonId = lessonIds[i];
      
      // Fetch lesson data
      const response = await fetch(`/api/lessons/${lessonId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch lesson');
      }
      
      const lesson = await response.json();
      
      // Cache the lesson
      await cacheLessonComplete(lesson, (current, total) => {
        if (onProgress) {
          onProgress({
            currentLesson: i + 1,
            totalLessons: lessonIds.length,
            currentAsset: current,
            totalAssets: total,
            lessonTitle: lesson.title
          });
        }
      });
      
      results.success++;
    } catch (error) {
      console.error(`Failed to pre-cache lesson ${lessonIds[i]}:`, error);
      results.failed++;
    }
  }
  
  return results;
}

const offlineCache = {
  cacheLessonComplete,
  removeLessonFromCache,
  isLessonCached,
  getCachedLessons,
  getCacheSize,
  clearAllCachedLessons,
  preCacheTopLessons
};

export default offlineCache;
