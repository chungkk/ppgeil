/**
 * Offline Storage using IndexedDB
 * Store progress, vocabulary, and user data offline
 * 
 * @module offlineStorage
 */

const DB_NAME = 'DeutschLearningDB';
const DB_VERSION = 1;

// Object stores
const STORES = {
  PROGRESS: 'progress',
  VOCABULARY: 'vocabulary',
  LESSONS: 'lessons',
  SYNC_QUEUE: 'syncQueue'
};

/**
 * Open IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PROGRESS)) {
        const progressStore = db.createObjectStore(STORES.PROGRESS, { keyPath: 'id', autoIncrement: true });
        progressStore.createIndex('lessonId', 'lessonId', { unique: false });
        progressStore.createIndex('timestamp', 'timestamp', { unique: false });
        progressStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.VOCABULARY)) {
        const vocabStore = db.createObjectStore(STORES.VOCABULARY, { keyPath: 'id', autoIncrement: true });
        vocabStore.createIndex('word', 'word', { unique: false });
        vocabStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.LESSONS)) {
        const lessonsStore = db.createObjectStore(STORES.LESSONS, { keyPath: 'lessonId' });
        lessonsStore.createIndex('cached', 'cached', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Save progress offline
 * @param {Object} progressData
 * @returns {Promise<number>} - ID of saved record
 */
export async function saveProgressOffline(progressData) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PROGRESS], 'readwrite');
    const store = transaction.objectStore(STORES.PROGRESS);
    
    const data = {
      ...progressData,
      timestamp: Date.now(),
      synced: false
    };
    
    const request = store.add(data);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('Progress saved offline:', request.result);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save progress offline:', error);
    throw error;
  }
}

/**
 * Get unsynced progress items
 * @returns {Promise<Array>}
 */
export async function getUnsyncedProgress() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PROGRESS], 'readonly');
    const store = transaction.objectStore(STORES.PROGRESS);
    const index = store.index('synced');
    
    const request = index.getAll(false);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get unsynced progress:', error);
    return [];
  }
}

/**
 * Mark progress as synced
 * @param {number} id
 */
export async function markProgressSynced(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PROGRESS], 'readwrite');
    const store = transaction.objectStore(STORES.PROGRESS);
    
    const getRequest = store.get(id);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.synced = true;
          data.syncedAt = Date.now();
          
          const putRequest = store.put(data);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Already deleted
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Failed to mark progress synced:', error);
  }
}

/**
 * Save vocabulary offline
 * @param {Object} vocabData
 */
export async function saveVocabularyOffline(vocabData) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.VOCABULARY], 'readwrite');
    const store = transaction.objectStore(STORES.VOCABULARY);
    
    const data = {
      ...vocabData,
      timestamp: Date.now(),
      synced: false
    };
    
    const request = store.add(data);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save vocabulary offline:', error);
    throw error;
  }
}

/**
 * Cache lesson data for offline use
 * @param {string} lessonId
 * @param {Object} lessonData
 */
export async function cacheLessonData(lessonId, lessonData) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.LESSONS], 'readwrite');
    const store = transaction.objectStore(STORES.LESSONS);
    
    const data = {
      lessonId,
      ...lessonData,
      cached: Date.now()
    };
    
    const request = store.put(data);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('Lesson cached:', lessonId);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to cache lesson:', error);
  }
}

/**
 * Get cached lesson data
 * @param {string} lessonId
 * @returns {Promise<Object|null>}
 */
export async function getCachedLesson(lessonId) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.LESSONS], 'readonly');
    const store = transaction.objectStore(STORES.LESSONS);
    
    const request = store.get(lessonId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get cached lesson:', error);
    return null;
  }
}

/**
 * Add item to sync queue
 * @param {string} type - 'progress' | 'vocabulary'
 * @param {Object} data
 */
export async function addToSyncQueue(type, data) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    
    const queueItem = {
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };
    
    const request = store.add(queueItem);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to add to sync queue:', error);
  }
}

/**
 * Get all items from sync queue
 * @returns {Promise<Array>}
 */
export async function getSyncQueue() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get sync queue:', error);
    return [];
  }
}

/**
 * Remove item from sync queue
 * @param {number} id
 */
export async function removeFromSyncQueue(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    
    const request = store.delete(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to remove from sync queue:', error);
  }
}

/**
 * Process sync queue - sync all pending items
 */
export async function processSyncQueue() {
  const queue = await getSyncQueue();
  
  if (queue.length === 0) {
    return;
  }
  
  for (const item of queue) {
    try {
      let endpoint = '';
      if (item.type === 'progress') {
        endpoint = '/api/progress';
      } else if (item.type === 'vocabulary') {
        endpoint = '/api/vocabulary';
      }
      
      const token = localStorage.getItem('token');
      if (!token) continue;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(item.data)
      });
      
      if (response.ok) {
        await removeFromSyncQueue(item.id);
        console.log('Synced item:', item.id);
      }
    } catch (error) {
      console.error('Failed to sync item:', item.id, error);
    }
  }
}

/**
 * Check if offline storage is available
 * @returns {boolean}
 */
export function isOfflineStorageAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Get storage statistics
 * @returns {Promise<Object>}
 */
export async function getStorageStats() {
  try {
    const db = await openDB();
    
    const stats = {
      progress: 0,
      vocabulary: 0,
      lessons: 0,
      syncQueue: 0
    };
    
    for (const storeName of Object.values(STORES)) {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();
      
      await new Promise((resolve) => {
        countRequest.onsuccess = () => {
          stats[storeName] = countRequest.result;
          resolve();
        };
      });
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return null;
  }
}

const offlineStorage = {
  saveProgressOffline,
  getUnsyncedProgress,
  markProgressSynced,
  saveVocabularyOffline,
  cacheLessonData,
  getCachedLesson,
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  processSyncQueue,
  isOfflineStorageAvailable,
  getStorageStats
};

export default offlineStorage;
