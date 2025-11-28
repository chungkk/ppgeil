import { useState, useEffect, useRef, useCallback } from 'react';
import { youtubeAPI } from '../youtubeApi';

/**
 * Custom hook for unified media player control (YouTube + HTML5 Audio)
 * Handles play/pause, seek, segment playback, and time updates
 */
export const useDictationPlayer = ({
  lesson,
  transcriptData,
  currentSentenceIndex,
  autoStop = true,
  onSentenceChange
}) => {
  // Player state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentPlayEndTime, setSegmentPlayEndTime] = useState(null);
  const [segmentEndTimeLocked, setSegmentEndTimeLocked] = useState(false);
  const [pausedPositions, setPausedPositions] = useState({});
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  
  // YouTube specific state
  const [isYouTube, setIsYouTube] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  
  // Refs
  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const userSeekTimeoutRef = useRef(null);

  // Extract YouTube video ID
  const getYouTubeVideoId = useCallback((url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }, []);

  // Initialize YouTube API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    youtubeAPI.waitForAPI()
      .then(() => setIsYouTubeAPIReady(true))
      .catch(err => console.error('YouTube API error:', err));
  }, []);

  // Set isYouTube flag
  useEffect(() => {
    setIsYouTube(!!(lesson && lesson.youtubeUrl));
  }, [lesson]);

  // Initialize YouTube player
  useEffect(() => {
    if (!isYouTube || !isYouTubeAPIReady || !lesson) return;

    const playerOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (!videoId) return;

    const initializePlayer = () => {
      const playerElement = document.getElementById('youtube-player');
      if (!playerElement) {
        requestAnimationFrame(initializePlayer);
        return;
      }

      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }

      youtubePlayerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          origin: playerOrigin,
          cc_load_policy: 0,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          widget_referrer: playerOrigin,
          autohide: 1,
        },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration());
            const isMobile = window.innerWidth <= 768;
            if (!isMobile && playerElement.parentElement) {
              const rect = playerElement.parentElement.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                event.target.setSize(rect.width, rect.height);
              }
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
          }
        }
      });
    };

    initializePlayer();

    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile && youtubePlayerRef.current?.setSize) {
        const playerElement = document.getElementById('youtube-player');
        if (playerElement?.parentElement) {
          const rect = playerElement.parentElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            youtubePlayerRef.current.setSize(rect.width, rect.height);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [isYouTube, isYouTubeAPIReady, lesson, getYouTubeVideoId]);

  // Expose refs globally for other components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.mainAudioRef = audioRef;
      window.mainYoutubePlayerRef = youtubePlayerRef;
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.mainAudioRef = null;
        window.mainYoutubePlayerRef = null;
      }
    };
  }, []);

  // Time update with requestAnimationFrame
  useEffect(() => {
    let animationFrameId = null;

    const updateTime = () => {
      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player?.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
          const time = player.getCurrentTime();
          setCurrentTime(time);

          if (autoStop && segmentPlayEndTime !== null && time >= segmentPlayEndTime - 0.02) {
            player.pauseVideo?.();
            setIsPlaying(false);
            setSegmentPlayEndTime(null);
          }
        }
      } else {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          setCurrentTime(audio.currentTime);

          if (autoStop && segmentPlayEndTime !== null && audio.currentTime >= segmentPlayEndTime - 0.02) {
            audio.pause();
            setIsPlaying(false);
            setSegmentPlayEndTime(null);
          }
        }
      }

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, segmentPlayEndTime, isYouTube, autoStop]);

  // Audio event listeners
  useEffect(() => {
    if (isYouTube) return;
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      setSegmentPlayEndTime(null);
      setSegmentEndTimeLocked(false);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    setCurrentTime(audio.currentTime);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [isYouTube]);

  // Auto-update current sentence based on time
  useEffect(() => {
    if (isUserSeeking || !transcriptData.length) return;

    const currentIndex = transcriptData.findIndex(
      (item) => currentTime >= item.start && currentTime < item.end
    );

    if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
      onSentenceChange?.(currentIndex);

      if (!segmentEndTimeLocked) {
        const newSentence = transcriptData[currentIndex];
        if (isYouTube) {
          const player = youtubePlayerRef.current;
          if (player?.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
            setSegmentPlayEndTime(newSentence.end);
          }
        } else {
          const audio = audioRef.current;
          if (audio && !audio.paused) {
            setSegmentPlayEndTime(newSentence.end);
          }
        }
      }
    }
  }, [currentTime, transcriptData, currentSentenceIndex, segmentEndTimeLocked, isYouTube, isUserSeeking, onSentenceChange]);

  // Player control functions
  const handleSeek = useCallback((direction, customSeekTime = null) => {
    const seekTime = customSeekTime || 2;
    const currentSegment = transcriptData[currentSentenceIndex];
    if (!currentSegment) return;

    let newTime;
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player?.getCurrentTime) return;
      
      newTime = player.getCurrentTime();
      newTime = direction === 'backward' ? newTime - seekTime : newTime + seekTime;
      newTime = Math.max(currentSegment.start, Math.min(currentSegment.end - 0.1, newTime));
      player.seekTo?.(newTime);

      if (player.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
        setSegmentPlayEndTime(currentSegment.end);
      }
    } else {
      const audio = audioRef.current;
      if (!audio || !isFinite(audio.duration)) return;

      newTime = audio.currentTime;
      newTime = direction === 'backward' ? newTime - seekTime : newTime + seekTime;
      newTime = Math.max(currentSegment.start, Math.min(currentSegment.end - 0.1, newTime));
      audio.currentTime = newTime;

      if (!audio.paused) {
        setSegmentPlayEndTime(currentSegment.end);
      }
    }
  }, [transcriptData, currentSentenceIndex, isYouTube]);

  const handlePlayPause = useCallback(() => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player) return;

      if (player.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
        player.pauseVideo?.();
        setIsPlaying(false);
      } else {
        if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
          const currentSentence = transcriptData[currentSentenceIndex];
          if (player.getCurrentTime?.() >= currentSentence.end - 0.05) {
            player.seekTo?.(currentSentence.start);
          }
          player.playVideo?.();
          setIsPlaying(true);
          setSegmentPlayEndTime(currentSentence.end);
          setSegmentEndTimeLocked(false);
        } else {
          player.playVideo?.();
          setIsPlaying(true);
          setSegmentEndTimeLocked(false);
        }
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;

      if (audio.paused) {
        if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
          const currentSentence = transcriptData[currentSentenceIndex];
          if (audio.currentTime >= currentSentence.end - 0.05) {
            audio.currentTime = currentSentence.start;
          }
          audio.play();
          setIsPlaying(true);
          setSegmentPlayEndTime(currentSentence.end);
          setSegmentEndTimeLocked(false);
        } else {
          audio.play();
          setIsPlaying(true);
          setSegmentEndTimeLocked(false);
        }
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    }
  }, [transcriptData, currentSentenceIndex, isYouTube]);

  const handleReplayFromStart = useCallback(() => {
    if (transcriptData.length === 0 || currentSentenceIndex >= transcriptData.length) return;
    const currentSentence = transcriptData[currentSentenceIndex];

    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player?.seekTo) return;
      player.seekTo(currentSentence.start);
      player.playVideo?.();
      setIsPlaying(true);
      setSegmentPlayEndTime(currentSentence.end);
      setSegmentEndTimeLocked(true);
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = currentSentence.start;
      audio.play();
      setIsPlaying(true);
      setSegmentPlayEndTime(currentSentence.end);
      setSegmentEndTimeLocked(true);
    }
  }, [transcriptData, currentSentenceIndex, isYouTube]);

  const handleSentenceClick = useCallback((startTime, endTime) => {
    const clickedIndex = transcriptData.findIndex(
      (item) => item.start === startTime && item.end === endTime
    );
    if (clickedIndex === -1) return;

    const isCurrentlyPlayingThisSentence = isPlaying && currentSentenceIndex === clickedIndex;

    if (isCurrentlyPlayingThisSentence) {
      if (isYouTube) {
        youtubePlayerRef.current?.pauseVideo?.();
      } else {
        audioRef.current?.pause();
      }
      setIsPlaying(false);
      setPausedPositions(prev => ({ ...prev, [clickedIndex]: currentTime }));
    } else {
      let seekTime = startTime;
      if (pausedPositions[clickedIndex] && 
          pausedPositions[clickedIndex] >= startTime && 
          pausedPositions[clickedIndex] < endTime) {
        seekTime = pausedPositions[clickedIndex];
      }

      if (userSeekTimeoutRef.current) clearTimeout(userSeekTimeoutRef.current);
      setIsUserSeeking(true);

      if (isYouTube) {
        const player = youtubePlayerRef.current;
        player?.seekTo?.(seekTime);
        player?.playVideo?.();
      } else {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = seekTime;
          audio.play();
        }
      }

      setIsPlaying(true);
      setSegmentPlayEndTime(endTime);
      setSegmentEndTimeLocked(true);
      setPausedPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[clickedIndex];
        return newPositions;
      });

      userSeekTimeoutRef.current = setTimeout(() => setIsUserSeeking(false), 1500);
    }

    onSentenceChange?.(clickedIndex);
  }, [transcriptData, isYouTube, isPlaying, currentTime, pausedPositions, currentSentenceIndex, onSentenceChange]);

  const seekToSentence = useCallback((sentenceIndex) => {
    const sentence = transcriptData[sentenceIndex];
    if (!sentence) return;

    if (isYouTube) {
      youtubePlayerRef.current?.seekTo?.(sentence.start, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = sentence.start;
    }
    setCurrentTime(sentence.start);
    setSegmentPlayEndTime(sentence.end);
  }, [transcriptData, isYouTube]);

  const handleProgressClick = useCallback((e) => {
    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    if (isYouTube) {
      youtubePlayerRef.current?.seekTo?.(newTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  }, [duration, isYouTube]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (userSeekTimeoutRef.current) clearTimeout(userSeekTimeoutRef.current);
    };
  }, []);

  return {
    // State
    currentTime,
    duration,
    isPlaying,
    isYouTube,
    isYouTubeAPIReady,
    segmentPlayEndTime,
    
    // Refs
    audioRef,
    youtubePlayerRef,
    
    // Actions
    handleSeek,
    handlePlayPause,
    handleReplayFromStart,
    handleSentenceClick,
    handleProgressClick,
    seekToSentence,
    setCurrentTime,
    setSegmentPlayEndTime,
    setIsPlaying
  };
};

export default useDictationPlayer;
