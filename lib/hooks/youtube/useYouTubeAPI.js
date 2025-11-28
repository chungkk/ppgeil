import { useState, useEffect } from 'react';
import { youtubeAPI } from '../../youtubeApi';

/**
 * Hook to manage YouTube API loading state
 * @returns {boolean} isAPIReady
 */
export const useYouTubeAPI = () => {
  const [isAPIReady, setIsAPIReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    youtubeAPI.waitForAPI()
      .then(() => setIsAPIReady(true))
      .catch(err => console.error('YouTube API error:', err));
  }, []);

  return isAPIReady;
};

export default useYouTubeAPI;
