/**
 * Service Worker Registration and Management
 * @module serviceWorker
 */

/**
 * Register service worker
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered:', registration.scope);
    
    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour
    
    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          console.log('New service worker available');
          
          // Notify user about update
          if (window.confirm('New version available! Reload to update?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });
    
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration) {
      const success = await registration.unregister();
      console.log('Service Worker unregistered:', success);
      return success;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Check if service worker is registered
 * @returns {Promise<boolean>}
 */
export async function isServiceWorkerRegistered() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration;
  } catch (error) {
    return false;
  }
}

/**
 * Send message to service worker
 * @param {Object} message
 * @returns {Promise<any>}
 */
export async function sendMessageToSW(message) {
  if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
    return null;
  }
  
  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };
    
    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Cache lesson assets for offline use
 * @param {string} lessonId
 */
export async function cacheLessonForOffline(lessonId) {
  if (typeof window === 'undefined' || !navigator.serviceWorker.controller) {
    console.warn('Service Worker not available');
    return false;
  }
  
  try {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_LESSON',
      lessonId
    });
    
    console.log('Requested caching for lesson:', lessonId);
    return true;
  } catch (error) {
    console.error('Failed to cache lesson:', error);
    return false;
  }
}

/**
 * Get cache status
 * @returns {Promise<Object>}
 */
export async function getCacheStatus() {
  try {
    const status = await sendMessageToSW({ type: 'GET_CACHE_STATUS' });
    return status;
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return null;
  }
}

/**
 * Check online status
 * @returns {boolean}
 */
export function isOnline() {
  return typeof window !== 'undefined' && navigator.onLine;
}

/**
 * Listen for online/offline events
 * @param {Function} onOnline
 * @param {Function} onOffline
 * @returns {Function} cleanup function
 */
export function subscribeToNetworkStatus(onOnline, onOffline) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  const handleOnline = () => {
    if (onOnline) onOnline();
  };
  
  const handleOffline = () => {
    if (onOffline) onOffline();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

const serviceWorker = {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerRegistered,
  sendMessageToSW,
  cacheLessonForOffline,
  getCacheStatus,
  isOnline,
  subscribeToNetworkStatus
};

export default serviceWorker;
