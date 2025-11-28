/**
 * Service Worker for Offline Mode
 * Enables learning even without internet connection
 * 
 * Features:
 * - Cache static assets (HTML, CSS, JS)
 * - Cache transcript JSON files
 * - Cache audio files (on-demand)
 * - Offline fallback pages
 * - Background sync for progress
 * 
 * @version 1.0.0
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `deutsch-learning-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/_app',
  '/manifest.json',
  // Add other critical static assets here
];

// Dynamic cache patterns
const CACHE_PATTERNS = {
  transcripts: /\/transcripts\/.*\.json$/,
  audio: /\/audio\/.*\.(mp3|wav|ogg)$/,
  api: /\/api\/(lessons|progress|vocabulary)/,
  images: /\.(png|jpg|jpeg|gif|webp|svg)$/,
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.filter(Boolean));
    }).catch(err => {
      console.error('[SW] Failed to cache static assets:', err);
    })
  );
  
  // Force activate immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages immediately
  return self.clients.claim();
});

/**
 * Fetch event - serve from cache or network
 * Strategy: Network First with Cache Fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    handleFetch(request)
  );
});

/**
 * Handle fetch with appropriate caching strategy
 */
async function handleFetch(request) {
  const url = new URL(request.url);
  
  // 1. API Requests - Network First, Cache Fallback
  if (CACHE_PATTERNS.api.test(url.pathname)) {
    return networkFirstStrategy(request);
  }
  
  // 2. Transcripts - Cache First, Update Background
  if (CACHE_PATTERNS.transcripts.test(url.pathname)) {
    return cacheFirstStrategy(request);
  }
  
  // 3. Audio Files - Cache First (large files)
  if (CACHE_PATTERNS.audio.test(url.pathname)) {
    return cacheFirstStrategy(request);
  }
  
  // 4. Images - Cache First
  if (CACHE_PATTERNS.images.test(url.pathname)) {
    return cacheFirstStrategy(request);
  }
  
  // 5. HTML Pages - Network First
  if (request.mode === 'navigate') {
    return networkFirstStrategy(request);
  }
  
  // 6. Default - Network First
  return networkFirstStrategy(request);
}

/**
 * Network First Strategy
 * Try network, fallback to cache if offline
 */
async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Only cache GET requests with successful responses
    if (request.method === 'GET' && networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache (only for GET requests)
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Only try cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // If HTML page, return offline fallback
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/offline');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    // Return error response
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

/**
 * Cache First Strategy
 * Serve from cache, update cache in background
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Serve from cache
    console.log('[SW] Serving from cache:', request.url);
    
    // Update cache in background (optional)
    fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse);
      }
    }).catch(() => {
      // Ignore network errors in background update
    });
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url, error);
    
    return new Response('Offline - Content not cached', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Background Sync - sync progress when back online
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

/**
 * Sync offline progress to server
 */
async function syncProgress() {
  console.log('[SW] Syncing offline progress...');
  
  try {
    // Get offline progress from IndexedDB
    const offlineProgress = await getOfflineProgress();
    
    if (offlineProgress.length === 0) {
      console.log('[SW] No offline progress to sync');
      return;
    }
    
    // Send to server
    for (const item of offlineProgress) {
      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${item.token}`
          },
          body: JSON.stringify(item.data)
        });
        
        if (response.ok) {
          // Remove synced item from IndexedDB
          await removeOfflineProgress(item.id);
          console.log('[SW] Synced progress:', item.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync item:', item.id, error);
      }
    }
    
    console.log('[SW] Progress sync complete');
  } catch (error) {
    console.error('[SW] Sync progress failed:', error);
  }
}

/**
 * Get offline progress from IndexedDB
 * (Placeholder - will be implemented with IndexedDB helper)
 */
async function getOfflineProgress() {
  // TODO: Implement IndexedDB query
  return [];
}

/**
 * Remove synced progress from IndexedDB
 */
async function removeOfflineProgress(id) {
  // TODO: Implement IndexedDB deletion
}

/**
 * Message handler - communicate with pages
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_LESSON') {
    // Cache specific lesson assets
    cacheLessonAssets(event.data.lessonId);
  }
  
  if (event.data.type === 'GET_CACHE_STATUS') {
    // Return cache status
    getCacheStatus().then(status => {
      event.ports[0].postMessage(status);
    });
  }
});

/**
 * Cache lesson assets for offline use
 */
async function cacheLessonAssets(lessonId) {
  console.log('[SW] Caching lesson assets:', lessonId);
  
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Cache transcript JSON
    await cache.add(`/transcripts/${lessonId}.json`);
    
    // Cache audio file (if available)
    // await cache.add(`/audio/${lessonId}.mp3`);
    
    console.log('[SW] Lesson assets cached:', lessonId);
  } catch (error) {
    console.error('[SW] Failed to cache lesson:', lessonId, error);
  }
}

/**
 * Get cache status and size
 */
async function getCacheStatus() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  return {
    version: CACHE_VERSION,
    cached: keys.length,
    keys: keys.map(req => req.url)
  };
}

console.log('[SW] Service Worker loaded');
