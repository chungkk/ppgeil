import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_RETRIES = 20;

/**
 * Hook to initialize and manage YouTube player lifecycle
 * @param {Object} options
 * @param {string} options.videoId - YouTube video ID
 * @param {boolean} options.isAPIReady - Whether YouTube API is loaded
 * @param {string} options.playerId - DOM element ID for the player
 * @param {Function} options.onDurationChange - Callback when duration is available
 * @param {Function} options.onPlayingChange - Callback when playing state changes
 * @param {Function} options.onReady - Callback when player is ready
 * @returns {Object}
 */
export const useYouTubePlayerInit = ({
  videoId,
  isAPIReady,
  playerId = 'youtube-player',
  onDurationChange,
  onPlayingChange,
  onReady,
}) => {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const youtubePlayerRef = useRef(null);
  const playerContainerRef = useRef(null);

  // Memoized resize handler
  const handleResize = useCallback(() => {
    const isMobileView = window.innerWidth <= 768;
    if (!isMobileView && youtubePlayerRef.current?.setSize) {
      const wrapper = playerContainerRef.current?.parentElement;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          youtubePlayerRef.current.setSize(rect.width, rect.height);
        }
      }
    }
  }, []);

  // Player ready handler
  const handlePlayerReady = useCallback((event) => {
    const duration = event.target.getDuration();
    onDurationChange?.(duration);
    setIsPlayerReady(true);
    
    const isMobileView = window.innerWidth <= 768;
    if (!isMobileView) {
      const wrapper = playerContainerRef.current?.parentElement;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          event.target.setSize(rect.width, rect.height);
        }
      }
    }
    
    onReady?.(event.target);
  }, [onDurationChange, onReady]);

  // Player state change handler
  const handlePlayerStateChange = useCallback((event) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      onPlayingChange?.(true);
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      onPlayingChange?.(false);
    }
  }, [onPlayingChange]);

  // Initialize YouTube player
  useEffect(() => {
    if (!isAPIReady || !videoId) {
      setIsPlayerReady(false);
      return;
    }

    let rafId = null;
    let retryCount = 0;

    const initializePlayer = () => {
      if (!playerContainerRef.current) {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          rafId = requestAnimationFrame(initializePlayer);
        } else {
          console.error('YouTube player container not found after max retries');
        }
        return;
      }

      // Destroy existing player if any
      if (youtubePlayerRef.current?.destroy) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        youtubePlayerRef.current = null;
      }

      const playerOrigin = window.location.origin;

      try {
        youtubePlayerRef.current = new window.YT.Player(playerId, {
          height: '100%',
          width: '100%',
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            origin: playerOrigin,
          },
          events: {
            onReady: handlePlayerReady,
            onStateChange: handlePlayerStateChange
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    // Start initialization on next frame
    rafId = requestAnimationFrame(initializePlayer);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);

      if (youtubePlayerRef.current?.destroy) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        youtubePlayerRef.current = null;
      }
      setIsPlayerReady(false);
    };
  }, [videoId, isAPIReady, playerId, handlePlayerReady, handlePlayerStateChange, handleResize]);

  return {
    youtubePlayerRef,
    playerContainerRef,
    isPlayerReady,
  };
};

export default useYouTubePlayerInit;
