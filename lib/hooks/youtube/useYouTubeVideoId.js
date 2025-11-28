import { useMemo } from 'react';

/**
 * Extract YouTube video ID from URL
 * @param {string} url 
 * @returns {string|null}
 */
const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Hook to extract and memoize YouTube video ID from URL
 * @param {string} youtubeUrl 
 * @returns {string|null} videoId
 */
export const useYouTubeVideoId = (youtubeUrl) => {
  return useMemo(() => {
    return youtubeUrl ? getYouTubeVideoId(youtubeUrl) : null;
  }, [youtubeUrl]);
};

export default useYouTubeVideoId;
