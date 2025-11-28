import { useCallback } from 'react';

/**
 * Hook providing YouTube player control methods
 * @param {React.RefObject} playerRef - Reference to YouTube player instance
 * @returns {Object} Player control methods
 */
export const useYouTubePlayerControls = (playerRef) => {
  const play = useCallback(() => {
    playerRef.current?.playVideo?.();
  }, [playerRef]);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo?.();
  }, [playerRef]);

  const seekTo = useCallback((seconds) => {
    playerRef.current?.seekTo?.(seconds);
  }, [playerRef]);

  const getCurrentTime = useCallback(() => {
    return playerRef.current?.getCurrentTime?.() ?? 0;
  }, [playerRef]);

  const getPlayerState = useCallback(() => {
    return playerRef.current?.getPlayerState?.();
  }, [playerRef]);

  const setPlaybackRate = useCallback((rate) => {
    playerRef.current?.setPlaybackRate?.(rate);
  }, [playerRef]);

  const isPlayerPlaying = useCallback(() => {
    return playerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING;
  }, [playerRef]);

  const getDuration = useCallback(() => {
    return playerRef.current?.getDuration?.() ?? 0;
  }, [playerRef]);

  const setSize = useCallback((width, height) => {
    playerRef.current?.setSize?.(width, height);
  }, [playerRef]);

  return {
    play,
    pause,
    seekTo,
    getCurrentTime,
    getPlayerState,
    setPlaybackRate,
    isPlayerPlaying,
    getDuration,
    setSize,
  };
};

export default useYouTubePlayerControls;
