import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useProgress } from './useProgress';
import { useLessonData } from './useLessonData';
import { useStudyTimer } from './useStudyTimer';
import { useYouTubePlayer } from './useYouTubePlayer';
import { useVoiceRecording } from './useVoiceRecording';
import { useTranscriptNavigation } from './useTranscriptNavigation';
import { useBookmarks } from './useBookmarks';
import { useAuth } from '../../context/AuthContext';
import { speakText } from '../textToSpeech';
import { toast } from 'react-toastify';
import { translationCache } from '../translationCache';
import { compareTexts, getSimilarityScore, getSimilarityFeedback } from '../textSimilarity';

// Sentence translation cache helpers
const SENTENCE_CACHE_KEY = 'sentence_translations';
const SENTENCE_CACHE_EXPIRY_DAYS = 30;

const getSentenceTranslationCache = (lessonId, targetLang) => {
  if (typeof window === 'undefined') return null;
  try {
    const cache = JSON.parse(localStorage.getItem(SENTENCE_CACHE_KEY) || '{}');
    const key = `${lessonId}_${targetLang}`;
    const cached = cache[key];
    if (cached && cached.expiry > Date.now()) {
      return cached.translations;
    }
    return null;
  } catch (error) {
    console.error('Sentence cache get error:', error);
    return null;
  }
};

const setSentenceTranslationCache = (lessonId, targetLang, translations) => {
  if (typeof window === 'undefined') return;
  try {
    const cache = JSON.parse(localStorage.getItem(SENTENCE_CACHE_KEY) || '{}');
    const key = `${lessonId}_${targetLang}`;
    cache[key] = {
      translations,
      expiry: Date.now() + (SENTENCE_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      timestamp: Date.now()
    };
    localStorage.setItem(SENTENCE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Sentence cache set error:', error);
    if (error.name === 'QuotaExceededError') {
      localStorage.removeItem(SENTENCE_CACHE_KEY);
    }
  }
};

const translateSentence = async (text, targetLang) => {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sourceLang: 'de',
        targetLang
      })
    });
    if (response.ok) {
      const data = await response.json();
      return data.translation;
    }
    return null;
  } catch (error) {
    console.error('Translation error:', error);
    return null;
  }
};

const DEBUG_TIMER = false;

const formatTime = (seconds) => {
  if (!isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

const formatStudyTime = (totalSeconds) => {
  if (!isFinite(totalSeconds)) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const useShadowingLogic = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lessonId } = router.query;
  
  const [transcriptData, setTranscriptData] = useState([]);
  const [isTextHidden, setIsTextHidden] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentPlayEndTime, setSegmentPlayEndTime] = useState(null);
  const [segmentEndTimeLocked, setSegmentEndTimeLocked] = useState(false);
  const [pausedPositions, setPausedPositions] = useState({});
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  const [userSeekTimeout, setUserSeekTimeout] = useState(null);

  const { lesson, progress: loadedProgress, studyTime: loadedStudyTime, isLoading: loading } = useLessonData(lessonId, 'shadowing');

  const [autoStop, setAutoStop] = useState(true);
  const [showIPA, setShowIPA] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const [showVocabPopup, setShowVocabPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [popupArrowPosition, setPopupArrowPosition] = useState('right');
  const [clickedWordElement, setClickedWordElement] = useState(null);
  
  const [showWordLoading, setShowWordLoading] = useState(false);
  const [loadingPosition, setLoadingPosition] = useState({ top: 0, left: 0 });
  
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipWord, setTooltipWord] = useState('');
  const [tooltipTranslation, setTooltipTranslation] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  const [sentenceProgressData, setSentenceProgressData] = useState({});

  const { user } = useAuth();

  // Study timer hook - manages study time tracking
  const { studyTime, isTimerRunning, progressLoaded } = useStudyTimer({
    isPlaying,
    user,
    lessonId,
    loadedStudyTime,
    mode: 'shadowing'
  });

  const audioRef = useRef(null);
  const { saveProgress } = useProgress(lessonId, 'shadowing');

  // YouTube Player hook
  const {
    youtubePlayerRef,
    playerContainerRef,
    isYouTube,
    videoId,
    play: ytPlay,
    pause: ytPause,
    seekTo: ytSeekTo,
    getCurrentTime: ytGetCurrentTime,
    getPlayerState: ytGetPlayerState,
    setPlaybackRate: ytSetPlaybackRate,
    isPlayerPlaying: ytIsPlaying,
  } = useYouTubePlayer({
    youtubeUrl: lesson?.youtubeUrl,
    playerId: 'youtube-player-shadowing',
    onDurationChange: setDuration,
    onPlayingChange: setIsPlaying,
  });
  // Voice recording hook
  const {
    recordingStates,
    handleAudioRecorded,
    handleRecordingStateChange,
    playRecordedAudio,
    setComparisonResult,
    getRecordedBlob,
    setRecordingStatesFromProgress
  } = useVoiceRecording();

  // Transcript navigation hook
  const {
    currentSentenceIndex,
    setCurrentSentenceIndex,
    activeTranscriptItemRef,
    transcriptListRef,
    scrollToActiveSentence
  } = useTranscriptNavigation({ totalSentences: transcriptData.length });

  // Bookmarks hook
  const {
    bookmarkedSentences,
    bookmarkedIndices,
    bookmarkCount,
    showOnlyBookmarked,
    setShowOnlyBookmarked,
    toggleBookmark,
    isBookmarked,
    clearAllBookmarks,
  } = useBookmarks(lessonId);

  // Filtered transcript data based on bookmark filter (with originalIndex)
  const filteredTranscriptData = useMemo(() => {
    if (!showOnlyBookmarked) return transcriptData;
    return transcriptData
      .map((item, index) => ({ ...item, originalIndex: index }))
      .filter((item) => bookmarkedSentences.has(item.originalIndex));
  }, [transcriptData, showOnlyBookmarked, bookmarkedSentences]);

  // Get original index from filtered index
  const getOriginalIndex = useCallback((filteredIndex) => {
    if (!showOnlyBookmarked) return filteredIndex;
    const bookmarkedArr = Array.from(bookmarkedSentences).sort((a, b) => a - b);
    return bookmarkedArr[filteredIndex] ?? filteredIndex;
  }, [showOnlyBookmarked, bookmarkedSentences]);

  const hasMigratedRef = useRef(false);
  const sessionStartTimeRef = useRef(Date.now());
  const completedSentencesRef = useRef(new Set());
  const lastStatsUpdateRef = useRef(Date.now());

  // Update monthly leaderboard stats
  const updateMonthlyStats = useCallback(async (forceUpdate = false) => {
    if (!user) return;

    const now = Date.now();
    const timeSinceLastUpdate = (now - lastStatsUpdateRef.current) / 1000;

    if (!forceUpdate && timeSinceLastUpdate < 60) return;

    const totalTimeSpent = Math.floor((now - sessionStartTimeRef.current) / 1000);
    const newSentencesCompleted = completedSentencesRef.current.size;

    if (totalTimeSpent < 10 && newSentencesCompleted === 0 && !forceUpdate) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      await fetch('/api/leaderboard/update-monthly-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timeSpent: totalTimeSpent,
          sentencesCompleted: newSentencesCompleted,
          lessonsCompleted: 0
        })
      });

      sessionStartTimeRef.current = now;
      completedSentencesRef.current.clear();
      lastStatsUpdateRef.current = now;
    } catch (error) {
      console.error('Error updating monthly stats:', error);
    }
  }, [user]);

  // Track sentence completion
  useEffect(() => {
    if (currentSentenceIndex >= 0 && transcriptData[currentSentenceIndex]) {
      completedSentencesRef.current.add(currentSentenceIndex);
    }
  }, [currentSentenceIndex, transcriptData]);

  // Periodic stats update (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      updateMonthlyStats(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updateMonthlyStats]);

  // Save stats on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      updateMonthlyStats(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateMonthlyStats(true);
    };
  }, [updateMonthlyStats]);

  // Load sentence progress data
  useEffect(() => {
    if (!user || !lessonId) return;

    const loadSentenceProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`/api/shadowing-sentence-progress?lessonId=${lessonId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const { data } = await response.json();
          setSentenceProgressData(data);
          
          const newStates = {};
          Object.keys(data).forEach(index => {
            newStates[index] = {
              comparisonResult: {
                overallSimilarity: data[index].accuracyPercent,
                isPassed: data[index].accuracyPercent >= 80,
                score: data[index].bestScore
              }
            };
          });
          setRecordingStatesFromProgress(newStates);
        }
      } catch (error) {
        console.error('Error loading sentence progress:', error);
      }
    };

    loadSentenceProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, lessonId]);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    setIsClientReady(true);
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Expose audioRef globally
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Migrate old progress
  useEffect(() => {
    if (transcriptData.length > 0 && loadedProgress && user && !hasMigratedRef.current) {
      if (loadedProgress.currentSentenceIndex !== undefined && !loadedProgress.totalSentences) {
        console.log('Migrating old progress: adding totalSentences');
        hasMigratedRef.current = true;
        saveProgress({
          ...loadedProgress,
          totalSentences: transcriptData.length
        });
      }
    }
  }, [transcriptData.length, loadedProgress, saveProgress, user]);

  // Load transcript function - defined before useEffect that uses it
  const loadTranscript = useCallback(async (jsonPath) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(jsonPath, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`Không thể tải file JSON tại: ${jsonPath}`);
      const data = await response.json();
      
      // Transform data based on user's native language
      // Support both field formats: translation_en and translationEn
      const targetLang = user?.nativeLanguage || 'vi';
      const transformedData = data.map(item => ({
        ...item,
        translation: targetLang === 'en' 
          ? (item.translation_en || item.translationEn || item.translation)
          : (item.translationVi || item.translation)
      }));
      
      if (DEBUG_TIMER) {
        console.log('Transcript loaded:', {
          path: jsonPath,
          totalSentences: transformedData.length,
          targetLang
        });
      }
      
      setTranscriptData(transformedData);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Timeout loading transcript:', jsonPath);
      } else {
        console.error('Lỗi tải transcript:', error);
      }
    }
  }, [user?.nativeLanguage]);

  // Load transcript when lesson is ready
  useEffect(() => {
    if (lesson?.json) {
      loadTranscript(lesson.json);
    }
  }, [lesson?.json, loadTranscript]);

  // State for translation loading
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentTranslationLang, setCurrentTranslationLang] = useState(null);
  const translationInProgressRef = useRef(false);

  // Process pre-translated data from JSON based on user's language setting
  useEffect(() => {
    if (transcriptData.length === 0) return;
    
    // Check if data already has translations from JSON
    const hasPreTranslations = transcriptData[0]?.translationEn || transcriptData[0]?.translationVi;
    
    if (hasPreTranslations) {
      // Get user's native language setting (default to 'vi')
      const userLang = user?.nativeLanguage || 'vi';
      
      // Select translation based on user's language
      setTranscriptData(prev => prev.map(item => ({
        ...item,
        translation: userLang === 'en' 
          ? (item.translationEn || item.translationVi || '')
          : (item.translationVi || item.translationEn || '')
      })));
    }
  }, [transcriptData.length, user?.nativeLanguage]);

  // Smooth time update with requestAnimationFrame
  useEffect(() => {
    let animationFrameId = null;

    const updateTime = () => {
      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player && player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
          const currentTimeValue = player.getCurrentTime();
          setCurrentTime(currentTimeValue);

          if (autoStop && segmentPlayEndTime !== null && currentTimeValue >= segmentPlayEndTime - 0.02) {
            if (player.pauseVideo) player.pauseVideo();
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
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, segmentPlayEndTime, isYouTube, autoStop]);

  // Audio event listeners
  useEffect(() => {
    if (isYouTube) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
    };

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

  // Update playback speed
  useEffect(() => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (player && player.setPlaybackRate) {
        player.setPlaybackRate(playbackSpeed);
      }
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.playbackRate = playbackSpeed;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackSpeed, isYouTube]);

  // Find current sentence based on time
  useEffect(() => {
    if (isUserSeeking) return;

    if (!transcriptData.length) return;

    const currentIndex = transcriptData.findIndex(
      (item, index) => currentTime >= item.start && currentTime < item.end
    );

    if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(currentIndex);

      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player && player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING && !segmentEndTimeLocked) {
          const newSentence = transcriptData[currentIndex];
          setSegmentPlayEndTime(newSentence.end);
        }
      } else {
        const audio = audioRef.current;
        if (audio && !audio.paused && !segmentEndTimeLocked) {
          const newSentence = transcriptData[currentIndex];
          setSegmentPlayEndTime(newSentence.end);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, transcriptData, currentSentenceIndex, segmentEndTimeLocked, isYouTube, isUserSeeking]);

  

  // Cleanup user seek timeout
  useEffect(() => {
    return () => {
      if (userSeekTimeout) clearTimeout(userSeekTimeout);
    };
  }, [userSeekTimeout]);

  // Calculate popup position
  const calculatePopupPosition = useCallback((element, isMobileView) => {
    const rect = element.getBoundingClientRect();

    if (isMobileView) {
      const tooltipHeight = 200;
      const tooltipWidth = 240;
      const gapFromWord = 20;

      let top = rect.top - tooltipHeight - gapFromWord;
      let left = rect.left + rect.width / 2;
      let arrowPos = 'bottom';

      if (top < 10) {
        top = rect.bottom + gapFromWord;
        arrowPos = 'top';
      }

      const halfWidth = tooltipWidth / 2;
      if (left - halfWidth < 10) {
        left = halfWidth + 10;
      }
      if (left + halfWidth > window.innerWidth - 10) {
        left = window.innerWidth - halfWidth - 10;
      }

      return { top, left, arrowPos };
    } else {
      const popupWidth = 350;
      const popupHeight = 280;
      const gapFromWord = 30;

      const spaceAbove = rect.top;

      let top, left, arrowPos;

      if (spaceAbove >= popupHeight + gapFromWord + 20) {
        top = rect.top - popupHeight - gapFromWord;
        arrowPos = 'bottom';
      } else {
        top = rect.bottom + gapFromWord;
        arrowPos = 'top';
      }

      left = rect.left + rect.width / 2 - popupWidth / 2;

      if (left < 20) {
        left = 20;
      }
      if (left + popupWidth > window.innerWidth - 20) {
        left = window.innerWidth - popupWidth - 20;
      }

      if (top < 20) {
        top = 20;
      }
      if (top + popupHeight > window.innerHeight - 20) {
        top = window.innerHeight - popupHeight - 20;
      }

      return { top, left, arrowPos };
    }
  }, []);

  // Update popup position on scroll
  useEffect(() => {
    if (!showVocabPopup || !clickedWordElement) return;

    let rafId = null;
    let isUpdating = false;

    const updatePopupPosition = () => {
      if (!isUpdating) {
        isUpdating = true;
        rafId = requestAnimationFrame(() => {
          const isMobileView = window.innerWidth <= 768;
          const { top, left, arrowPos } = calculatePopupPosition(clickedWordElement, isMobileView);
          setPopupPosition({ top, left });
          setPopupArrowPosition(arrowPos);
          isUpdating = false;
        });
      }
    };

    window.addEventListener('scroll', updatePopupPosition, true);
    window.addEventListener('resize', updatePopupPosition);

    return () => {
      window.removeEventListener('scroll', updatePopupPosition, true);
      window.removeEventListener('resize', updatePopupPosition);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [showVocabPopup, clickedWordElement, calculatePopupPosition]);

  const handleSentenceClick = useCallback((startTime, endTime) => {
    const clickedIndex = transcriptData.findIndex(
      (item) => item.start === startTime && item.end === endTime
    );
    if (clickedIndex === -1) return;

    const isCurrentlyPlayingThisSentence = isPlaying && currentSentenceIndex === clickedIndex;

    if (isCurrentlyPlayingThisSentence) {
      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player && player.pauseVideo) player.pauseVideo();
      } else {
        const audio = audioRef.current;
        if (audio) audio.pause();
      }
      setIsPlaying(false);
      setPausedPositions(prev => ({ ...prev, [clickedIndex]: currentTime }));
    } else {
      let seekTime = startTime;
      if (pausedPositions[clickedIndex] && pausedPositions[clickedIndex] >= startTime && pausedPositions[clickedIndex] < endTime) {
        seekTime = pausedPositions[clickedIndex];
      }

      if (userSeekTimeout) clearTimeout(userSeekTimeout);
      setIsUserSeeking(true);

      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (!player) return;
        if (player.seekTo) player.seekTo(seekTime);
        if (player.playVideo) player.playVideo();
      } else {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = seekTime;
        audio.play();
      }
      setIsPlaying(true);
      setSegmentPlayEndTime(endTime);
      setSegmentEndTimeLocked(true);
      setPausedPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[clickedIndex];
        return newPositions;
      });

      const timeout = setTimeout(() => {
        setIsUserSeeking(false);
      }, 1500);
      setUserSeekTimeout(timeout);
    }

    setCurrentSentenceIndex(clickedIndex);
    setTimeout(() => scrollToActiveSentence(true), 100); // Force scroll on click
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptData, isYouTube, isPlaying, currentTime, pausedPositions, currentSentenceIndex, userSeekTimeout, scrollToActiveSentence]);

  const goToPreviousSentence = useCallback(() => {
    if (currentSentenceIndex > 0) {
      const newIndex = currentSentenceIndex - 1;
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceIndex, transcriptData, handleSentenceClick]);

  const goToNextSentence = useCallback(() => {
    if (currentSentenceIndex < transcriptData.length - 1) {
      const newIndex = currentSentenceIndex + 1;
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceIndex, transcriptData, handleSentenceClick]);

  // Handle word click for vocabulary popup
  const handleWordClickForPopup = useCallback(async (word, event) => {
    if (typeof window !== 'undefined' && window.mainAudioRef?.current) {
      const audio = window.mainAudioRef.current;
      if (!audio.paused) {
        audio.pause();
      }
    }

    if (isYouTube && youtubePlayerRef.current) {
      const player = youtubePlayerRef.current;
      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        if (player.pauseVideo) player.pauseVideo();
      }
    }

    const cleanedWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    if (!cleanedWord) return;

    speakText(cleanedWord);

    const isMobileView = window.innerWidth <= 768;
    const element = event.target;

    if (isMobileView) {
      const rect = element.getBoundingClientRect();
      const tooltipTop = rect.top - 10;
      const tooltipLeft = rect.left + rect.width / 2;

      setTooltipWord(cleanedWord);
      setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
      setShowTooltip(true);

      let translation = translationCache.get(cleanedWord, 'de', 'vi');
      if (!translation) {
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: cleanedWord,
              context: '',
              sourceLang: 'de',
              targetLang: 'vi'
            })
          });
          if (response.ok) {
            const data = await response.json();
            translation = data.translation;
            translationCache.set(cleanedWord, translation, 'de', 'vi');
          }
        } catch (error) {
          console.error('Translation error:', error);
          translation = 'Übersetzung nicht verfügbar';
        }
      }
      setTooltipTranslation(translation || 'Übersetzung nicht verfügbar');
    } else {
      const { top, left, arrowPos } = calculatePopupPosition(element, isMobileView);

      setClickedWordElement(element);
      setSelectedWord(cleanedWord);
      setPopupPosition({ top, left });
      setPopupArrowPosition(arrowPos);
      setShowVocabPopup(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTube, calculatePopupPosition]);

  // Save vocabulary
  const saveVocabulary = useCallback(async ({ word, translation, notes }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        toast.error(t('lesson.vocabulary.loginRequired'));
        return;
      }

      const context = transcriptData[currentSentenceIndex]?.text || '';

      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          word,
          translation: translation || notes || '',
          context,
          lessonId
        })
      });

      if (response.ok) {
        toast.success(t('lesson.vocabulary.success'));
      } else {
        const error = await response.json();
        toast.error(error.message || t('lesson.vocabulary.error'));
      }
    } catch (error) {
      console.error('Save vocabulary error:', error);
      toast.error(t('lesson.vocabulary.generalError'));
    }
  }, [lessonId, transcriptData, currentSentenceIndex, t]);

  // Update points
  const updatePoints = useCallback(async (pointsChange, reason) => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pointsChange, reason })
      });

      if (response.ok) {
        console.log(`Points updated: ${pointsChange > 0 ? '+' : ''}${pointsChange} (${reason})`);

        if (typeof window !== 'undefined') {
          if (window.refreshUserPoints) {
            window.refreshUserPoints();
          }
          if (pointsChange > 0 && window.showPointsPlusOne) {
            window.showPointsPlusOne();
          }
          if (pointsChange < 0 && window.showPointsMinus) {
            window.showPointsMinus();
          }
          window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { pointsChange, reason } }));
        }
      }
    } catch (error) {
      console.error('Error updating points:', error);
    }
  }, [user]);

  // Save sentence progress
  const saveSentenceProgress = useCallback(async (sentenceIndex, accuracyPercent, score) => {
    if (!user || !lessonId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch('/api/shadowing-sentence-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          sentenceIndex,
          accuracyPercent: Math.round(accuracyPercent),
          score
        })
      });

      const audioBlob = getRecordedBlob(sentenceIndex);
      if (audioBlob) {
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, `sentence_${sentenceIndex}.webm`);
          formData.append('lessonId', lessonId);
          formData.append('sentenceIndex', sentenceIndex.toString());
          formData.append('accuracyPercent', Math.round(accuracyPercent).toString());
          formData.append('score', score.toString());

          const audioResponse = await fetch('/api/save-shadowing-audio', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (audioResponse.ok) {
            const data = await audioResponse.json();
            console.log('Audio saved successfully:', data.audioUrl);
          }
        } catch (audioError) {
          console.error('Error uploading audio:', audioError);
        }
      }

      setSentenceProgressData(prev => ({
        ...prev,
        [sentenceIndex]: {
          accuracyPercent: Math.round(accuracyPercent),
          bestScore: score
        }
      }));
    } catch (error) {
      console.error('Error saving sentence progress:', error);
    }
  }, [user, lessonId, getRecordedBlob]);

  // Handle voice transcript - wraps hook's setComparisonResult with business logic
  const handleVoiceTranscript = useCallback((sentenceIndex, transcript) => {
    if (!transcriptData[sentenceIndex]) {
      return;
    }

    const originalText = transcriptData[sentenceIndex].text;

    const result = compareTexts(originalText, transcript);
    const score = getSimilarityScore(result.overallSimilarity);
    const feedback = getSimilarityFeedback(result.overallSimilarity, 'vi');

    const comparisonResult = {
      ...result,
      score,
      feedback,
      originalText,
      spokenText: transcript
    };

    // Update recording state via hook
    setComparisonResult(sentenceIndex, comparisonResult);

    if (user) {
      updatePoints(score, `Shadowing practice: ${result.overallSimilarity.toFixed(1)}% accuracy`);
      saveSentenceProgress(sentenceIndex, result.overallSimilarity, score);
    }
  }, [transcriptData, user, updatePoints, saveSentenceProgress, setComparisonResult]);

  const handleSeek = useCallback((direction) => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player || !player.getCurrentTime) return;

      const seekTime = 3;
      const currentSegment = transcriptData[currentSentenceIndex];

      if (!currentSegment) return;

      let newTime = player.getCurrentTime();
      if (direction === 'backward') {
        newTime = player.getCurrentTime() - seekTime;
      } else if (direction === 'forward') {
        newTime = player.getCurrentTime() + seekTime;
      }

      newTime = Math.max(currentSegment.start, Math.min(currentSegment.end - 0.1, newTime));
      if (player.seekTo) player.seekTo(newTime);

      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        setSegmentPlayEndTime(currentSegment.end);
      }
    } else {
      const audio = audioRef.current;
      if (!audio || !isFinite(audio.duration)) return;

      const seekTime = 3;
      const currentSegment = transcriptData[currentSentenceIndex];

      if (!currentSegment) return;

      let newTime = audio.currentTime;
      if (direction === 'backward') {
        newTime = audio.currentTime - seekTime;
      } else if (direction === 'forward') {
        newTime = audio.currentTime + seekTime;
      }

      newTime = Math.max(currentSegment.start, Math.min(currentSegment.end - 0.1, newTime));
      audio.currentTime = newTime;

      if (!audio.paused) {
        setSegmentPlayEndTime(currentSegment.end);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptData, currentSentenceIndex, isYouTube]);

  const handlePlayPause = useCallback(() => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player) return;

      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        if (player.pauseVideo) player.pauseVideo();
        setIsPlaying(false);
      } else {
        if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
          const currentSentence = transcriptData[currentSentenceIndex];

          if (player.getCurrentTime && player.getCurrentTime() >= currentSentence.end - 0.05) {
            if (player.seekTo) player.seekTo(currentSentence.start);
          }

          if (player.playVideo) player.playVideo();
          setIsPlaying(true);
          setSegmentPlayEndTime(currentSentence.end);
          setSegmentEndTimeLocked(false);

          saveProgress({
            currentSentenceIndex,
            totalSentences: transcriptData.length,
            lastPlayed: new Date()
          });
        } else {
          if (player.playVideo) player.playVideo();
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

          saveProgress({
            currentSentenceIndex,
            totalSentences: transcriptData.length,
            lastPlayed: new Date()
          });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptData, currentSentenceIndex, isYouTube, saveProgress]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const isMediaReady = isYouTube ? (youtubePlayerRef.current && duration > 0) : (audioRef.current && isFinite(audioRef.current.duration));

      switch (event.key) {
        case 'ArrowLeft':
          if (isMediaReady) {
            event.preventDefault();
            handleSeek('backward');
          }
          break;
        case 'ArrowRight':
          if (isMediaReady) {
            event.preventDefault();
            handleSeek('forward');
          }
          break;
        case ' ':
          if (isMediaReady) {
            event.preventDefault();
            handlePlayPause();
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          goToPreviousSentence();
          break;
        case 'ArrowDown':
          event.preventDefault();
          goToNextSentence();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSeek, handlePlayPause, goToPreviousSentence, goToNextSentence, isYouTube, duration]);

  // Handle progress bar click
  const handleProgressClick = useCallback((e) => {
    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (player?.seekTo) {
        player.seekTo(newTime);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, isYouTube]);

  return {
    // State
    t,
    router,
    lessonId,
    lesson,
    loading,
    transcriptData,
    currentTime,
    duration,
    isPlaying,
    currentSentenceIndex,
    autoStop,
    setAutoStop,
    showIPA,
    setShowIPA,
    showTranslation,
    setShowTranslation,
    playbackSpeed,
    setPlaybackSpeed,
    showVocabPopup,
    setShowVocabPopup,
    selectedWord,
    popupPosition,
    popupArrowPosition,
    clickedWordElement,
    setClickedWordElement,
    showWordLoading,
    loadingPosition,
    showTooltip,
    setShowTooltip,
    tooltipWord,
    tooltipTranslation,
    tooltipPosition,
    isMobile,
    isClientReady,
    recordingStates,
    sentenceProgressData,
    studyTime,
    isYouTube,
    user,
    isTranslating,

    // Refs
    audioRef,
    youtubePlayerRef,
    playerContainerRef,
    activeTranscriptItemRef,
    transcriptListRef,

    // Functions
    handleSentenceClick,
    goToPreviousSentence,
    goToNextSentence,
    handleWordClickForPopup,
    handleVoiceTranscript,
    handleAudioRecorded,
    handleRecordingStateChange,
    playRecordedAudio,
    handleSeek,
    handlePlayPause,
    handleProgressClick,
    formatTime,
    formatStudyTime,
    saveVocabulary,

    // Bookmarks
    bookmarkedSentences,
    bookmarkedIndices,
    bookmarkCount,
    showOnlyBookmarked,
    setShowOnlyBookmarked,
    toggleBookmark,
    isBookmarked,
    clearAllBookmarks,
    filteredTranscriptData,
    getOriginalIndex,
  };
};

export default useShadowingLogic;
