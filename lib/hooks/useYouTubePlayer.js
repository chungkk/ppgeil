import { useState, useEffect } from 'react';
import { useYouTubeAPI } from './youtube/useYouTubeAPI';
import { useYouTubeVideoId } from './youtube/useYouTubeVideoId';
import { useYouTubePlayerInit } from './youtube/useYouTubePlayerInit';
import { useYouTubePlayerControls } from './youtube/useYouTubePlayerControls';

/**
 * Custom hook to manage YouTube Player
 * Composed from smaller, single-responsibility hooks:
 * - useYouTubeAPI: Handles YouTube IFrame API loading
 * - useYouTubeVideoId: Extracts video ID from URL
 * - useYouTubePlayerInit: Initializes player and manages lifecycle
 * - useYouTubePlayerControls: Provides player control methods
 * 
 * @param {Object} options
 * @param {string} options.youtubeUrl - YouTube video URL
 * @param {string} options.playerId - DOM element ID for the player
 * @param {Function} options.onDurationChange - Callback when duration is available
 * @param {Function} options.onPlayingChange - Callback when playing state changes
 * @param {Function} options.onReady - Callback when player is ready
 * @returns {Object}
 */
export const useYouTubePlayer = ({
  youtubeUrl,
  playerId = 'youtube-player',
  onDurationChange,
  onPlayingChange,
  onReady
}) => {
  const [isYouTube, setIsYouTube] = useState(false);

  // 1. Load YouTube API
  const isAPIReady = useYouTubeAPI();

  // 2. Extract video ID from URL
  const videoId = useYouTubeVideoId(youtubeUrl);

  // 3. Track if URL is YouTube
  useEffect(() => {
    setIsYouTube(!!youtubeUrl);
  }, [youtubeUrl]);

  // 4. Initialize player
  const {
    youtubePlayerRef,
    playerContainerRef,
    isPlayerReady,
  } = useYouTubePlayerInit({
    videoId,
    isAPIReady,
    playerId,
    onDurationChange,
    onPlayingChange,
    onReady,
  });

  // 5. Player controls
  const controls = useYouTubePlayerControls(youtubePlayerRef);

  return {
    // Refs
    youtubePlayerRef,
    playerContainerRef,
    
    // State
    isYouTube,
    isReady: isAPIReady && isPlayerReady,
    videoId,
    
    // Player methods
    ...controls,
  };
};

export default useYouTubePlayer;
