import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import DictionaryPopup from '../../components/DictionaryPopup';
import ProgressIndicator from '../../components/ProgressIndicator';
import PointsAnimation from '../../components/PointsAnimation';
import FlipCounter from '../../components/FlipCounter';

import { DictationHeader, DictationSkeleton, TranscriptPanel, DictationVideoSection } from '../../components/dictation';

import { useLessonData } from '../../lib/hooks/useLessonData';
import { useStudyTimer } from '../../lib/hooks/useStudyTimer';
import { youtubeAPI } from '../../lib/youtubeApi';
import { useAuth } from '../../context/AuthContext';
import { hapticEvents } from '../../lib/haptics';
import { calculateSimilarity, maskTextByPercentage } from '../../lib/dictationUtils';
import styles from '../../styles/dictationPage.module.css';

const DictationPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lessonId } = router.query;

  // State management
  const [transcriptData, setTranscriptData] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [segmentPlayEndTime, setSegmentPlayEndTime] = useState(null);

  // Dictation input states
  const [userInputs, setUserInputs] = useState({}); // { sentenceIndex: inputText }
  const [wordInputs, setWordInputs] = useState({}); // { sentenceIndex: { wordIndex: inputText } } - per-word inputs
  const [results, setResults] = useState({}); // { sentenceIndex: { similarity, isCorrect, showAnswer } }
  const [completedSentences, setCompletedSentences] = useState([]);
  const [completedWords, setCompletedWords] = useState({});
  const [checkedSentences, setCheckedSentences] = useState([]);
  const [revealedHintWords, setRevealedHintWords] = useState({});
  const [comparedWords, setComparedWords] = useState({}); // { sentenceIndex: { wordIndex: { isCorrect, userWord, correctWord } } }
  const [revealedWordsByClick, setRevealedWordsByClick] = useState({}); // { sentenceIndex: { wordIndex: true } } - words revealed by double-click
  const [focusedWordIndex, setFocusedWordIndex] = useState(null); // Track which word input is focused
  const lastFocusedWordIndexRef = useRef(null); // Keep track of last focused word for hint button
  const [mobileCursorWordIndex, setMobileCursorWordIndex] = useState(0); // Track word index at cursor position in mobile textarea
  const [hintClickCount, setHintClickCount] = useState({}); // { sentenceIndex: count } - Count hint clicks per sentence, deduct 1 point from 3rd click onwards
  const [sentencePointsAwarded, setSentencePointsAwarded] = useState({}); // { sentenceIndex: true } - track which sentences got points
  const [sentenceRevealPenalty, setSentenceRevealPenalty] = useState({}); // { sentenceIndex: true } - track which sentences got penalty for revealing too many words
  const [pointsAnimations, setPointsAnimations] = useState([]);

  // Playback speed
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Auto stop at end of sentence
  const [autoStop, setAutoStop] = useState(true);

  // Translation toggle
  const [showTranslation, setShowTranslation] = useState(true);

  // Dictionary popup
  const [showVocabPopup, setShowVocabPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Use SWR hook for lesson data
  const { lesson, progress: loadedProgress, studyTime: loadedStudyTime, isLoading: loading } = useLessonData(lessonId, 'dictation');
  const { user, userPoints } = useAuth();

  // Study timer
  const { studyTime } = useStudyTimer({
    isPlaying,
    user,
    lessonId,
    loadedStudyTime,
    mode: 'dictation'
  });

  // Load progress from database
  useEffect(() => {
    if (loadedProgress) {
      if (loadedProgress.completedSentences) {
        setCompletedSentences(loadedProgress.completedSentences);
      }
      if (loadedProgress.checkedSentences) {
        setCheckedSentences(loadedProgress.checkedSentences);
      }
      if (loadedProgress.sentencePointsAwarded) {
        setSentencePointsAwarded(loadedProgress.sentencePointsAwarded);
      }
      if (loadedProgress.sentenceRevealPenalty) {
        setSentenceRevealPenalty(loadedProgress.sentenceRevealPenalty);
      }
      if (loadedProgress.revealedWordsByClick) {
        setRevealedWordsByClick(loadedProgress.revealedWordsByClick);
      }
      if (loadedProgress.userInputs) {
        setUserInputs(loadedProgress.userInputs);
      }
      if (loadedProgress.wordInputs) {
        setWordInputs(loadedProgress.wordInputs);
      }
      if (loadedProgress.hintClickCount) {
        setHintClickCount(loadedProgress.hintClickCount);
      }
    }
  }, [loadedProgress]);

  // Save progress to database
  const saveProgress = useCallback(async (updates = {}) => {
    if (!lessonId || !user) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const currentCompletedSentences = updates.completedSentences ?? completedSentences;
      const completedCount = Array.isArray(currentCompletedSentences) 
        ? currentCompletedSentences.length 
        : Object.keys(currentCompletedSentences || {}).length;

      const progressData = {
        completedSentences: currentCompletedSentences,
        checkedSentences: updates.checkedSentences ?? checkedSentences,
        sentencePointsAwarded: updates.sentencePointsAwarded ?? sentencePointsAwarded,
        sentenceRevealPenalty: updates.sentenceRevealPenalty ?? sentenceRevealPenalty,
        revealedWordsByClick: updates.revealedWordsByClick ?? revealedWordsByClick,
        userInputs: updates.userInputs ?? userInputs,
        wordInputs: updates.wordInputs ?? wordInputs,
        hintClickCount: updates.hintClickCount ?? hintClickCount,
        totalSentences: transcriptData.length,
        // Add fields for completion calculation
        correctWords: completedCount,
        totalWords: transcriptData.length
      };

      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          mode: 'dictation',
          progress: progressData
        })
      });

      if (response.ok) {
        console.log('✅ Dictation progress saved');
      }
    } catch (error) {
      console.error('Error saving dictation progress:', error);
    }
  }, [lessonId, user, completedSentences, checkedSentences, sentencePointsAwarded, sentenceRevealPenalty, revealedWordsByClick, userInputs, wordInputs, hintClickCount, transcriptData.length]);

  // Debounced save for user inputs
  const saveInputTimeoutRef = useRef(null);
  const debouncedSaveInput = useCallback((newUserInputs) => {
    if (saveInputTimeoutRef.current) {
      clearTimeout(saveInputTimeoutRef.current);
    }
    saveInputTimeoutRef.current = setTimeout(() => {
      saveProgress({ userInputs: newUserInputs });
    }, 1000); // Save after 1 second of no typing
  }, [saveProgress]);

  // Refs
  const youtubePlayerRef = useRef(null);
  const audioRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  const inputRefs = useRef({});
  const checkAnswerRef = useRef(null); // Ref to hold checkAnswer function for auto-check

  // User seeking state (to prevent auto-update during click navigation)
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  const [userSeekTimeout, setUserSeekTimeout] = useState(null);

  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [voiceComparisonResult, setVoiceComparisonResult] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const playbackRef = useRef(null);

  // Extract YouTube video ID
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Initialize YouTube API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    youtubeAPI.waitForAPI()
      .then(() => setIsYouTubeAPIReady(true))
      .catch(err => console.error('YouTube API error:', err));
  }, []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set isYouTube flag
  useEffect(() => {
    setIsYouTube(!!lesson?.youtubeUrl);
  }, [lesson]);

  // Initialize YouTube player
  useEffect(() => {
    if (!isYouTube || !isYouTubeAPIReady || !lesson) return;

    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (!videoId) return;

    const initializePlayer = () => {
      const playerElement = document.getElementById('youtube-player');
      if (!playerElement) {
        requestAnimationFrame(initializePlayer);
        return;
      }

      if (youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }

      youtubePlayerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration());
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

    return () => {
      if (youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [isYouTube, isYouTubeAPIReady, lesson]);

  // Load transcript
  useEffect(() => {
    if (lesson?.json) {
      loadTranscript(lesson.json);
    }
  }, [lesson]);

  const loadTranscript = async (jsonPath) => {
    try {
      const response = await fetch(jsonPath);
      if (!response.ok) throw new Error('Failed to load transcript');
      const data = await response.json();
      setTranscriptData(data);
    } catch (error) {
      console.error('Error loading transcript:', error);
    }
  };

  // Time update loop
  useEffect(() => {
    let animationFrameId = null;

    const updateTime = () => {
      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player?.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
          const time = player.getCurrentTime();
          setCurrentTime(time);

          // Auto-stop at segment end (only if autoStop is enabled)
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

  // Auto-update current sentence based on time (only when playing)
  useEffect(() => {
    if (isUserSeeking) return; // Skip auto-update during user seek
    if (!isPlaying) return; // Don't auto-update when paused (keep current sentence after auto-stop)
    if (!transcriptData.length) return;

    const currentIndex = transcriptData.findIndex(
      (item) => currentTime >= item.start && currentTime < item.end
    );

    if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(currentIndex);
    }
  }, [currentTime, transcriptData, currentSentenceIndex, isUserSeeking, isPlaying]);

  // Cleanup user seek timeout
  useEffect(() => {
    return () => {
      if (userSeekTimeout) clearTimeout(userSeekTimeout);
    };
  }, [userSeekTimeout]);

  // Play sentence (with user seeking flag to prevent auto-update interference)
  const playSentence = useCallback((index) => {
    const sentence = transcriptData[index];
    if (!sentence) return;

    // Clear previous timeout and set user seeking flag
    if (userSeekTimeout) clearTimeout(userSeekTimeout);
    setIsUserSeeking(true);

    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (player?.seekTo) {
        player.seekTo(sentence.start);
        player.playVideo?.();
      }
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = sentence.start;
        audio.play();
      }
    }

    setIsPlaying(true);
    setSegmentPlayEndTime(sentence.end);
    setCurrentSentenceIndex(index);

    // Reset seeking flag after seek completes (allows smooth transition)
    const timeout = setTimeout(() => {
      setIsUserSeeking(false);
    }, 1500);
    setUserSeekTimeout(timeout);
  }, [transcriptData, isYouTube, userSeekTimeout]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    hapticEvents.audioPlay();

    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player) return;

      if (player.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
        player.pauseVideo?.();
        setIsPlaying(false);
      } else {
        const sentence = transcriptData[currentSentenceIndex];
        if (sentence && player.getCurrentTime?.() >= sentence.end - 0.05) {
          player.seekTo(sentence.start);
        }
        player.playVideo?.();
        setIsPlaying(true);
        if (sentence) setSegmentPlayEndTime(sentence.end);
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;

      if (audio.paused) {
        const sentence = transcriptData[currentSentenceIndex];
        if (sentence && audio.currentTime >= sentence.end - 0.05) {
          audio.currentTime = sentence.start;
        }
        audio.play();
        setIsPlaying(true);
        if (sentence) setSegmentPlayEndTime(sentence.end);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    }
  }, [transcriptData, currentSentenceIndex, isYouTube]);

  // Normalize word for comparison
  const normalizeWord = (word) => {
    return word
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:"""''„]/g, '');
  };

  // Compare words between user input and correct text - by position (1:1 mapping)
  const compareWords = useCallback((userInput, correctText) => {
    const userWords = userInput.trim().split(/\s+/).filter(w => w.length > 0);
    const correctWords = correctText.split(/\s+/).filter(w => w.length > 0);

    const wordComparison = {};

    // Compare words by position (user word 0 with correct word 0, etc.)
    correctWords.forEach((correctWord, index) => {
      const normalizedCorrect = normalizeWord(correctWord);
      const pureCorrectWord = correctWord.replace(/[.,!?;:"""''„]/g, '');

      // Get user word at same position
      const userWord = userWords[index];

      if (!userWord) {
        // No user word at this position
        wordComparison[index] = {
          isCorrect: false,
          matchedChars: 0,
          userWord: null,
          correctWord: correctWord
        };
        return;
      }

      const normalizedUser = normalizeWord(userWord);

      // Exact match
      if (normalizedUser === normalizedCorrect) {
        wordComparison[index] = {
          isCorrect: true,
          matchedChars: pureCorrectWord.length,
          userWord: userWord,
          correctWord: correctWord
        };
        return;
      }

      // Partial match - count matching characters from start
      let matchingChars = 0;
      for (let i = 0; i < Math.min(normalizedCorrect.length, normalizedUser.length); i++) {
        if (normalizedCorrect[i] === normalizedUser[i]) {
          matchingChars++;
        } else {
          break;
        }
      }

      wordComparison[index] = {
        isCorrect: false,
        matchedChars: matchingChars,
        userWord: userWord,
        correctWord: correctWord
      };
    });

    return wordComparison;
  }, []);

  // Restore comparedWords from saved userInputs after page load
  const hasRestoredComparedWords = useRef(false);
  useEffect(() => {
    if (hasRestoredComparedWords.current) return;
    if (!transcriptData.length || !Object.keys(userInputs).length) return;

    const restoredComparedWords = {};
    Object.entries(userInputs).forEach(([index, value]) => {
      const correctText = transcriptData[index]?.text;
      if (value && correctText) {
        restoredComparedWords[index] = compareWords(value, correctText);
      }
    });

    if (Object.keys(restoredComparedWords).length > 0) {
      setComparedWords(restoredComparedWords);
      hasRestoredComparedWords.current = true;
    }
  }, [transcriptData, userInputs, compareWords]);

  // Handle input change with realtime word comparison
  const handleInputChange = useCallback((index, value) => {
    const newUserInputs = { ...userInputs, [index]: value };
    setUserInputs(newUserInputs);

    // Debounced save to database
    debouncedSaveInput(newUserInputs);

    // Realtime: compare words as user types
    const correctText = transcriptData[index]?.text || '';
    if (value.trim() && correctText) {
      const wordComparison = compareWords(value, correctText);
      setComparedWords(prev => ({
        ...prev,
        [index]: wordComparison
      }));

      // Auto-check: if all words are correct and word count matches, auto-submit
      const correctWords = correctText.split(/\s+/).filter(w => w.length > 0);
      const userWords = value.trim().split(/\s+/).filter(w => w.length > 0);
      const allWordsCorrect = Object.values(wordComparison).every(w => w.isCorrect);
      const wordCountMatches = userWords.length === correctWords.length;

      // Only auto-check if not already completed and points not already awarded
      if (allWordsCorrect && wordCountMatches && !completedSentences.includes(index) && !sentencePointsAwarded[index]) {
        // Use setTimeout to avoid state update during render
        // Use ref to avoid circular dependency
        setTimeout(() => {
          if (checkAnswerRef.current) {
            checkAnswerRef.current(index);
          }
        }, 100);
      }
    } else {
      // Clear comparison if input is empty
      setComparedWords(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  }, [transcriptData, compareWords, userInputs, debouncedSaveInput, completedSentences, sentencePointsAwarded]);

  // Handle per-word input change
  const handleWordInputChange = useCallback((sentenceIndex, wordIndex, value) => {
    // Update wordInputs state
    const newWordInputs = {
      ...wordInputs,
      [sentenceIndex]: {
        ...(wordInputs[sentenceIndex] || {}),
        [wordIndex]: value
      }
    };
    setWordInputs(newWordInputs);

    // Rebuild full sentence from word inputs for comparison
    const correctText = transcriptData[sentenceIndex]?.text || '';
    const correctWords = correctText.split(/\s+/).filter(w => w.length > 0);
    
    // Build user input string from all word inputs
    const userWords = correctWords.map((_, i) => newWordInputs[sentenceIndex]?.[i] || '');
    const fullUserInput = userWords.join(' ').trim();
    
    // Update userInputs for compatibility
    const newUserInputs = { ...userInputs, [sentenceIndex]: fullUserInput };
    setUserInputs(newUserInputs);

    // Debounced save
    if (saveInputTimeoutRef.current) {
      clearTimeout(saveInputTimeoutRef.current);
    }
    saveInputTimeoutRef.current = setTimeout(() => {
      saveProgress({ userInputs: newUserInputs, wordInputs: newWordInputs });
    }, 1000);

    // Compare words
    if (fullUserInput.trim() && correctText) {
      const wordComparison = compareWords(fullUserInput, correctText);
      setComparedWords(prev => ({
        ...prev,
        [sentenceIndex]: wordComparison
      }));

      // Check if current word is correct - auto jump to next
      const currentWordCorrect = wordComparison[wordIndex]?.isCorrect;
      if (currentWordCorrect) {
        // Use setTimeout to allow state to update first
        setTimeout(() => {
          // Find next incomplete word
          for (let i = wordIndex + 1; i < correctWords.length; i++) {
            if (!wordComparison[i]?.isCorrect) {
              const nextInput = document.querySelector(`[data-word-input="${sentenceIndex}-${i}"]`);
              if (nextInput) {
                nextInput.focus();
                break;
              }
            }
          }
        }, 50);
      }

      // Auto-check if all words correct
      const allWordsCorrect = Object.values(wordComparison).every(w => w.isCorrect);
      const filledWordsCount = userWords.filter(w => w.trim()).length;
      const wordCountMatches = filledWordsCount === correctWords.length;

      if (allWordsCorrect && wordCountMatches && !completedSentences.includes(sentenceIndex) && !sentencePointsAwarded[sentenceIndex]) {
        setTimeout(() => {
          if (checkAnswerRef.current) {
            checkAnswerRef.current(sentenceIndex);
          }
        }, 100);
      }
    } else {
      setComparedWords(prev => {
        const updated = { ...prev };
        delete updated[sentenceIndex];
        return updated;
      });
    }
  }, [wordInputs, transcriptData, userInputs, compareWords, completedSentences, sentencePointsAwarded, saveProgress]);

  // Focus next word input
  const focusNextWordInput = useCallback((sentenceIndex, currentWordIndex) => {
    const correctText = transcriptData[sentenceIndex]?.text || '';
    const correctWords = correctText.split(/\s+/).filter(w => w.length > 0);
    
    // Find next empty/incomplete word input
    for (let i = currentWordIndex + 1; i < correctWords.length; i++) {
      const inputEl = document.querySelector(`[data-word-input="${sentenceIndex}-${i}"]`);
      if (inputEl) {
        inputEl.focus();
        return;
      }
    }
  }, [transcriptData]);

  // Show points animation
  const showPointsAnimation = useCallback((points, element) => {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const startPosition = {
      top: rect.top + rect.height / 2 - 10,
      left: rect.left + rect.width / 2
    };

    const headerBadge = document.querySelector('[title="Your total points"]');
    let endPosition = null;

    if (headerBadge) {
      const badgeRect = headerBadge.getBoundingClientRect();
      endPosition = {
        top: badgeRect.top + badgeRect.height / 2,
        left: badgeRect.left + badgeRect.width / 2
      };
    } else {
      endPosition = {
        top: startPosition.top - 100,
        left: startPosition.left
      };
    }

    const animationId = Date.now() + Math.random();
    setPointsAnimations(prev => [...prev, {
      id: animationId,
      points,
      startPosition,
      endPosition
    }]);

    setTimeout(() => {
      setPointsAnimations(prev => prev.filter(a => a.id !== animationId));
    }, 1000);
  }, []);

  // Update points on server
  const updatePoints = useCallback(async (pointsChange, reason, element = null) => {
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
        const data = await response.json();
        console.log(`✅ Points updated: ${pointsChange > 0 ? '+' : ''}${pointsChange} (${reason})`, data);

        if (element) {
          showPointsAnimation(pointsChange, element);
        }

        if (typeof window !== 'undefined') {
          if (pointsChange > 0 && window.showPointsPlusOne) {
            window.showPointsPlusOne(pointsChange);
          }

          setTimeout(() => {
            if (window.refreshUserPoints) {
              window.refreshUserPoints();
            }
          }, 100);

          window.dispatchEvent(new CustomEvent('pointsUpdated', {
            detail: { pointsChange, reason }
          }));
        }
      } else {
        console.error('❌ Failed to update points:', response.status);
      }
    } catch (error) {
      console.error('Error updating points:', error);
    }
  }, [user, showPointsAnimation]);

  // Check answer
  const checkAnswer = useCallback((index) => {
    const userInput = userInputs[index] || '';
    const correctText = transcriptData[index]?.text || '';

    if (!userInput.trim()) return;

    const similarity = calculateSimilarity(userInput, correctText);
    const isCorrect = similarity >= 80;

    // Compare words and store result
    const wordComparison = compareWords(userInput, correctText);
    setComparedWords(prev => ({
      ...prev,
      [index]: wordComparison
    }));

    // Update results but don't show answer yet (showAnswer: false)
    setResults(prev => ({
      ...prev,
      [index]: { similarity, isCorrect, showAnswer: false }
    }));

    // Mark as checked to reveal in transcript
    const newCheckedSentences = checkedSentences.includes(index)
      ? checkedSentences
      : [...checkedSentences, index];
    if (!checkedSentences.includes(index)) {
      setCheckedSentences(newCheckedSentences);
    }

    if (isCorrect && !completedSentences.includes(index)) {
      hapticEvents.wordCorrect();
      const newCompletedSentences = [...completedSentences, index];
      setCompletedSentences(newCompletedSentences);

      // Award +1 point for correct sentence (only once per sentence)
      if (!sentencePointsAwarded[index]) {
        const inputElement = inputRefs.current[index];
        updatePoints(1, `Dictation correct sentence #${index + 1}`, inputElement);
        const newSentencePointsAwarded = { ...sentencePointsAwarded, [index]: true };
        setSentencePointsAwarded(newSentencePointsAwarded);

        // Save progress
        saveProgress({
          completedSentences: newCompletedSentences,
          checkedSentences: newCheckedSentences,
          sentencePointsAwarded: newSentencePointsAwarded
        });
      }
    } else if (!isCorrect) {
      hapticEvents.wordIncorrect();
      // Save checked sentences even for wrong answers
      saveProgress({
        checkedSentences: newCheckedSentences
      });
    }
  }, [userInputs, transcriptData, completedSentences, checkedSentences, compareWords, sentencePointsAwarded, updatePoints, saveProgress]);

  // Keep checkAnswerRef in sync with checkAnswer
  useEffect(() => {
    checkAnswerRef.current = checkAnswer;
  }, [checkAnswer]);

  // Show answer
  const showAnswer = useCallback((index) => {
    setResults(prev => ({
      ...prev,
      [index]: { ...prev[index], showAnswer: true }
    }));
    // Mark as checked to reveal in transcript
    if (!checkedSentences.includes(index)) {
      setCheckedSentences(prev => [...prev, index]);
    }
  }, [checkedSentences]);

  // Handle word click for dictionary
  const handleWordClick = useCallback((word, event) => {
    const cleanWord = word.replace(/[.,!?;:"""''„]/g, '');
    if (!cleanWord) return;

    const rect = event.target.getBoundingClientRect();
    setPopupPosition({
      top: rect.bottom + window.scrollY + 10,
      left: rect.left + window.scrollX
    });
    setSelectedWord(cleanWord);
    setShowVocabPopup(true);
  }, []);

  // Handle double-click on masked word to reveal it
  const handleMaskedWordDoubleClick = useCallback((sentenceIndex, wordIndex, word, event) => {
    // Prevent text selection on double-click
    event.preventDefault();

    // Check if this word was already revealed
    if (revealedWordsByClick[sentenceIndex]?.[wordIndex]) {
      return;
    }

    // Mark this word as revealed
    const updated = {
      ...revealedWordsByClick,
      [sentenceIndex]: {
        ...(revealedWordsByClick[sentenceIndex] || {}),
        [wordIndex]: true
      }
    };
    setRevealedWordsByClick(updated);

    // Get the correct word (without punctuation)
    const correctText = transcriptData[sentenceIndex]?.text || '';
    const correctWords = correctText.split(' ').filter(w => w.length > 0);
    const revealedWord = correctWords[wordIndex]?.replace(/[.,!?;:"""''„]/g, '') || '';
    
    // Update wordInputs with the revealed word
    const newWordInputs = {
      ...wordInputs,
      [sentenceIndex]: {
        ...(wordInputs[sentenceIndex] || {}),
        [wordIndex]: revealedWord
      }
    };
    setWordInputs(newWordInputs);
    
    // Rebuild full sentence from word inputs for userInputs compatibility
    const userWords = correctWords.map((_, i) => newWordInputs[sentenceIndex]?.[i] || '');
    const fullUserInput = userWords.join(' ').replace(/\s+/g, ' ').trim();
    
    const newUserInputs = { ...userInputs, [sentenceIndex]: fullUserInput };
    setUserInputs(newUserInputs);
    
    // Update compared words to reflect the change
    if (fullUserInput.trim() && correctText) {
      const wordComparison = compareWords(fullUserInput, correctText);
      setComparedWords(prev => ({
        ...prev,
        [sentenceIndex]: wordComparison
      }));
    }

    // Count revealed words for this sentence (including the new one)
    const revealedCount = Object.keys(updated[sentenceIndex] || {}).length;

    // If 3+ words revealed and not already penalized, deduct 1 point
    if (revealedCount >= 3 && !sentenceRevealPenalty[sentenceIndex]) {
      const targetElement = event.target;
      updatePoints(-1, `Dictation: revealed ${revealedCount} words in sentence #${sentenceIndex + 1}`, targetElement);
      const newSentenceRevealPenalty = { ...sentenceRevealPenalty, [sentenceIndex]: true };
      setSentenceRevealPenalty(newSentenceRevealPenalty);

      // Save progress with penalty
      saveProgress({
        revealedWordsByClick: updated,
        sentenceRevealPenalty: newSentenceRevealPenalty,
        userInputs: newUserInputs,
        wordInputs: newWordInputs
      });
    } else {
      // Save revealed words
      saveProgress({
        revealedWordsByClick: updated,
        userInputs: newUserInputs,
        wordInputs: newWordInputs
      });
    }
  }, [revealedWordsByClick, sentenceRevealPenalty, updatePoints, saveProgress, transcriptData, userInputs, wordInputs, compareWords]);

  // Reveal hint for focused word
  const revealFocusedWordHint = useCallback(() => {
    const wordIdx = focusedWordIndex !== null ? focusedWordIndex : lastFocusedWordIndexRef.current;
    if (wordIdx === null) return;
    
    const words = transcriptData[currentSentenceIndex]?.text.split(' ');
    if (!words || !words[wordIdx]) return;
    
    const word = words[wordIdx];
    const pureWord = word.replace(/[.,!?;:"""''„]/g, '');
    
    // Update wordInputs with the correct word
    const newWordInputs = {
      ...wordInputs,
      [currentSentenceIndex]: {
        ...(wordInputs[currentSentenceIndex] || {}),
        [wordIdx]: pureWord
      }
    };
    setWordInputs(newWordInputs);
    
    // Mark as revealed
    const updated = {
      ...revealedWordsByClick,
      [currentSentenceIndex]: {
        ...(revealedWordsByClick[currentSentenceIndex] || {}),
        [wordIdx]: true
      }
    };
    setRevealedWordsByClick(updated);
    
    // Update comparison
    const newComparedWords = {
      ...comparedWords,
      [currentSentenceIndex]: {
        ...(comparedWords[currentSentenceIndex] || {}),
        [wordIdx]: { isCorrect: true, userWord: pureWord, correctWord: pureWord, matchedChars: pureWord.length }
      }
    };
    setComparedWords(newComparedWords);
    
    // Count hint clicks per sentence and deduct 1 point from 3rd click onwards
    const currentCount = hintClickCount[currentSentenceIndex] || 0;
    const newCount = currentCount + 1;
    setHintClickCount(prev => ({
      ...prev,
      [currentSentenceIndex]: newCount
    }));
    
    // Deduct 1 point from 3rd click onwards (3rd, 4th, 5th, ...)
    if (newCount >= 3) {
      updatePoints(-1);
    }
    
    // Save progress
    saveProgress({
      revealedWordsByClick: updated,
      wordInputs: newWordInputs,
      hintClickCount: { ...hintClickCount, [currentSentenceIndex]: newCount }
    });
  }, [focusedWordIndex, currentSentenceIndex, transcriptData, wordInputs, revealedWordsByClick, comparedWords, saveProgress, hintClickCount, updatePoints]);

  // Mobile hint - reveal word at cursor position
  const revealMobileHint = useCallback(() => {
    const userText = userInputs[currentSentenceIndex] || '';
    const userWords = userText.split(/\s+/).filter(w => w.length > 0);
    const correctText = transcriptData[currentSentenceIndex]?.text || '';
    const correctWords = correctText.split(' ').filter(w => w.length > 0);
    
    // Use cursor position to determine which word to reveal
    const wordIdxToReveal = Math.min(mobileCursorWordIndex, correctWords.length - 1);
    
    // Check if word index is valid and not already revealed
    if (wordIdxToReveal < 0 || wordIdxToReveal >= correctWords.length) return;
    if (revealedWordsByClick[currentSentenceIndex]?.[wordIdxToReveal]) return;
    
    const pureWord = correctWords[wordIdxToReveal]?.replace(/[.,!?;:"""''„]/g, '') || '';
    if (!pureWord) return;
    
    // Build new user input with the revealed word
    const newUserWords = [...userWords];
    // Ensure array has enough elements
    while (newUserWords.length <= wordIdxToReveal) {
      newUserWords.push('');
    }
    newUserWords[wordIdxToReveal] = pureWord;
    
    const newUserText = newUserWords.join(' ') + ' ';
    const newUserInputs = { ...userInputs, [currentSentenceIndex]: newUserText };
    setUserInputs(newUserInputs);
    
    // Mark as revealed
    const updated = {
      ...revealedWordsByClick,
      [currentSentenceIndex]: {
        ...(revealedWordsByClick[currentSentenceIndex] || {}),
        [wordIdxToReveal]: true
      }
    };
    setRevealedWordsByClick(updated);
    
    // Count hint clicks per sentence and deduct 1 point from 3rd click onwards
    const currentCount = hintClickCount[currentSentenceIndex] || 0;
    const newCount = currentCount + 1;
    setHintClickCount(prev => ({
      ...prev,
      [currentSentenceIndex]: newCount
    }));
    
    // Deduct 1 point from 3rd click onwards
    if (newCount >= 3) {
      updatePoints(-1, `Dictation hint penalty sentence #${currentSentenceIndex + 1}`);
    }
    
    // Save progress
    saveProgress({
      revealedWordsByClick: updated,
      userInputs: newUserInputs,
      hintClickCount: { ...hintClickCount, [currentSentenceIndex]: newCount }
    });
  }, [currentSentenceIndex, userInputs, transcriptData, revealedWordsByClick, hintClickCount, updatePoints, saveProgress, mobileCursorWordIndex]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!transcriptData.length) return 0;
    return Math.round((completedSentences.length / transcriptData.length) * 100);
  }, [completedSentences, transcriptData]);

  // Format time
  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Format study time
  const formatStudyTime = (totalSeconds) => {
    if (!isFinite(totalSeconds)) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // ==================== VOICE RECORDING FUNCTIONS ====================

  // Start recording
  const startRecording = async () => {
    try {
      // Pause video/audio before starting recording
      if (isPlaying) {
        if (isYouTube && youtubePlayerRef?.current) {
          youtubePlayerRef.current.pauseVideo();
        } else if (audioRef?.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: audioChunksRef.current[0]?.type || 'audio/webm'
        });
        setRecordedBlob(audioBlob);
        await processRecording(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceComparisonResult(null);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessingAudio(true);
    }
  };

  // Process recording with Whisper
  const processRecording = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-recording.webm');
      formData.append('language', 'de');

      const response = await fetch('/api/whisper-transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.text) {
        const transcribedText = data.text.trim();

        // Check for error messages from Whisper
        const errorPhrases = [
          'Untertitelung aufgrund der Audioqualität nicht möglich',
          'Untertitel',
        ];

        const isErrorMessage = errorPhrases.some(phrase =>
          transcribedText.toLowerCase().includes(phrase.toLowerCase())
        );

        // Only use transcription if valid
        if (!isErrorMessage && transcribedText.length > 2) {
          // Set the transcribed text as user input
          setUserInputs(prev => ({ ...prev, [currentSentenceIndex]: transcribedText }));

          // Calculate similarity with correct text
          const correctText = transcriptData[currentSentenceIndex]?.text || '';
          const similarity = calculateSimilarity(transcribedText, correctText);

          setVoiceComparisonResult({
            transcribed: transcribedText,
            original: correctText,
            similarity: similarity,
            isCorrect: similarity >= 80
          });
        } else {
          setVoiceComparisonResult(null);
        }
      } else {
        setVoiceComparisonResult(null);
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setVoiceComparisonResult(null);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  // Play recorded audio
  const playRecordedAudio = () => {
    if (!recordedBlob) return;

    if (isPlayingRecording && playbackRef.current) {
      playbackRef.current.pause();
      playbackRef.current = null;
      setIsPlayingRecording(false);
      return;
    }

    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    playbackRef.current = audio;

    audio.onended = () => {
      setIsPlayingRecording(false);
      playbackRef.current = null;
      URL.revokeObjectURL(url);
    };

    audio.play();
    setIsPlayingRecording(true);
  };

  // Clear recording
  const clearRecording = () => {
    if (playbackRef.current) {
      playbackRef.current.pause();
      playbackRef.current = null;
    }
    setRecordedBlob(null);
    setVoiceComparisonResult(null);
    setIsPlayingRecording(false);
  };

  // Handle recording button click
  const handleRecordingClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Clear recording when sentence changes
  useEffect(() => {
    clearRecording();
  }, [currentSentenceIndex]);

  // Global keyboard shortcut: Space to play/pause, Arrow keys to seek
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle Arrow keys for seeking (2 seconds)
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        const seekAmount = e.code === 'ArrowLeft' ? -2 : 2;
        
        if (isYouTube) {
          const player = youtubePlayerRef.current;
          if (player?.getCurrentTime && player?.seekTo) {
            const newTime = Math.max(0, player.getCurrentTime() + seekAmount);
            player.seekTo(newTime, true);
            setCurrentTime(newTime);
          }
        } else {
          const audio = audioRef.current;
          if (audio) {
            const newTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seekAmount));
            audio.currentTime = newTime;
            setCurrentTime(newTime);
          }
        }
        return;
      }

      // Only handle Space key
      if (e.code !== 'Space') return;

      // Check if user is typing in an input or textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      // On mobile: allow Space to work normally when typing (don't hijack it)
      // Check for mobile using window width
      const isMobileDevice = window.innerWidth <= 768;
      if (isTyping && isMobileDevice) {
        // Let Space work normally for typing on mobile
        return;
      }

      // If typing on desktop, toggle play/pause (resume from current position, not from start)
      if (isTyping) {
        e.preventDefault();
        if (isPlaying) {
          // Pause
          if (isYouTube) {
            youtubePlayerRef.current?.pauseVideo?.();
          } else {
            audioRef.current?.pause();
          }
          setIsPlaying(false);
        } else {
          // Resume from current position (or from start if at end of sentence)
          const sentence = transcriptData[currentSentenceIndex];
          let needSeek = false;
          if (isYouTube) {
            const player = youtubePlayerRef.current;
            // If at end of sentence, seek back to start
            if (sentence && player?.getCurrentTime?.() >= sentence.end - 0.1) {
              setIsUserSeeking(true);
              player.seekTo(sentence.start);
              needSeek = true;
            }
            player?.playVideo?.();
          } else {
            const audio = audioRef.current;
            // If at end of sentence, seek back to start
            if (sentence && audio && audio.currentTime >= sentence.end - 0.1) {
              setIsUserSeeking(true);
              audio.currentTime = sentence.start;
              needSeek = true;
            }
            audio?.play();
          }
          setIsPlaying(true);
          if (sentence) setSegmentPlayEndTime(sentence.end);
          // Clear seeking flag after a delay
          if (needSeek) {
            setTimeout(() => setIsUserSeeking(false), 500);
          }
        }
        return;
      }

      // Prevent default scroll behavior
      e.preventDefault();

      // Toggle play/pause (resume from current position)
      if (isPlaying) {
        if (isYouTube) {
          youtubePlayerRef.current?.pauseVideo?.();
        } else {
          audioRef.current?.pause();
        }
        setIsPlaying(false);
      } else {
        // Resume from current position (or from start if at end of sentence)
        const sentence = transcriptData[currentSentenceIndex];
        let needSeek = false;
        if (isYouTube) {
          const player = youtubePlayerRef.current;
          // If at end of sentence, seek back to start
          if (sentence && player?.getCurrentTime?.() >= sentence.end - 0.1) {
            setIsUserSeeking(true);
            player.seekTo(sentence.start);
            needSeek = true;
          }
          player?.playVideo?.();
        } else {
          const audio = audioRef.current;
          // If at end of sentence, seek back to start
          if (sentence && audio && audio.currentTime >= sentence.end - 0.1) {
            setIsUserSeeking(true);
            audio.currentTime = sentence.start;
            needSeek = true;
          }
          audio?.play();
        }
        setIsPlaying(true);
        if (sentence) setSegmentPlayEndTime(sentence.end);
        // Clear seeking flag after a delay
        if (needSeek) {
          setTimeout(() => setIsUserSeeking(false), 500);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isYouTube, currentSentenceIndex, transcriptData]);



  if (loading) {
    return <DictationSkeleton />;
  }

  if (!lesson) {
    return (
      <div className={styles.page}>
        <div className={styles.centeredState}>
          <p>{t('dictationPage.lessonNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={t('dictationPage.seoTitle', { title: lesson.title })}
        description={t('dictationPage.seoDescription', { title: lesson.title })}
      />

      <div className={styles.page}>
        <div className={styles.pageContainer}>
          <DictationHeader
            lesson={lesson}
            studyTime={studyTime}
            progress={progress}
            onBack={() => router.back()}
          />

          <div className={`${styles.threeColumnLayout} ${isMobile ? styles.mobileLayout : ''}`}>
            {/* Left Column - Video (desktop only, mobile uses inline) */}
            {!isMobile && (
              <DictationVideoSection
                lesson={lesson}
                isYouTube={isYouTube}
                audioRef={audioRef}
                currentTime={currentTime}
                duration={duration}
                autoStop={autoStop}
                onAutoStopChange={setAutoStop}
                studyTime={studyTime}
                formatStudyTime={formatStudyTime}
                formatTime={formatTime}
                isMobile={false}
                onVideoClick={handlePlayPause}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onReplayFromStart={() => playSentence(currentSentenceIndex)}
                onPrevSentence={() => {
                  if (currentSentenceIndex > 0) {
                    playSentence(currentSentenceIndex - 1);
                  }
                }}
                onNextSentence={() => {
                  // Prioritize jumping to next uncompleted sentence
                  let nextIndex = -1;
                  for (let i = currentSentenceIndex + 1; i < transcriptData.length; i++) {
                    if (!completedSentences.includes(i)) {
                      nextIndex = i;
                      break;
                    }
                  }
                  if (nextIndex === -1) {
                    for (let i = 0; i < currentSentenceIndex; i++) {
                      if (!completedSentences.includes(i)) {
                        nextIndex = i;
                        break;
                      }
                    }
                  }
                  if (nextIndex === -1 && currentSentenceIndex < transcriptData.length - 1) {
                    nextIndex = currentSentenceIndex + 1;
                  }
                  if (nextIndex !== -1) {
                    playSentence(nextIndex);
                  }
                }}
                playbackSpeed={playbackSpeed}
                onSpeedChange={(speed) => {
                  setPlaybackSpeed(speed);
                  if (isYouTube && youtubePlayerRef.current?.setPlaybackRate) {
                    youtubePlayerRef.current.setPlaybackRate(speed);
                  } else if (audioRef.current) {
                    audioRef.current.playbackRate = speed;
                  }
                }}
                currentSentence={transcriptData[currentSentenceIndex]}
                youtubePlayerRef={youtubePlayerRef}
              />
            )}

            {/* Middle Column - Dictation Input */}
            <div className={styles.middleColumn}>
              {/* Mobile Video Player */}
              {isMobile && (
                <div className={styles.mobileVideoSection}>
                  <div className={styles.mobileVideoWrapper} onClick={handlePlayPause}>
                    {isYouTube ? (
                      <>
                        <div id="youtube-player" />
                        {/* Overlay to capture clicks and trigger handlePlayPause for auto-stop */}
                        <div className={styles.videoClickOverlay} />
                      </>
                    ) : (
                      <audio ref={audioRef} src={lesson.audioUrl} />
                    )}
                  </div>
                  <div className={styles.mobileControls}>
                    <button
                      className={styles.mobileControlBtn}
                      onClick={() => {
                        if (currentSentenceIndex > 0) {
                          playSentence(currentSentenceIndex - 1);
                        }
                      }}
                    >
                      ⏮
                    </button>
                    <button
                      className={`${styles.mobileControlBtn} ${styles.mobilePlayBtn}`}
                      onClick={handlePlayPause}
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button
                      className={styles.mobileControlBtn}
                      onClick={() => playSentence(currentSentenceIndex)}
                    >
                      🔄
                    </button>
                    <button
                      className={styles.mobileControlBtn}
                      onClick={() => {
                        // Prioritize jumping to next uncompleted sentence
                        let nextIndex = -1;
                        for (let i = currentSentenceIndex + 1; i < transcriptData.length; i++) {
                          if (!completedSentences.includes(i)) {
                            nextIndex = i;
                            break;
                          }
                        }
                        if (nextIndex === -1) {
                          for (let i = 0; i < currentSentenceIndex; i++) {
                            if (!completedSentences.includes(i)) {
                              nextIndex = i;
                              break;
                            }
                          }
                        }
                        if (nextIndex === -1 && currentSentenceIndex < transcriptData.length - 1) {
                          nextIndex = currentSentenceIndex + 1;
                        }
                        if (nextIndex !== -1) {
                          playSentence(nextIndex);
                        }
                      }}
                    >
                      ⏭
                    </button>
                    <button
                      className={styles.mobileControlBtn}
                      onClick={() => {
                        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                        const currentIndex = speeds.indexOf(playbackSpeed || 1);
                        const nextIndex = (currentIndex + 1) % speeds.length;
                        const newSpeed = speeds[nextIndex];
                        setPlaybackSpeed(newSpeed);
                        if (isYouTube && youtubePlayerRef.current?.setPlaybackRate) {
                          youtubePlayerRef.current.setPlaybackRate(newSpeed);
                        } else if (audioRef.current) {
                          audioRef.current.playbackRate = newSpeed;
                        }
                      }}
                      title={t('dictationPage.playbackSpeed')}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{playbackSpeed || 1}x</span>
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.dictationArea}>
                <div className={styles.dictationHeader}>
                  <h3 className={styles.columnTitle}>{t('dictationPage.listenAndWrite')}</h3>
                  <div className={styles.headerRight}>
                    {isMobile && (
                      <button
                        className={styles.speedButtonHeader}
                        onClick={() => {
                          const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                          const currentIndex = speeds.indexOf(playbackSpeed || 1);
                          const nextIndex = (currentIndex + 1) % speeds.length;
                          const newSpeed = speeds[nextIndex];
                          setPlaybackSpeed(newSpeed);
                          if (isYouTube && youtubePlayerRef.current?.setPlaybackRate) {
                            youtubePlayerRef.current.setPlaybackRate(newSpeed);
                          } else if (audioRef.current) {
                            audioRef.current.playbackRate = newSpeed;
                          }
                        }}
                        title={t('dictationPage.playbackSpeed')}
                      >
                        {playbackSpeed || 1}x
                      </button>
                    )}
                    <span className={styles.sentenceCounter}>
                      {t('dictationPage.sentence')} {currentSentenceIndex + 1} / {transcriptData.length}
                    </span>
                  </div>
                </div>

                {/* Hidden sentence display - HIDDEN
                <div className={styles.hiddenSentenceBox}>
                  <span className={styles.hiddenSentenceLabel}>{t('dictationPage.hiddenSentence')}</span>
                  {transcriptData[currentSentenceIndex] && (
                    results[currentSentenceIndex]?.showAnswer ? (
                      // Full answer revealed
                      <div className={styles.revealedSentence}>
                        {transcriptData[currentSentenceIndex].text.split(' ').map((word, i) => {
                          return (
                            <span
                              key={i}
                              className={styles.revealedWord}
                              onClick={(e) => handleWordClick(word, e)}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </div>
                    ) : comparedWords[currentSentenceIndex] ? (
                      // Realtime: show matched characters as user types
                      <div className={styles.partialRevealSentence}>
                        {transcriptData[currentSentenceIndex].text.split(' ').map((word, i) => {
                          const comparison = comparedWords[currentSentenceIndex][i];
                          const pureWord = word.replace(/[.,!?;:"""''„]/g, '');
                          const currentInput = wordInputs[currentSentenceIndex]?.[i] || '';
                          
                          // Check if input is wrong
                          const normalizedInput = currentInput.toLowerCase().trim();
                          const normalizedCorrect = pureWord.toLowerCase();
                          const isWrong = currentInput && !normalizedCorrect.startsWith(normalizedInput) && !comparison?.isCorrect;
                          
                          if (comparison?.isCorrect) {
                            // Fully correct word - show in green
                            return (
                              <span
                                key={i}
                                className={styles.correctWord}
                                onClick={(e) => handleWordClick(word, e)}
                              >
                                {word}
                              </span>
                            );
                          } else if (isWrong) {
                            // Wrong input - show red background
                            return (
                              <span
                                key={i}
                                className={styles.wrongWord}
                                onClick={(e) => handleMaskedWordDoubleClick(currentSentenceIndex, i, word, e)}
                                title={t('dictationPage.clickToReveal')}
                              >
                                {'\u00A0'}
                              </span>
                            );
                          } else if (comparison?.matchedChars > 0) {
                            // Partial match - show matched chars, hide rest
                            const revealedPart = pureWord.substring(0, comparison.matchedChars);
                            const hiddenPart = '';
                            return (
                              <span key={i} className={styles.partialWord}>
                                <span className={styles.revealedChars}>{revealedPart}</span>
                                <span className={styles.maskedChars}>{hiddenPart}</span>
                              </span>
                            );
                          } else {
                            // No match - check if revealed by double-click
                            const isRevealedByClick = revealedWordsByClick[currentSentenceIndex]?.[i];
                            if (isRevealedByClick) {
                              return (
                                <span
                                  key={i}
                                  className={styles.revealedByClickWord}
                                  onClick={(e) => handleWordClick(word, e)}
                                >
                                  {word}
                                </span>
                              );
                            }
                            // Fully hidden
                            return (
                              <span
                                key={i}
                                className={styles.maskedWordClickable}
                                onClick={(e) => handleMaskedWordDoubleClick(currentSentenceIndex, i, word, e)}
                                title={t('dictationPage.clickToReveal')}
                              >
                                {'\u00A0'}
                              </span>
                            );
                          }
                        })}
                      </div>
                    ) : (
                      // Initial state: all words hidden
                      <div className={styles.maskedSentence}>
                        {transcriptData[currentSentenceIndex].text.split(' ').map((word, i) => {
                          const isRevealedByClick = revealedWordsByClick[currentSentenceIndex]?.[i];

                          if (isRevealedByClick) {
                            return (
                              <span
                                key={i}
                                className={styles.revealedByClickWord}
                                onClick={(e) => handleWordClick(word, e)}
                              >
                                {word}
                              </span>
                            );
                          }

                          return (
                            <span
                              key={i}
                              className={styles.maskedWordClickable}
                              onClick={(e) => handleMaskedWordDoubleClick(currentSentenceIndex, i, word, e)}
                              title={t('dictationPage.clickToReveal')}
                            >
                              {'\u00A0'}
                            </span>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
                */}

                {/* Word Input Boxes - matching hidden sentence layout */}
                <div className={styles.wordInputsSection}>
                  <span className={styles.wordInputsLabel}>{t('dictationPage.enterAnswer')}</span>
                  
                  {/* Mobile: Single textarea input */}
                  {isMobile ? (
                    <div className={styles.mobileInputContainer}>
                      <div className={styles.mobileTextareaWrapper}>
                        {/* Colored text overlay */}
                        <div className={styles.mobileTextOverlay}>
                          {(() => {
                            const userText = userInputs[currentSentenceIndex] || '';
                            const userWords = userText.split(/\s+/);
                            const correctText = transcriptData[currentSentenceIndex]?.text || '';
                            const correctWords = correctText.split(' ').filter(w => w.length > 0);
                            const hasTrailingSpace = userText.endsWith(' ');
                            
                            return userWords.map((word, i) => {
                              if (!word && i === userWords.length - 1 && !hasTrailingSpace) {
                                return null;
                              }
                              
                              const correctWord = correctWords[i]?.replace(/[.,!?;:"""''„]/g, '') || '';
                              const normalizedUser = word.toLowerCase().replace(/[.,!?;:"""''„]/g, '');
                              const normalizedCorrect = correctWord.toLowerCase();
                              const isRevealed = revealedWordsByClick[currentSentenceIndex]?.[i];
                              
                              // Check if this word is "completed" (has space after it)
                              const isWordCompleted = i < userWords.length - 1 || hasTrailingSpace;
                              
                              let colorClass = '';
                              if (isWordCompleted && word) {
                                if (normalizedUser === normalizedCorrect) {
                                  colorClass = isRevealed ? styles.overlayWordRevealed : styles.overlayWordCorrect;
                                } else {
                                  colorClass = styles.overlayWordWrong;
                                }
                              }
                              
                              return (
                                <span key={i}>
                                  <span className={colorClass}>{word}</span>
                                  {i < userWords.length - 1 ? ' ' : ''}
                                </span>
                              );
                            });
                          })()}
                        </div>
                        <textarea
                          className={`${styles.mobileTextInput} ${completedSentences.includes(currentSentenceIndex) ? styles.mobileTextInputCompleted : ''}`}
                          value={userInputs[currentSentenceIndex] || ''}
                          onChange={(e) => handleInputChange(currentSentenceIndex, e.target.value)}
                          placeholder={t('dictationPage.typeAllWords')}
                          rows={3}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              checkAnswer(currentSentenceIndex);
                            }
                          }}
                          onSelect={(e) => {
                            // Track cursor position to determine which word user is on
                            const cursorPos = e.target.selectionStart;
                            const textBeforeCursor = (userInputs[currentSentenceIndex] || '').substring(0, cursorPos);
                            // Count spaces before cursor to determine word index
                            const wordsBeforeCursor = textBeforeCursor.split(/\s+/).filter(w => w.length > 0);
                            const endsWithSpace = textBeforeCursor.endsWith(' ');
                            const wordIdx = endsWithSpace ? wordsBeforeCursor.length : Math.max(0, wordsBeforeCursor.length - 1);
                            setMobileCursorWordIndex(wordIdx);
                          }}
                          onClick={(e) => {
                            // Also track on click
                            const cursorPos = e.target.selectionStart;
                            const textBeforeCursor = (userInputs[currentSentenceIndex] || '').substring(0, cursorPos);
                            const wordsBeforeCursor = textBeforeCursor.split(/\s+/).filter(w => w.length > 0);
                            const endsWithSpace = textBeforeCursor.endsWith(' ');
                            const wordIdx = endsWithSpace ? wordsBeforeCursor.length : Math.max(0, wordsBeforeCursor.length - 1);
                            setMobileCursorWordIndex(wordIdx);
                          }}
                        />
                      </div>
                      {/* Show word status: correct (green), wrong (red), or hidden (underscores) */}
                      {transcriptData[currentSentenceIndex] && (() => {
                        const userText = userInputs[currentSentenceIndex] || '';
                        const userWords = userText.split(/\s+/).filter(w => w.length > 0);
                        const correctWords = transcriptData[currentSentenceIndex].text.split(' ').filter(w => w.length > 0);
                        const isCompleted = completedSentences.includes(currentSentenceIndex);
                        
                        // Count completed words (words followed by space)
                        // If sentence is completed, show all words
                        const hasTrailingSpace = userText.endsWith(' ');
                        const completedWordCount = isCompleted 
                          ? correctWords.length 
                          : (hasTrailingSpace ? userWords.length : Math.max(0, userWords.length - 1));
                        
                        return (
                          <div className={styles.mobileWordComparison}>
                            {correctWords.map((word, i) => {
                              const pureWord = word.replace(/[.,!?;:"""''„]/g, '');
                              const punctuation = word.match(/[.,!?;:"""''„]$/) ? word.slice(-1) : '';
                              const userWord = userWords[i] || '';
                              const normalizedUser = userWord.toLowerCase().replace(/[.,!?;:"""''„]/g, '');
                              const normalizedCorrect = pureWord.toLowerCase();
                              
                              // Check if word was revealed by hint
                              const isRevealed = revealedWordsByClick[currentSentenceIndex]?.[i];
                              
                              // Show result for completed words or if sentence is done
                              if (i < completedWordCount || isCompleted) {
                                const isCorrect = normalizedUser === normalizedCorrect;
                                if (isCorrect) {
                                  // Correct: show the word in green (or orange if revealed by hint)
                                  return (
                                    <span key={i} className={isRevealed ? styles.mobileWordRevealed : styles.mobileWordCorrect}>
                                      {pureWord}{punctuation}{' '}
                                    </span>
                                  );
                                } else {
                                  // Wrong: show underscores with red background
                                  return (
                                    <span key={i} className={styles.mobileWordWrong}>
                                      {'_'.repeat(pureWord.length)}{punctuation}{' '}
                                    </span>
                                  );
                                }
                              } else {
                                // Word not yet completed - show underscores
                                return (
                                  <span key={i} className={styles.mobileWordMissing}>
                                    {'_'.repeat(pureWord.length)}{punctuation}{' '}
                                  </span>
                                );
                              }
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* Desktop: Keep existing word-by-word input */
                    <div className={styles.wordInputsContainer}>
                    {transcriptData[currentSentenceIndex] && 
                      transcriptData[currentSentenceIndex].text.split(' ').map((word, i) => {
                        const pureWord = word.replace(/[.,!?;:"""''„]/g, '');
                        const punctuation = word.match(/[.,!?;:"""''„]$/) ? word.slice(-1) : '';
                        const comparison = comparedWords[currentSentenceIndex]?.[i];
                        const isRevealed = revealedWordsByClick[currentSentenceIndex]?.[i];
                        const isCorrect = comparison?.isCorrect;
                        const currentValue = wordInputs[currentSentenceIndex]?.[i] || '';
                        
                        // Check if input is wrong (doesn't match beginning of correct word)
                        const normalizedInput = currentValue.toLowerCase().trim();
                        const normalizedCorrect = pureWord.toLowerCase();
                        const isWrong = currentValue && !normalizedCorrect.startsWith(normalizedInput) && !isCorrect;
                        
                        // Determine input class based on state
                        let inputClass = styles.wordInput;
                        if (isCorrect) {
                          inputClass = `${styles.wordInput} ${styles.wordInputCorrect}`;
                        } else if (isWrong) {
                          inputClass = `${styles.wordInput} ${styles.wordInputWrong}`;
                        } else if (isRevealed) {
                          inputClass = `${styles.wordInput} ${styles.wordInputRevealed}`;
                        } else if (currentValue && !isCorrect) {
                          inputClass = `${styles.wordInput} ${styles.wordInputPartial}`;
                        }
                        
                        // Render colored characters based on correctness
                        const renderColoredInput = () => {
                          if (!currentValue) return null;
                          const chars = currentValue.split('');
                          const correctChars = pureWord.split('');
                          return (
                            <div className={styles.coloredCharsOverlay}>
                              {chars.map((char, idx) => {
                                const correctChar = correctChars[idx];
                                const isCharCorrect = correctChar && char.toLowerCase() === correctChar.toLowerCase();
                                return (
                                  <span
                                    key={idx}
                                    className={isCharCorrect ? styles.charCorrect : styles.charWrong}
                                  >
                                    {char}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        };

                        return (
                          <div key={i} className={styles.wordInputWrapper}>
                            <div className={styles.wordInputContainer}>
                              {renderColoredInput()}
                              <input
                                type="text"
                                data-word-input={`${currentSentenceIndex}-${i}`}
                                className={`${inputClass} ${currentValue ? styles.wordInputTransparent : ''}`}
                                value={currentValue}
                                onChange={(e) => handleWordInputChange(currentSentenceIndex, i, e.target.value)}
                                placeholder={'_'.repeat(Math.min(pureWord.length, 8))}
                                maxLength={pureWord.length}
                                style={{ width: `${pureWord.length * 10 + 24}px` }}
                                disabled={isCorrect || completedSentences.includes(currentSentenceIndex)}
                                onFocus={() => {
                                  setFocusedWordIndex(i);
                                  lastFocusedWordIndexRef.current = i;
                                }}
                                onBlur={() => setFocusedWordIndex(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Tab') {
                                    e.preventDefault();
                                    focusNextWordInput(currentSentenceIndex, i);
                                  } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    checkAnswer(currentSentenceIndex);
                                  }
                                }}
                              />
                            </div>
                            {punctuation && <span className={styles.wordPunctuation}>{punctuation}</span>}
                          </div>
                        );
                      })
                    }
                  </div>
                  )}
                  

                </div>

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  <button
                    className={styles.navButton}
                    onClick={() => {
                      if (currentSentenceIndex > 0) {
                        playSentence(currentSentenceIndex - 1);
                      }
                    }}
                    disabled={currentSentenceIndex <= 0}
                    title={t('dictationPage.previousSentence')}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  
                  {/* Mobile Play/Pause Button */}
                  {isMobile && (
                    <>
                      {/* Rewind 2s */}
                      <button
                        className={styles.seekButton}
                        onClick={() => {
                          if (isYouTube) {
                            const player = youtubePlayerRef.current;
                            if (player?.getCurrentTime && player?.seekTo) {
                              const newTime = Math.max(0, player.getCurrentTime() - 2);
                              player.seekTo(newTime, true);
                              setCurrentTime(newTime);
                            }
                          } else {
                            const audio = audioRef.current;
                            if (audio) {
                              const newTime = Math.max(0, audio.currentTime - 2);
                              audio.currentTime = newTime;
                              setCurrentTime(newTime);
                            }
                          }
                        }}
                        title="-2s"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" fill="currentColor" stroke="none"/>
                        </svg>
                      </button>
                      
                      <button
                        className={`${styles.mobilePlayButton} ${isPlaying ? styles.mobilePlayButtonActive : ''}`}
                        onClick={handlePlayPause}
                        title={isPlaying ? t('dictationPage.pause') : t('dictationPage.play')}
                      >
                        {isPlaying ? (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                  
                  <button
                    className={styles.hintButton}
                    onClick={isMobile ? revealMobileHint : revealFocusedWordHint}
                    disabled={(() => {
                      // Common conditions
                      if (completedSentences.includes(currentSentenceIndex)) return true;
                      if (results[currentSentenceIndex]?.showAnswer) return true;
                      if ((hintClickCount[currentSentenceIndex] || 0) >= 2 && userPoints <= 0) return true;
                      
                      // Mobile: check if word at cursor position is already revealed
                      if (isMobile) {
                        const correctText = transcriptData[currentSentenceIndex]?.text || '';
                        const correctWords = correctText.split(' ').filter(w => w.length > 0);
                        
                        // Check if word at cursor is already revealed
                        const wordIdx = Math.min(mobileCursorWordIndex, correctWords.length - 1);
                        if (wordIdx < 0 || wordIdx >= correctWords.length) return true;
                        if (revealedWordsByClick[currentSentenceIndex]?.[wordIdx]) return true;
                        
                        return false;
                      }
                      
                      // Desktop conditions
                      if (lastFocusedWordIndexRef.current === null) return true;
                      if (revealedWordsByClick[currentSentenceIndex]?.[lastFocusedWordIndexRef.current]) return true;
                      return false;
                    })()}
                    title={t('dictationPage.clickToShowHint')}
                  >
                    💡
                    {(hintClickCount[currentSentenceIndex] || 0) < 2 ? (
                      <span className={styles.hintFreeCount}>
                        <FlipCounter value={2 - (hintClickCount[currentSentenceIndex] || 0)} />
                      </span>
                    ) : (
                      <span className={styles.hintPenaltyCount}>-1</span>
                    )}
                  </button>
                  
                  {/* Forward 2s - Mobile only */}
                  {isMobile && (
                    <button
                      className={styles.seekButton}
                      onClick={() => {
                        if (isYouTube) {
                          const player = youtubePlayerRef.current;
                          if (player?.getCurrentTime && player?.seekTo && player?.getDuration) {
                            const newTime = Math.min(player.getDuration(), player.getCurrentTime() + 2);
                            player.seekTo(newTime, true);
                            setCurrentTime(newTime);
                          }
                        } else {
                          const audio = audioRef.current;
                          if (audio) {
                            const newTime = Math.min(audio.duration, audio.currentTime + 2);
                            audio.currentTime = newTime;
                            setCurrentTime(newTime);
                          }
                        }
                      }}
                      title="+2s"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                      </svg>
                    </button>
                  )}
                  
                  <button
                    className={styles.navButton}
                    onClick={() => {
                      // Prioritize jumping to next uncompleted sentence
                      // First, look for uncompleted sentence after current index
                      let nextIndex = -1;
                      for (let i = currentSentenceIndex + 1; i < transcriptData.length; i++) {
                        if (!completedSentences.includes(i)) {
                          nextIndex = i;
                          break;
                        }
                      }
                      // If not found after, look from the beginning
                      if (nextIndex === -1) {
                        for (let i = 0; i < currentSentenceIndex; i++) {
                          if (!completedSentences.includes(i)) {
                            nextIndex = i;
                            break;
                          }
                        }
                      }
                      // If all completed, just go to next sequential
                      if (nextIndex === -1 && currentSentenceIndex < transcriptData.length - 1) {
                        nextIndex = currentSentenceIndex + 1;
                      }
                      if (nextIndex !== -1) {
                        playSentence(nextIndex);
                      }
                    }}
                    disabled={currentSentenceIndex >= transcriptData.length - 1 && completedSentences.length === transcriptData.length}
                    title={t('dictationPage.nextSentence')}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>


              </div>
            </div>

            {/* Right Column - Transcript Panel */}
            <TranscriptPanel
              transcriptData={transcriptData}
              currentSentenceIndex={currentSentenceIndex}
              completedSentences={completedSentences}
              completedWords={completedWords}
              checkedSentences={checkedSentences}
              revealedHintWords={revealedHintWords}
              hidePercentage={100}
              difficultyLevel="C1"
              dictationMode="full-sentence"
              studyTime={studyTime}
              onSentenceClick={(start, end) => {
                const index = transcriptData.findIndex(item => item.start === start && item.end === end);
                if (index !== -1) playSentence(index);
              }}
              maskTextByPercentage={maskTextByPercentage}
              learningMode="dictation"
              currentTime={currentTime}
              isPlaying={isPlaying}
              showTranslation={showTranslation}
              onToggleTranslation={() => setShowTranslation(prev => !prev)}
              onWordClickForPopup={handleWordClick}
              comparedWords={comparedWords}
              results={results}
              revealedWordsByClick={revealedWordsByClick}
            />
          </div>
        </div>
      </div >

      {/* Dictionary Popup */}
      {
        showVocabPopup && (
          <DictionaryPopup
            word={selectedWord}
            position={popupPosition}
            onClose={() => setShowVocabPopup(false)}
          />
        )
      }

      {/* Points Animation */}
      {
        pointsAnimations.map(anim => (
          <PointsAnimation
            key={anim.id}
            points={anim.points}
            startPosition={anim.startPosition}
            endPosition={anim.endPosition}
          />
        ))
      }
    </>
  );
};

export default DictationPage;
