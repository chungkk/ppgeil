/**
 * Dictation Page - Refactored Version
 * 
 * Original file: [lessonId].js (4000+ lines)
 * Refactored file: ~1200 lines
 * 
 * Hooks used:
 * - useVocabularyPopup: Dictionary popup, tooltip, translation
 * - useWordProcessing: Fill-blanks logic, word checking, hints
 * - useFullSentenceMode: C1+C2 full sentence mode
 * - usePointsAnimation: Points +1/-0.5 animations
 * - useLeaderboard: Monthly stats tracking
 * - useMobileGestures: Touch/swipe navigation
 * - useKeyboardShortcuts: Keyboard shortcuts
 * - useStudyTimer: Study time tracking
 * 
 * To use this file instead of the original:
 * 1. Rename [lessonId].js to [lessonId].backup.js
 * 2. Rename this file to [lessonId].js
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateVideoStructuredData, generateBreadcrumbStructuredData } from '../../components/SEO';
import dynamic from 'next/dynamic';
import DictionaryPopup from '../../components/DictionaryPopup';
import WordTooltip from '../../components/WordTooltip';
import WordSuggestionPopup from '../../components/WordSuggestionPopup';
import PointsAnimation from '../../components/PointsAnimation';
import ProgressIndicator from '../../components/ProgressIndicator';

// Dictation Components
import {
  DictationHeader,
  DictationVideoSection,
  TranscriptPanel,
  MobileBottomControls,
  DictationSkeleton
} from '../../components/dictation';

const ShadowingVoiceRecorder = dynamic(() => import('../../components/ShadowingVoiceRecorder'), {
  ssr: false,
  loading: () => <div style={{ width: '40px', height: '40px', background: '#f0f0f0', borderRadius: '50%' }}></div>
});

// Existing Hooks
import { useLessonData } from '../../lib/hooks/useLessonData';
import { useStudyTimer } from '../../lib/hooks/useStudyTimer';
import { youtubeAPI } from '../../lib/youtubeApi';
import { useAuth } from '../../context/AuthContext';
import { navigateWithLocale } from '../../lib/navigation';
import { hapticEvents } from '../../lib/haptics';
import { toast } from 'react-toastify';

// NEW Hooks (Refactored)
import useVocabularyPopup from '../../lib/hooks/useVocabularyPopup';
import useWordProcessing from '../../lib/hooks/useWordProcessing';
import useFullSentenceMode from '../../lib/hooks/useFullSentenceMode';
import usePointsAnimation from '../../lib/hooks/usePointsAnimation';
import useLeaderboard from '../../lib/hooks/useLeaderboard';
import useMobileGestures from '../../lib/hooks/useMobileGestures';
import useKeyboardShortcuts from '../../lib/hooks/useKeyboardShortcuts';

// Styles
import styles from '../../styles/dictationPage.module.css';

// Constants
const DIFFICULTY_TO_PERCENTAGE = {
  'a1': 10, 'a2': 30, 'b1': 30, 'b2': 60,
  'c1': 100, 'c2': 100, 'c1c2': 100
};

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

const DictationPageContent = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lessonId } = router.query;
  
  // ============================================================================
  // CORE STATE
  // ============================================================================
  const [transcriptData, setTranscriptData] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentPlayEndTime, setSegmentPlayEndTime] = useState(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [hidePercentage, setHidePercentage] = useState(30);
  const [difficultyLevel, setDifficultyLevel] = useState('b1');
  const [autoStop, setAutoStop] = useState(true);
  const [dictationMode, setDictationMode] = useState('fill-blanks');
  const [processedText, setProcessedText] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  
  // Progress state
  const [completedSentences, setCompletedSentences] = useState([]);
  const [completedWords, setCompletedWords] = useState({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  
  // Refs
  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const transcriptSectionRef = useRef(null);
  const transcriptItemRefs = useRef({});
  const dictationSlidesRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);
  const hasJumpedToIncomplete = useRef(false);

  // ============================================================================
  // AUTH & DATA HOOKS
  // ============================================================================
  const { user, updateDifficultyLevel } = useAuth();
  const { lesson, progress: loadedProgress, studyTime: loadedStudyTime, isLoading: loading } = useLessonData(lessonId, 'dictation');

  // ============================================================================
  // POINTS ANIMATION HOOK
  // ============================================================================
  const { pointsAnimations, showPointsAnimation, updatePoints } = usePointsAnimation();

  const handleUpdatePoints = useCallback((points, reason, element) => {
    return updatePoints(user, points, reason, element);
  }, [user, updatePoints]);

  // ============================================================================
  // SAVE PROGRESS FUNCTION
  // ============================================================================
  const saveProgress = useCallback(async (updatedCompletedSentences, updatedCompletedWords) => {
    if (!lessonId || !user) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const totalWords = transcriptData.reduce((sum, sentence) => {
        const words = sentence.text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1);
        return sum + words.length;
      }, 0);
      
      let correctWordsCount = 0;
      Object.keys(updatedCompletedWords).forEach(sentenceIdx => {
        correctWordsCount += Object.keys(updatedCompletedWords[sentenceIdx]).length;
      });
      
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          mode: 'dictation',
          progress: {
            completedSentences: updatedCompletedSentences,
            completedWords: updatedCompletedWords,
            currentSentenceIndex,
            totalSentences: transcriptData.length,
            correctWords: correctWordsCount,
            totalWords
          }
        })
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [lessonId, transcriptData, currentSentenceIndex, user]);

  // ============================================================================
  // VOCABULARY POPUP HOOK
  // ============================================================================
  const vocabulary = useVocabularyPopup({
    user,
    lessonId,
    transcriptData,
    currentSentenceIndex,
    isYouTube,
    youtubePlayerRef,
    audioRef
  });

  // ============================================================================
  // WORD PROCESSING HOOK (Fill-blanks mode)
  // ============================================================================
  const wordProcessing = useWordProcessing({
    transcriptData,
    currentSentenceIndex,
    hidePercentage,
    completedSentences,
    setCompletedSentences,
    completedWords,
    setCompletedWords,
    saveProgress,
    updatePoints: handleUpdatePoints,
    user,
    t,
    onWordClickForPopup: vocabulary.handleWordClickForPopup,
    onShowSuggestionPopup: vocabulary.openSuggestionPopup,
    showPointsAnimation
  });

  // ============================================================================
  // FULL SENTENCE MODE HOOK (C1+C2)
  // ============================================================================
  const fullSentence = useFullSentenceMode({
    transcriptData,
    completedSentences,
    setCompletedSentences,
    completedWords,
    setCompletedWords,
    saveProgress,
    updatePoints: handleUpdatePoints,
    wordPointsProcessed: wordProcessing.wordPointsProcessed,
    setWordPointsProcessed: wordProcessing.setWordPointsProcessed
  });

  // ============================================================================
  // LEADERBOARD HOOK
  // ============================================================================
  useLeaderboard({
    user,
    currentSentenceIndex,
    transcriptData
  });

  // ============================================================================
  // NAVIGATION FUNCTIONS
  // ============================================================================
  const sortedTranscriptIndices = useMemo(() => {
    if (!transcriptData || transcriptData.length === 0) return [];
    return [...Array(transcriptData.length).keys()];
  }, [transcriptData]);

  const handleSentenceClick = useCallback((startTime, endTime) => {
    const clickedIndex = transcriptData.findIndex(
      (item) => item.start === startTime && item.end === endTime
    );
    if (clickedIndex === -1) return;

    setCurrentSentenceIndex(clickedIndex);
    
    if (isYouTube && youtubePlayerRef.current?.seekTo) {
      youtubePlayerRef.current.seekTo(startTime);
      youtubePlayerRef.current.playVideo?.();
    } else if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
    setIsPlaying(true);
    setSegmentPlayEndTime(endTime);
  }, [transcriptData, isYouTube]);

  const goToPreviousSentence = useCallback(() => {
    const currentPos = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    if (currentPos > 0) {
      isProgrammaticScrollRef.current = true;
      const newIndex = sortedTranscriptIndices[currentPos - 1];
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
      setTimeout(() => { isProgrammaticScrollRef.current = false; }, 500);
    }
  }, [currentSentenceIndex, transcriptData, handleSentenceClick, sortedTranscriptIndices]);

  const goToNextSentence = useCallback(() => {
    const currentPos = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    if (currentPos < sortedTranscriptIndices.length - 1) {
      isProgrammaticScrollRef.current = true;
      const newIndex = sortedTranscriptIndices[currentPos + 1];
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
      setTimeout(() => { isProgrammaticScrollRef.current = false; }, 500);
    }
  }, [currentSentenceIndex, transcriptData, handleSentenceClick, sortedTranscriptIndices]);

  const handlePlayPause = useCallback(() => {
    hapticEvents.audioPlay();
    
    if (isYouTube && youtubePlayerRef.current) {
      if (isPlaying) {
        youtubePlayerRef.current.pauseVideo?.();
      } else {
        if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
          const currentSentence = transcriptData[currentSentenceIndex];
          if (youtubePlayerRef.current.getCurrentTime?.() >= currentSentence.end - 0.05) {
            youtubePlayerRef.current.seekTo?.(currentSentence.start);
          }
          setSegmentPlayEndTime(currentSentence.end);
        }
        youtubePlayerRef.current.playVideo?.();
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
          const currentSentence = transcriptData[currentSentenceIndex];
          if (audioRef.current.currentTime >= currentSentence.end - 0.05) {
            audioRef.current.currentTime = currentSentence.start;
          }
          setSegmentPlayEndTime(currentSentence.end);
        }
        audioRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, isYouTube, transcriptData, currentSentenceIndex]);

  const handleSeek = useCallback((direction) => {
    const seekTime = 2;
    const currentSegment = transcriptData[currentSentenceIndex];
    if (!currentSegment) return;

    let newTime = currentTime + (direction === 'forward' ? seekTime : -seekTime);
    newTime = Math.max(currentSegment.start, Math.min(currentSegment.end - 0.1, newTime));
    
    if (isYouTube && youtubePlayerRef.current?.seekTo) {
      youtubePlayerRef.current.seekTo(newTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  }, [currentTime, transcriptData, currentSentenceIndex, isYouTube]);

  const handleReplayFromStart = useCallback(() => {
    if (transcriptData.length === 0 || currentSentenceIndex >= transcriptData.length) return;
    const sentence = transcriptData[currentSentenceIndex];
    
    if (isYouTube && youtubePlayerRef.current?.seekTo) {
      youtubePlayerRef.current.seekTo(sentence.start);
      youtubePlayerRef.current.playVideo?.();
    } else if (audioRef.current) {
      audioRef.current.currentTime = sentence.start;
      audioRef.current.play();
    }
    setIsPlaying(true);
    setSegmentPlayEndTime(sentence.end);
  }, [transcriptData, currentSentenceIndex, isYouTube]);

  // ============================================================================
  // MOBILE GESTURES HOOK
  // ============================================================================
  const gestures = useMobileGestures({
    goToNextSentence,
    goToPreviousSentence,
    isProgrammaticScrollRef
  });

  // ============================================================================
  // KEYBOARD SHORTCUTS HOOK
  // ============================================================================
  useKeyboardShortcuts({
    isYouTube,
    youtubePlayerRef,
    audioRef,
    duration,
    handleSeek,
    handlePlayPause,
    goToPreviousSentence,
    goToNextSentence
  });

  // ============================================================================
  // STUDY TIMER
  // ============================================================================
  const { studyTime } = useStudyTimer({
    isPlaying,
    user,
    lessonId,
    mode: 'dictation',
    progressLoaded,
    initialStudyTime: loadedStudyTime || 0
  });

  // ============================================================================
  // INITIALIZATION EFFECTS
  // ============================================================================
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
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
    setIsYouTube(!!lesson?.youtubeUrl);
  }, [lesson]);

  // Load transcript
  useEffect(() => {
    if (lesson?.json) {
      fetch(lesson.json)
        .then(res => res.json())
        .then(data => setTranscriptData(data))
        .catch(err => console.error('Error loading transcript:', err));
    }
  }, [lesson]);

  // Load progress
  useEffect(() => {
    if (loadedProgress !== undefined) {
      setCompletedSentences(loadedProgress.completedSentences || []);
      
      const normalizedWords = {};
      const loadedWords = loadedProgress.completedWords || {};
      Object.keys(loadedWords).forEach(sentenceIdx => {
        const numIdx = parseInt(sentenceIdx);
        normalizedWords[numIdx] = {};
        Object.keys(loadedWords[sentenceIdx]).forEach(wordIdx => {
          normalizedWords[numIdx][parseInt(wordIdx)] = loadedWords[sentenceIdx][wordIdx];
        });
      });
      setCompletedWords(normalizedWords);
      setProgressLoaded(true);
    }
  }, [loadedProgress]);

  // Load difficulty from user
  useEffect(() => {
    if (user?.preferredDifficultyLevel) {
      let level = user.preferredDifficultyLevel;
      if (level === 'c1' || level === 'c2') level = 'c1c2';
      
      setDifficultyLevel(level);
      setHidePercentage(DIFFICULTY_TO_PERCENTAGE[level] || 30);
      setDictationMode(level === 'c1c2' ? 'full-sentence' : 'fill-blanks');
    }
  }, [user]);

  // Initialize YouTube player
  useEffect(() => {
    if (!isYouTube || !isYouTubeAPIReady || !lesson) return;
    
    const videoId = lesson.youtubeUrl?.match(/(?:youtu\.be\/|v=)([^#&?]*)/)?.[1];
    if (!videoId) return;

    const initPlayer = () => {
      const el = document.getElementById('youtube-player');
      if (!el) {
        requestAnimationFrame(initPlayer);
        return;
      }

      if (youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy();
      }

      youtubePlayerRef.current = new window.YT.Player('youtube-player', {
        videoId,
        playerVars: {
          controls: 0, disablekb: 1, fs: 0, modestbranding: 1,
          cc_load_policy: 0, rel: 0, playsinline: 1, enablejsapi: 1
        },
        events: {
          onReady: (e) => setDuration(e.target.getDuration()),
          onStateChange: (e) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
          }
        }
      });
    };

    initPlayer();
    
    return () => {
      if (youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [isYouTube, isYouTubeAPIReady, lesson]);

  // Time update loop with auto-stop
  useEffect(() => {
    let frameId;
    const update = () => {
      if (isYouTube && youtubePlayerRef.current?.getCurrentTime) {
        const time = youtubePlayerRef.current.getCurrentTime();
        setCurrentTime(time);
        
        // Auto-stop at segment end
        if (autoStop && segmentPlayEndTime !== null && time >= segmentPlayEndTime - 0.02) {
          youtubePlayerRef.current.pauseVideo?.();
          setIsPlaying(false);
          setSegmentPlayEndTime(null);
        }
      } else if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        
        // Auto-stop at segment end
        if (autoStop && segmentPlayEndTime !== null && audioRef.current.currentTime >= segmentPlayEndTime - 0.02) {
          audioRef.current.pause();
          setIsPlaying(false);
          setSegmentPlayEndTime(null);
        }
      }
      if (isPlaying) frameId = requestAnimationFrame(update);
    };
    if (isPlaying) frameId = requestAnimationFrame(update);
    return () => frameId && cancelAnimationFrame(frameId);
  }, [isPlaying, isYouTube, autoStop, segmentPlayEndTime]);

  // Update current sentence based on time
  useEffect(() => {
    if (!transcriptData.length) return;
    const idx = transcriptData.findIndex(
      item => currentTime >= item.start && currentTime < item.end
    );
    if (idx !== -1 && idx !== currentSentenceIndex) {
      setCurrentSentenceIndex(idx);
    }
  }, [currentTime, transcriptData, currentSentenceIndex]);

  // Process text for fill-blanks mode
  useEffect(() => {
    if (transcriptData.length > 0 && transcriptData[currentSentenceIndex]) {
      const text = transcriptData[currentSentenceIndex].text;
      const isCompleted = completedSentences.includes(currentSentenceIndex);
      const sentenceWordsCompleted = completedWords[currentSentenceIndex] || {};
      
      const html = wordProcessing.processLevelUp(text, isCompleted, sentenceWordsCompleted, hidePercentage);
      setProcessedText(html);
    }
  }, [currentSentenceIndex, transcriptData, completedSentences, completedWords, hidePercentage, wordProcessing]);

  // Auto-scroll transcript to current sentence
  useEffect(() => {
    if (!isMobile && transcriptItemRefs.current[currentSentenceIndex] && transcriptSectionRef.current) {
      const container = transcriptSectionRef.current;
      const element = transcriptItemRefs.current[currentSentenceIndex];
      
      const elementOffsetTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const containerHeight = container.clientHeight;
      
      const scrollPosition = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2);
      
      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [currentSentenceIndex, isMobile]);

  // Jump to first incomplete sentence
  useEffect(() => {
    if (progressLoaded && sortedTranscriptIndices.length > 0 && !hasJumpedToIncomplete.current && transcriptData.length > 0) {
      const firstIncompleteSentence = sortedTranscriptIndices[0];
      setCurrentSentenceIndex(firstIncompleteSentence);
      
      const targetSentence = transcriptData[firstIncompleteSentence];
      if (targetSentence) {
        if (isYouTube && youtubePlayerRef.current?.seekTo) {
          youtubePlayerRef.current.seekTo(targetSentence.start, true);
          setCurrentTime(targetSentence.start);
        } else if (audioRef.current) {
          audioRef.current.currentTime = targetSentence.start;
          setCurrentTime(targetSentence.start);
        }
        setSegmentPlayEndTime(targetSentence.end);
      }
      
      hasJumpedToIncomplete.current = true;
    }
  }, [progressLoaded, sortedTranscriptIndices, transcriptData, isYouTube]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleDifficultyChange = useCallback(async (newLevel) => {
    setHidePercentage(DIFFICULTY_TO_PERCENTAGE[newLevel] || 30);
    setDifficultyLevel(newLevel);
    setDictationMode(newLevel === 'c1c2' ? 'full-sentence' : 'fill-blanks');
    
    if (user) {
      await updateDifficultyLevel(newLevel);
    }
  }, [user, updateDifficultyLevel]);

  const handleShowAllWords = useCallback((sentenceIndex) => {
    const slideElement = document.querySelector(`[data-sentence-index="${sentenceIndex}"]`)?.parentElement;
    const allInputs = slideElement ? slideElement.querySelectorAll('.word-input') : document.querySelectorAll('.word-input');
    const wordsToComplete = {};

    allInputs.forEach((input) => {
      const wordIndexMatch = input.id.match(/word-(\d+)/);
      if (wordIndexMatch) {
        const wordIndex = parseInt(wordIndexMatch[1]);
        const onInputAttr = input.getAttribute('oninput');
        const match = onInputAttr?.match(/'([^']+)'/);
        if (match) {
          const correctWord = match[1];
          wordsToComplete[wordIndex] = correctWord;
          wordProcessing.saveWord(correctWord);
        }
      }
    });

    setCompletedWords(prevWords => {
      const updatedWords = { ...prevWords };
      if (!updatedWords[sentenceIndex]) {
        updatedWords[sentenceIndex] = {};
      }
      updatedWords[sentenceIndex] = {
        ...updatedWords[sentenceIndex],
        ...wordsToComplete
      };
      
      if (Object.keys(wordsToComplete).length > 0) {
        const sentence = transcriptData[sentenceIndex];
        if (sentence) {
          const words = sentence.text.split(/\s+/);
          const validWordIndices = words.filter(word => {
            const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
            return pureWord.length >= 1;
          });
          
          const totalValidWords = validWordIndices.length;
          const wordsToHideCount = Math.ceil((totalValidWords * hidePercentage) / 100);
          const totalCompletedWords = Object.keys(updatedWords[sentenceIndex]).length;
          
          if (totalCompletedWords >= wordsToHideCount && wordsToHideCount > 0 && !completedSentences.includes(sentenceIndex)) {
            const updatedCompleted = [...completedSentences, sentenceIndex];
            setCompletedSentences(updatedCompleted);
            saveProgress(updatedCompleted, updatedWords);
          } else {
            saveProgress(completedSentences, updatedWords);
          }
        }
      } else {
        saveProgress(completedSentences, updatedWords);
      }
      
      return updatedWords;
    });
  }, [transcriptData, hidePercentage, completedSentences, saveProgress, wordProcessing]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const progressPercentage = useMemo(() => {
    if (!transcriptData.length) return 0;
    let total = 0, completed = 0;
    transcriptData.forEach((seg, idx) => {
      const words = seg.text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1);
      total += words.length;
      completed += Object.keys(completedWords[idx] || {}).length;
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [transcriptData, completedWords]);

  const canGoNext = sortedTranscriptIndices.indexOf(currentSentenceIndex) < sortedTranscriptIndices.length - 1;
  const canGoPrevious = sortedTranscriptIndices.indexOf(currentSentenceIndex) > 0;

  // Lazy loading for mobile slides
  const mobileVisibleIndices = sortedTranscriptIndices;
  const lazySlideRange = useMemo(() => {
    if (!isMobile || mobileVisibleIndices.length === 0) {
      return { start: 0, end: mobileVisibleIndices.length };
    }
    const currentSlideIndex = mobileVisibleIndices.indexOf(currentSentenceIndex);
    if (currentSlideIndex === -1) {
      return { start: 0, end: mobileVisibleIndices.length };
    }
    const start = Math.max(0, currentSlideIndex - 1);
    const end = Math.min(mobileVisibleIndices.length, currentSlideIndex + 2);
    return { start, end };
  }, [isMobile, mobileVisibleIndices, currentSentenceIndex]);

  const lazySlidesToRender = useMemo(() => {
    return mobileVisibleIndices.slice(lazySlideRange.start, lazySlideRange.end);
  }, [mobileVisibleIndices, lazySlideRange]);

  // ============================================================================
  // RENDER
  // ============================================================================
  if (loading) {
    return <DictationSkeleton isMobile={isMobile} />;
  }

  if (!lesson) {
    return (
      <div className={styles.centeredState}>
        <div style={{ textAlign: 'center' }}>
          <h1>❌ Lektion nicht gefunden</h1>
          <p style={{ marginTop: '20px' }}>Lektion mit ID <strong>{lessonId}</strong> existiert nicht.</p>
          <button 
            onClick={() => navigateWithLocale(router, '/')}
            style={{ 
              marginTop: '30px', 
              padding: '12px 24px', 
              fontSize: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ← Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  // Structured data
  const videoData = lesson.youtubeUrl ? generateVideoStructuredData({
    ...lesson,
    title: lesson.displayTitle || lesson.title,
    description: `Diktat Übung: ${lesson.title}. Verbessere dein Hörverstehen und Schreiben durch Diktat-Übungen.`,
    thumbnail: lesson.thumbnail,
    videoUrl: lesson.youtubeUrl,
    duration: duration ? `PT${Math.floor(duration)}S` : undefined,
  }) : null;

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Diktat', url: '/dictation' },
    { name: lesson.displayTitle || lesson.title, url: `/dictation/${lessonId}` }
  ]);

  const structuredDataArray = videoData ? [videoData, breadcrumbData] : [breadcrumbData];

  return (
    <div className={styles.page}>
      <SEO 
        title={`${lesson.displayTitle || lesson.title} - Diktat Übung | PapaGeil`}
        description={`Verbessere dein Deutsch mit Diktat: "${lesson.title}". ✓ Level ${lesson.difficulty || 'A1-C2'} ✓ Hörverstehen trainieren ✓ Rechtschreibung üben ✓ Mit sofortigem Feedback`}
        keywords={`Diktat ${lesson.title}, Deutsch Diktat üben, ${lesson.difficulty || 'A1-C2'} Deutsch`}
        ogType="video.other"
        ogImage={lesson.thumbnail || '/og-image.jpg'}
        canonicalUrl={`/dictation/${lessonId}`}
        locale="de_DE"
        structuredData={structuredDataArray}
      />

      <style jsx global>{`
        @media (max-width: 768px) {
          .header, footer { display: none !important; }
        }
      `}</style>

      <div className={styles.pageContainer}>
        <div className={styles.mainContent}>
          {/* Left Column - Video */}
          <div className={styles.leftSection}>
            <div className={styles.videoHeader}>
              <h3 className={styles.transcriptTitle}>{t('lesson.ui.video')}</h3>
              {!isMobile && (
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={autoStop}
                    onChange={(e) => setAutoStop(e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                  <span className={styles.toggleText}>{t('lesson.ui.autoStop')}</span>
                </label>
              )}
              <div className={styles.studyTimer}>
                <span className={styles.timerIcon}>⏱️</span>
                <span className={styles.timerText}>{formatStudyTime(studyTime)}</span>
              </div>
            </div>

            <div className={styles.videoWrapper}>
              <div className={styles.videoContainer}>
                {isYouTube ? (
                  <div className={styles.videoPlayerWrapper}>
                    <div id="youtube-player"></div>
                    <div className={styles.videoOverlay} onClick={() => transcriptData[currentSentenceIndex] && handleSentenceClick(transcriptData[currentSentenceIndex].start, transcriptData[currentSentenceIndex].end)}>
                      <div className={styles.videoTimer}>
                        ⏱️ {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                    </div>
                  </div>
                ) : lesson.audioUrl ? (
                  <div className={styles.videoPlaceholder}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <div className={styles.videoTimer}>
                      ⏱️ {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                ) : null}
                <audio ref={audioRef} src={lesson.audioUrl} preload="metadata"></audio>
              </div>

              <div className={styles.videoTitleBox}>
                <h3>{lesson.displayTitle || lesson.title}</h3>
              </div>
            </div>
          </div>

          {/* Middle Column - Dictation */}
          <div className={styles.middleSection}>
            <DictationHeader
              isMobile={isMobile}
              currentSentenceIndex={currentSentenceIndex}
              totalSentences={transcriptData.length}
              difficultyLevel={difficultyLevel}
              onDifficultyChange={handleDifficultyChange}
            />

            <div className={styles.dictationContainer}>
              {transcriptData.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                    <div>Loading dictation...</div>
                  </div>
                </div>
              ) : isMobile ? (
                /* Mobile: Horizontal Scrollable Slides */
                <div className={styles.dictationSlidesWrapper}>
                  <div className={styles.dictationSlides} ref={dictationSlidesRef}>
                    {lazySlideRange.start > 0 && (
                      <div className={styles.slidesSpacer} style={{ width: `calc(${lazySlideRange.start} * (94% + 12px))`, flexShrink: 0 }} />
                    )}

                    {lazySlidesToRender.map((originalIndex, arrayIndex) => {
                      const sentence = transcriptData[originalIndex];
                      const isCompleted = completedSentences.includes(originalIndex);
                      const sentenceWordsCompleted = completedWords[originalIndex] || {};
                      const isActive = originalIndex === currentSentenceIndex;
                      
                      const sentenceProcessedText = wordProcessing.processLevelUp(
                        sentence.text,
                        isCompleted,
                        sentenceWordsCompleted,
                        hidePercentage
                      );

                      return (
                        <div
                          key={originalIndex}
                          data-slide-index={lazySlideRange.start + arrayIndex}
                          className={`${styles.dictationSlide} ${isActive ? styles.dictationSlideActive : ''}`}
                          onClick={() => {
                            if (!isActive) {
                              setCurrentSentenceIndex(originalIndex);
                              handleSentenceClick(sentence.start, sentence.end);
                            }
                          }}
                        >
                          {isCompleted && (
                            <div className={styles.slideHeader}>
                              <span className={styles.slideCompleted}>✓</span>
                            </div>
                          )}

                          {dictationMode === 'fill-blanks' ? (
                            <>
                              <div
                                className={styles.dictationInputArea}
                                data-sentence-index={originalIndex}
                                dangerouslySetInnerHTML={{ __html: sentenceProcessedText }}
                                onTouchStart={isActive ? gestures.handleTouchStart : undefined}
                                onTouchMove={isActive ? gestures.handleTouchMove : undefined}
                                onTouchEnd={isActive ? gestures.handleTouchEnd : undefined}
                              />
                              {isActive && (
                                <div className={styles.dictationActions}>
                                  <button className={styles.showAllWordsButton} onClick={(e) => { e.stopPropagation(); handleShowAllWords(originalIndex); }}>
                                    {t('lesson.ui.showAll')}
                                  </button>
                                  <button className={styles.nextButton} onClick={(e) => { e.stopPropagation(); goToNextSentence(); }} disabled={!canGoNext}>
                                    {t('lesson.ui.next')}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                      <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            /* Full Sentence Mode - Mobile */
                            <div
                              className={styles.fullSentenceMode}
                              onTouchStart={isActive ? gestures.handleTouchStart : undefined}
                              onTouchMove={isActive ? gestures.handleTouchMove : undefined}
                              onTouchEnd={isActive ? gestures.handleTouchEnd : undefined}
                            >
                              <div className={styles.fullSentenceDisplay}>
                                {isCompleted ? (
                                  <div className={styles.dictationInputArea} dangerouslySetInnerHTML={{ __html: wordProcessing.renderCompletedSentenceWithWordBoxes(sentence.text) }} />
                                ) : (
                                  <div className={styles.hintSentenceText} data-sentence-index={originalIndex}>
                                    {sentence.text.split(/\s+/).filter(w => w.length > 0).map((word, idx) => {
                                      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
                                      if (pureWord.length === 0) return null;
                                      const isRevealed = fullSentence.revealedHintWords[originalIndex]?.[idx];
                                      const comparisonResult = fullSentence.wordComparisonResults[originalIndex]?.[idx];
                                      const partialCount = fullSentence.partialRevealedChars[originalIndex]?.[idx] || 0;
                                      const wordClass = comparisonResult ? (comparisonResult === 'correct' ? styles.hintWordCorrect : styles.hintWordIncorrect) : (isRevealed ? styles.hintWordRevealed : (partialCount > 0 ? styles.hintWordPartial : ''));
                                      let displayText = comparisonResult || isRevealed ? pureWord : partialCount > 0 ? pureWord.substring(0, partialCount) + '\u00A0'.repeat(pureWord.length - partialCount) : '\u00A0'.repeat(pureWord.length);
                                      return (
                                        <span key={idx} className={styles.hintWordContainer}>
                                          <span className={`${styles.hintWordBox} ${wordClass}`} onClick={() => !comparisonResult && fullSentence.toggleRevealHintWord(originalIndex, idx)}>
                                            {displayText}
                                          </span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className={styles.textareaWithVoice} style={{ position: 'relative' }}>
                                <textarea
                                  className={styles.fullSentenceInput}
                                  placeholder="Nhập toàn bộ câu..."
                                  value={fullSentence.fullSentenceInputs[originalIndex] || ''}
                                  onChange={(e) => {
                                    fullSentence.handleFullSentenceInputChange(originalIndex, e.target.value);
                                    fullSentence.calculatePartialReveals(originalIndex, e.target.value, sentence.text);
                                  }}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fullSentence.handleFullSentenceSubmit(originalIndex); }}}
                                  disabled={isCompleted}
                                  rows={3}
                                  style={{ paddingRight: '50px' }}
                                />
                                {!isCompleted && (
                                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', zIndex: 1 }}>
                                    <ShadowingVoiceRecorder
                                      onTranscript={(text) => {
                                        fullSentence.handleFullSentenceInputChange(originalIndex, text);
                                        fullSentence.calculatePartialReveals(originalIndex, text, sentence.text);
                                      }}
                                      onAudioRecorded={(audioBlob) => console.log('Audio recorded:', audioBlob)}
                                      language="de-DE"
                                    />
                                  </div>
                                )}
                              </div>
                              {isActive && !isCompleted && (
                                <div className={styles.dictationActions}>
                                  <button className={styles.checkButton} onClick={(e) => { e.stopPropagation(); fullSentence.handleFullSentenceSubmit(originalIndex); }}>Kiểm tra</button>
                                  <button className={styles.nextButton} onClick={(e) => { e.stopPropagation(); goToNextSentence(); }} disabled={!canGoNext}>
                                    {t('lesson.ui.next')}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                      <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {lazySlideRange.end < mobileVisibleIndices.length && (
                      <div className={styles.slidesSpacer} style={{ width: `calc(${mobileVisibleIndices.length - lazySlideRange.end} * (94% + 12px))`, flexShrink: 0 }} />
                    )}
                  </div>
                </div>
              ) : (
                /* Desktop: Single Sentence View */
                <>
                  {dictationMode === 'fill-blanks' ? (
                    <>
                      <div
                        className={styles.dictationInputArea}
                        data-sentence-index={currentSentenceIndex}
                        dangerouslySetInnerHTML={{ __html: processedText }}
                        onTouchStart={gestures.handleTouchStart}
                        onTouchMove={gestures.handleTouchMove}
                        onTouchEnd={gestures.handleTouchEnd}
                      />
                      <div className={styles.dictationActions}>
                        <button className={styles.showAllWordsButton} onClick={() => handleShowAllWords(currentSentenceIndex)}>
                          {t('lesson.ui.showAll')}
                        </button>
                        <button className={styles.nextButton} onClick={goToNextSentence} disabled={!canGoNext}>
                          {t('lesson.ui.next')}
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                          </svg>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Full Sentence Mode - Desktop */
                    <div className={styles.fullSentenceMode}>
                      <div className={styles.fullSentenceDisplay}>
                        {completedSentences.includes(currentSentenceIndex) ? (
                          <div className={styles.dictationInputArea} dangerouslySetInnerHTML={{ __html: wordProcessing.renderCompletedSentenceWithWordBoxes(transcriptData[currentSentenceIndex]?.text || '') }} />
                        ) : (
                          <div className={styles.hintSentenceText} data-sentence-index={currentSentenceIndex}>
                            {transcriptData[currentSentenceIndex]?.text.split(/\s+/).filter(w => w.length > 0).map((word, idx) => {
                              const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
                              if (pureWord.length === 0) return null;
                              const isRevealed = fullSentence.revealedHintWords[currentSentenceIndex]?.[idx];
                              const comparisonResult = fullSentence.wordComparisonResults[currentSentenceIndex]?.[idx];
                              const partialCount = fullSentence.partialRevealedChars[currentSentenceIndex]?.[idx] || 0;
                              const wordClass = comparisonResult ? (comparisonResult === 'correct' ? styles.hintWordCorrect : styles.hintWordIncorrect) : (isRevealed ? styles.hintWordRevealed : (partialCount > 0 ? styles.hintWordPartial : ''));
                              let displayText = comparisonResult || isRevealed ? pureWord : partialCount > 0 ? pureWord.substring(0, partialCount) + '\u00A0'.repeat(pureWord.length - partialCount) : '\u00A0'.repeat(pureWord.length);
                              return (
                                <span key={idx} className={styles.hintWordContainer}>
                                  <span className={`${styles.hintWordBox} ${wordClass}`} onClick={() => !comparisonResult && fullSentence.toggleRevealHintWord(currentSentenceIndex, idx)}>
                                    {displayText}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className={styles.textareaWithVoice}>
                        <textarea
                          className={styles.fullSentenceInput}
                          placeholder="Nhập toàn bộ câu..."
                          value={fullSentence.fullSentenceInputs[currentSentenceIndex] || ''}
                          onChange={(e) => {
                            fullSentence.handleFullSentenceInputChange(currentSentenceIndex, e.target.value);
                            if (transcriptData[currentSentenceIndex]) {
                              fullSentence.calculatePartialReveals(currentSentenceIndex, e.target.value, transcriptData[currentSentenceIndex].text);
                            }
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fullSentence.handleFullSentenceSubmit(currentSentenceIndex); }}}
                          disabled={completedSentences.includes(currentSentenceIndex)}
                          rows={3}
                        />
                        {!completedSentences.includes(currentSentenceIndex) && (
                          <div className={styles.dictationVoiceButton}>
                            <ShadowingVoiceRecorder
                              onTranscript={(text) => {
                                fullSentence.handleFullSentenceInputChange(currentSentenceIndex, text);
                                if (transcriptData[currentSentenceIndex]) {
                                  fullSentence.calculatePartialReveals(currentSentenceIndex, text, transcriptData[currentSentenceIndex].text);
                                }
                              }}
                              onAudioRecorded={(audioBlob) => console.log('Audio recorded:', audioBlob)}
                              language="de-DE"
                            />
                          </div>
                        )}
                      </div>
                      <div className={styles.dictationActions}>
                        <button className={styles.checkButton} onClick={() => fullSentence.handleFullSentenceSubmit(currentSentenceIndex)} disabled={completedSentences.includes(currentSentenceIndex)}>
                          Kiểm tra
                        </button>
                        <button className={styles.nextButton} onClick={goToNextSentence} disabled={!canGoNext}>
                          {t('lesson.ui.next')}
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column - Transcript List */}
          {!isMobile && (
            <div className={styles.rightSection}>
              <div className={styles.transcriptHeader}>
                <h3 className={styles.transcriptTitle}>Transcript</h3>
                <ProgressIndicator
                  completedSentences={completedSentences}
                  totalSentences={transcriptData.length}
                  completedWords={completedWords}
                  totalWords={transcriptData.reduce((sum, sentence) => {
                    const words = sentence.text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1);
                    return sum + words.length;
                  }, 0)}
                  difficultyLevel={difficultyLevel}
                  hidePercentage={hidePercentage}
                  studyTime={studyTime}
                />
              </div>
              
              <div className={styles.transcriptSection} ref={transcriptSectionRef}>
                <div className={styles.transcriptList}>
                  {sortedTranscriptIndices.map((originalIndex) => {
                    const segment = transcriptData[originalIndex];
                    const isCompleted = completedSentences.includes(originalIndex);
                    const sentenceWordsCompleted = completedWords[originalIndex] || {};
                    const isChecked = fullSentence.checkedSentences.includes(originalIndex);
                    const effectiveHidePercentage = dictationMode === 'full-sentence' ? 100 : hidePercentage;
                    const sentenceRevealedWords = fullSentence.revealedHintWords[originalIndex] || {};
                    const shouldShowFullText = isCompleted || (dictationMode === 'full-sentence' && isChecked);

                    return (
                      <div
                        key={originalIndex}
                        ref={(el) => { transcriptItemRefs.current[originalIndex] = el; }}
                        className={`${styles.transcriptItem} ${originalIndex === currentSentenceIndex ? styles.active : ''} ${!isCompleted ? styles.incomplete : ''}`}
                        onClick={() => handleSentenceClick(segment.start, segment.end)}
                      >
                        <div className={styles.transcriptItemNumber}>
                          #{originalIndex + 1}
                          {isCompleted && <span className={styles.completedCheck}>✓</span>}
                        </div>
                        <div className={styles.transcriptItemText}>
                          {shouldShowFullText ? segment.text : wordProcessing.maskTextByPercentage(segment.text, originalIndex, effectiveHidePercentage, sentenceWordsCompleted, sentenceRevealedWords)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Controls */}
      {isMobile && (
        <MobileBottomControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onReplay={handleReplayFromStart}
          onPrevious={goToPreviousSentence}
          onNext={goToNextSentence}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
        />
      )}

      {/* Mobile Tooltip */}
      {vocabulary.showTooltip && (
        <WordTooltip
          translation={vocabulary.tooltipTranslation}
          position={vocabulary.tooltipPosition}
          onClose={vocabulary.closeTooltip}
        />
      )}

      {/* Desktop Dictionary Popup */}
      {vocabulary.showVocabPopup && !isMobile && (
        <DictionaryPopup
          word={vocabulary.selectedWord}
          position={vocabulary.popupPosition}
          arrowPosition={vocabulary.popupArrowPosition}
          lessonId={lessonId}
          context={transcriptData[currentSentenceIndex]?.text || ''}
          onClose={vocabulary.closeVocabPopup}
        />
      )}

      {/* Word Suggestion Popup */}
      {vocabulary.showSuggestionPopup && (
        <WordSuggestionPopup
          correctWord={vocabulary.suggestionWord}
          context={vocabulary.suggestionContext}
          wordIndex={vocabulary.suggestionWordIndex}
          position={vocabulary.suggestionPosition}
          onCorrectAnswer={wordProcessing.handleCorrectSuggestion}
          onWrongAnswer={(word, idx, selected) => wordProcessing.handleWrongSuggestion(word, idx, selected, showPointsAnimation)}
          onClose={vocabulary.closeSuggestionPopup}
        />
      )}

      {/* Points animations */}
      {pointsAnimations.map(animation => (
        <PointsAnimation
          key={animation.id}
          points={animation.points}
          startPosition={animation.startPosition}
          endPosition={animation.endPosition}
          onComplete={() => {}}
        />
      ))}
    </div>
  );
};

export default DictationPageContent;
