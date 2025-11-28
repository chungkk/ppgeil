// Simple analytics tracking utility
// Supports multiple analytics providers (GA, custom backend, etc.)

const ANALYTICS_ENABLED = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';

/**
 * Track custom event
 * @param {string} eventName - Name of the event
 * @param {object} properties - Event properties/metadata
 */
export const trackEvent = (eventName, properties = {}) => {
  if (!ANALYTICS_ENABLED) {
    console.log('[Analytics - Dev]', eventName, properties);
    return;
  }

  try {
    // Google Analytics (if available)
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', eventName, properties);
    }

    // Send to custom backend for detailed analytics
    sendToBackend(eventName, properties);

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventName, properties);
    }
  } catch (error) {
    console.error('[Analytics Error]', error);
  }
};

/**
 * Send analytics data to backend
 */
const sendToBackend = async (eventName, properties) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return; // Only track for authenticated users

    await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        event: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      })
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.error('[Analytics Backend Error]', error);
  }
};

/**
 * Track page view
 * @param {string} pageName - Name of the page
 */
export const trackPageView = (pageName) => {
  trackEvent('page_view', {
    page_name: pageName,
    page_path: window.location.pathname
  });
};

/**
 * Dictionary Popup specific events
 */
export const DictionaryAnalytics = {
  // Popup opened
  popupOpened: (word, context = {}) => {
    trackEvent('dictionary_popup_opened', {
      word,
      word_length: word.length,
      ...context
    });
  },

  // Popup closed
  popupClosed: (word, timeSpent, context = {}) => {
    trackEvent('dictionary_popup_closed', {
      word,
      time_spent_ms: timeSpent,
      time_spent_seconds: Math.round(timeSpent / 1000),
      ...context
    });
  },

  // Word saved
  wordSaved: (word, translation, context = {}) => {
    trackEvent('dictionary_word_saved', {
      word,
      translation,
      word_length: word.length,
      ...context
    });
  },

  // Cache hit/miss
  cacheHit: (word, fromLocalStorage = true) => {
    trackEvent('dictionary_cache_hit', {
      word,
      cache_type: fromLocalStorage ? 'localStorage' : 'server'
    });
  },

  cacheMiss: (word) => {
    trackEvent('dictionary_cache_miss', {
      word
    });
  },

  // User interactions
  exampleViewed: (word, exampleIndex) => {
    trackEvent('dictionary_example_viewed', {
      word,
      example_index: exampleIndex
    });
  },

  // Swipe gesture used
  swipedToClose: (word, swipeDistance) => {
    trackEvent('dictionary_swiped_close', {
      word,
      swipe_distance: swipeDistance
    });
  },

  // Errors
  error: (word, errorType, errorMessage) => {
    trackEvent('dictionary_error', {
      word,
      error_type: errorType,
      error_message: errorMessage
    });
  }
};

const analytics = {
  trackEvent,
  trackPageView,
  DictionaryAnalytics
};

export default analytics;
