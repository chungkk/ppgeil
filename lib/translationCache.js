// Translation cache utility for client-side caching
const CACHE_KEY = 'translation_cache';
const CACHE_EXPIRY_DAYS = 7;

export const translationCache = {
  get(word, sourceLang = 'de', targetLang = 'vi') {
    if (typeof window === 'undefined') return null;
    
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const key = `${word}_${sourceLang}_${targetLang}`.toLowerCase();
      const cached = cache[key];
      
      if (cached && cached.expiry > Date.now()) {
        return cached.translation;
      }
      
      if (cached && cached.expiry <= Date.now()) {
        delete cache[key];
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  set(word, translation, sourceLang = 'de', targetLang = 'vi') {
    if (typeof window === 'undefined') return;
    
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const key = `${word}_${sourceLang}_${targetLang}`.toLowerCase();
      const expiry = Date.now() + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      cache[key] = {
        translation,
        expiry,
        timestamp: Date.now()
      };
      
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Cache set error:', error);
      if (error.name === 'QuotaExceededError') {
        this.clear();
      }
    }
  },

  clear() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
};
