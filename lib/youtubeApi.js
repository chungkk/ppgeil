// YouTube API Singleton Manager
// Prevents loading the YouTube API script multiple times

class YouTubeAPIManager {
  constructor() {
    this.isReady = false;
    this.isLoading = false;
    this.callbacks = [];
  }

  // Load the YouTube API script (only once)
  loadAPI() {
    if (typeof window === 'undefined') return Promise.reject('Not in browser');
    
    // If already ready, resolve immediately
    if (this.isReady && window.YT && window.YT.Player) {
      return Promise.resolve();
    }

    // If already loading, return a promise that resolves when ready
    if (this.isLoading) {
      return new Promise((resolve) => {
        this.callbacks.push(resolve);
      });
    }

    // Check if API is already loaded but we haven't set the flag
    if (window.YT && window.YT.Player) {
      this.isReady = true;
      return Promise.resolve();
    }

    // Start loading
    this.isLoading = true;

    return new Promise((resolve, reject) => {
      // Add this resolve to callbacks
      this.callbacks.push(resolve);

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (existingScript) {
        // Script exists, wait for it to load
        const checkInterval = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(checkInterval);
            this.onAPIReady();
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!this.isReady) {
            reject(new Error('YouTube API load timeout'));
          }
        }, 10000);
        return;
      }

      // Load the script
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        this.isLoading = false;
        reject(new Error('Failed to load YouTube API'));
      };

      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      // Set up the global callback
      window.onYouTubeIframeAPIReady = () => {
        this.onAPIReady();
      };
    });
  }

  onAPIReady() {
    this.isReady = true;
    this.isLoading = false;
    
    // Resolve all pending callbacks
    this.callbacks.forEach(callback => callback());
    this.callbacks = [];
  }

  // Check if API is ready
  isAPIReady() {
    return this.isReady && window.YT && window.YT.Player;
  }

  // Wait for API to be ready
  waitForAPI() {
    if (this.isAPIReady()) {
      return Promise.resolve();
    }
    return this.loadAPI();
  }
}

// Export singleton instance
export const youtubeAPI = new YouTubeAPIManager();
