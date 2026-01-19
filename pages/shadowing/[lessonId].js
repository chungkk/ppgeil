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
import LockedLessonOverlay from '../../components/LockedLessonOverlay';

// Dictation Components
import {
  DictationHeader,
  DictationVideoSection,
  TranscriptPanel,
  MobileBottomControls
} from '../../components/dictation';
import { ShadowingSkeleton } from '../../components/shadowing';



// Hooks and utilities
import { useLessonData } from '../../lib/hooks/useLessonData';
import { useDictationPlayer } from '../../lib/hooks/useDictationPlayer';
import { useDictationProgress } from '../../lib/hooks/useDictationProgress';
import { useSentenceNavigation } from '../../lib/hooks/useSentenceNavigation';
import { useStudyTimer } from '../../lib/hooks/useStudyTimer';
import { youtubeAPI } from '../../lib/youtubeApi';
import { useAuth } from '../../context/AuthContext';
import { speakText } from '../../lib/textToSpeech';
import { toast } from 'react-toastify';
import { translationCache } from '../../lib/translationCache';
import { hapticEvents } from '../../lib/haptics';
import { navigateWithLocale } from '../../lib/navigation';
import {
  formatTime,
  formatStudyTime as formatStudyTimeUtil,
  calculateSimilarity,
  maskTextByPercentage,
  renderCompletedSentenceWithWordBoxes,
  seededRandom
} from '../../lib/dictationUtils';
import usePointsAnimation from '../../lib/hooks/usePointsAnimation';
import { useKaraokeHighlight } from '../../lib/hooks/useKaraokeHighlight';
import useLeaderboard from '../../lib/hooks/useLeaderboard';
import useSuggestionPopup from '../../lib/hooks/useSuggestionPopup';
import useWindowGlobals from '../../lib/hooks/useWindowGlobals';
import styles from '../../styles/shadowingPage.module.css';

const DEBUG_TIMER = false; // Set to true to enable timer logs

// SIMPLIFIED: Only full-sentence mode (C1+C2 level)
// All difficulty levels removed - always use 100% hide percentage
const hidePercentage = 100;
const dictationMode = 'full-sentence';

// calculateSimilarity is now imported from lib/dictationUtils.js

const DictationPageContent = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lessonId, mode } = useRouter().query;

  // State management
  const [transcriptData, setTranscriptData] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentPlayEndTime, setSegmentPlayEndTime] = useState(null);
  const [segmentEndTimeLocked, setSegmentEndTimeLocked] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [pausedPositions, setPausedPositions] = useState({}); // { sentenceIndex: pausedTime }
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  const [userSeekTimeout, setUserSeekTimeout] = useState(null);
  const [isTextHidden, setIsTextHidden] = useState(true);

  // Auto-stop video at end of sentence (similar to shadowing mode)
  const [autoStop, setAutoStop] = useState(true);

  // Learning mode: Always 'shadowing' - dictation mode removed
  const learningMode = 'shadowing';

  // Playback speed control
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Full sentence input states
  const [fullSentenceInputs, setFullSentenceInputs] = useState({}); // { sentenceIndex: inputText }
  const [sentenceResults, setSentenceResults] = useState({}); // { sentenceIndex: { similarity: number, isCorrect: boolean } }
  const [revealedHintWords, setRevealedHintWords] = useState({}); // { sentenceIndex: { wordIndex: true } }
  const [wordComparisonResults, setWordComparisonResults] = useState({}); // { sentenceIndex: { wordIndex: 'correct' | 'incorrect' } }
  const [partialRevealedChars, setPartialRevealedChars] = useState({}); // { sentenceIndex: { wordIndex: numberOfCharsRevealed } }
  const [checkedSentences, setCheckedSentences] = useState([]); // Array of sentence indices that have been checked (revealed after check)

  // Use SWR hook for combined lesson + progress data
  const { lesson, progress: loadedProgress, studyTime: loadedStudyTime, isLoading: loading } = useLessonData(lessonId, 'dictation');

  // Get user and auth functions
  const { user } = useAuth();

  // Dictation specific states (from ckk)
  const [savedWords, setSavedWords] = useState([]);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedInput, setLastClickedInput] = useState(null);
  const [processedText, setProcessedText] = useState('');

  // Track if we've already jumped to first incomplete sentence
  const hasJumpedToIncomplete = useRef(false);

  // Touch swipe handling
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Progress tracking
  const [completedSentences, setCompletedSentences] = useState([]);
  const [completedWords, setCompletedWords] = useState({}); // { sentenceIndex: { wordIndex: correctWord } }
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Points tracking - track which words have been scored
  const [wordPointsProcessed, setWordPointsProcessed] = useState({}); // { sentenceIndex: { wordIndex: 'correct' | 'incorrect' } }

  // Points animation - using custom hook
  const { pointsAnimations, showPointsAnimation, updatePoints: updatePointsBase } = usePointsAnimation();

  // Vocabulary popup states
  const [showVocabPopup, setShowVocabPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [popupArrowPosition, setPopupArrowPosition] = useState('right');
  const [clickedWordElement, setClickedWordElement] = useState(null);

  // Mobile tooltip states
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipWord, setTooltipWord] = useState('');
  const [tooltipTranslation, setTooltipTranslation] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // Sentence translation for desktop Diktat column
  const [sentenceTranslation, setSentenceTranslation] = useState('');
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [showTranslation, setShowTranslation] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('dictationShowTranslation');
    return saved !== null ? saved === 'true' : true;
  });

  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);

  // Word suggestion popup states
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const [suggestionWord, setSuggestionWord] = useState('');
  const [suggestionWordIndex, setSuggestionWordIndex] = useState(null);
  const [suggestionContext, setSuggestionContext] = useState('');
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const [suggestionOptions, setSuggestionOptions] = useState(null); // Pre-generated options from transcript

  // Lesson vocabulary states
  const [lessonVocabulary, setLessonVocabulary] = useState([]);
  const [isLoadingVocabulary, setIsLoadingVocabulary] = useState(false);

  // Saved vocabulary states (user's saved words for this lesson)
  const [savedVocabulary, setSavedVocabulary] = useState([]);
  const [isLoadingSavedVocab, setIsLoadingSavedVocab] = useState(false);

  // Mobile vocabulary popup state
  const [showMobileVocabulary, setShowMobileVocabulary] = useState(false);

  // Consecutive sentence completion counter
  const [consecutiveSentences, setConsecutiveSentences] = useState(0);

  // Voice recording states for dictation practice (per sentence)
  const [recordingStates, setRecordingStates] = useState({}); // { sentenceIndex: { isRecording, recordedBlob, comparisonResult, isPlaying } }
  const audioPlaybackRef = useRef(null);

  // Voice recording result from video control
  const [voiceRecordingResult, setVoiceRecordingResult] = useState(null);

  // Clear voice recording result when sentence changes
  useEffect(() => {
    setVoiceRecordingResult(null);
  }, [currentSentenceIndex]);

  // Study time tracking - using custom hook
  const { studyTime, isTimerRunning, progressLoaded: studyTimeLoaded } = useStudyTimer({
    isPlaying,
    user,
    lessonId,
    loadedStudyTime,
    mode: 'dictation'
  });

  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);

  // Ref for mobile dictation slides to enable auto-scroll
  const dictationSlidesRef = useRef(null);
  const mobileShadowingListRef = useRef(null); // Ref for mobile shadowing transcript list
  const isProgrammaticScrollRef = useRef(false); // Track programmatic vs manual scroll
  const isUserClickedTranscriptRef = useRef(false); // Track when user clicks transcript item directly
  const lastRenderedStateRef = useRef({ sentenceIndex: -1, isCompleted: false }); // Track last rendered state to prevent infinite loop

  // Leaderboard tracking - using custom hook
  const { updateMonthlyStats } = useLeaderboard({ user, currentSentenceIndex, transcriptData });

  // Karaoke highlight for shadowing mode
  const activeSentence = transcriptData[currentSentenceIndex];
  const { activeWordIndex } = useKaraokeHighlight(
    activeSentence,
    currentTime,
    isPlaying,
    learningMode === 'shadowing'
  );

  // Suggestion popup - use hook for generateLocalSuggestions utility
  const { generateLocalSuggestions } = useSuggestionPopup({
    transcriptData,
    onSetCurrentSentenceIndex: setCurrentSentenceIndex
  });

  // Expose audioRef globally để components có thể pause khi phát từ
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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check on mount
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save showTranslation preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dictationShowTranslation', showTranslation.toString());
    }
  }, [showTranslation]);

  // Fetch sentence translation when current sentence changes (desktop only)
  useEffect(() => {
    const fetchSentenceTranslation = async () => {
      // Only fetch on desktop
      if (isMobile) return;

      const sentence = transcriptData[currentSentenceIndex];
      if (!sentence || !sentence.text) {
        setSentenceTranslation('');
        return;
      }

      // PRIORITY 1: Use pre-loaded translation from JSON (offline data)
      if (sentence.translation) {
        setSentenceTranslation(sentence.translation);
        return;
      }

      const targetLang = user?.nativeLanguage || 'vi';

      // PRIORITY 2: Check in-memory cache
      const cached = translationCache.get(sentence.text, 'de', targetLang);
      if (cached) {
        setSentenceTranslation(cached);
        return;
      }

      // PRIORITY 3: Fallback to API call (only if no offline data available)
      setIsLoadingTranslation(true);

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: sentence.text,
            context: '',
            sourceLang: 'de',
            targetLang: targetLang,
            mode: 'sentence' // Use OpenAI for natural sentence translation
          })
        });

        const data = await response.json();
        if (data.success && data.translation) {
          setSentenceTranslation(data.translation);
          translationCache.set(sentence.text, data.translation, 'de', targetLang);
        } else {
          setSentenceTranslation('');
        }
      } catch (error) {
        console.error('Sentence translation error:', error);
        setSentenceTranslation('');
      } finally {
        setIsLoadingTranslation(false);
      }
    };

    fetchSentenceTranslation();
  }, [currentSentenceIndex, transcriptData, isMobile, user?.nativeLanguage]);

  // Note: Auto-scroll for transcript is now handled inside TranscriptPanel component

  // Update popup position on scroll
  useEffect(() => {
    if (!showVocabPopup || !clickedWordElement) return;

    let rafId = null;
    let isUpdating = false;

    const updatePopupPosition = () => {
      if (!isUpdating) {
        isUpdating = true;
        rafId = requestAnimationFrame(() => {
          const rect = clickedWordElement.getBoundingClientRect();
          const popupWidth = 350;
          const popupHeight = 280;
          const gapFromWord = 30;

          const spaceAbove = rect.top;
          const spaceBelow = window.innerHeight - rect.bottom;

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
  }, [showVocabPopup, clickedWordElement]);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Use centralized YouTube API manager
  useEffect(() => {
    if (typeof window === 'undefined') return;

    youtubeAPI.waitForAPI()
      .then(() => setIsYouTubeAPIReady(true))
      .catch(err => console.error('YouTube API error:', err));
  }, []);

  // Set isYouTube flag
  useEffect(() => {
    if (!lesson || !lesson.youtubeUrl) {
      setIsYouTube(false);
    } else {
      setIsYouTube(true);
    }
  }, [lesson]);

  // Initialize YouTube player when API is ready and element is rendered
  useEffect(() => {
    if (!isYouTube || !isYouTubeAPIReady || !lesson) {
      return;
    }

    const playerOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (!videoId) return;

    // Function to initialize player - with retry logic
    const initializePlayer = () => {
      const playerElement = document.getElementById('youtube-player');

      // If element doesn't exist yet, wait for next frame
      if (!playerElement) {
        requestAnimationFrame(initializePlayer);
        return;
      }

      // Destroy existing player if any
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }

      // Create the player
      youtubePlayerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
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

            // Only set size on desktop - mobile uses CSS aspect-ratio or height
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
              const playerElement = document.getElementById('youtube-player');
              if (playerElement && playerElement.parentElement) {
                // Get parent container (videoPlayerWrapper) dimensions
                const wrapper = playerElement.parentElement;
                const rect = wrapper.getBoundingClientRect();

                // Set player size to fill the container
                if (rect.width > 0 && rect.height > 0) {
                  event.target.setSize(rect.width, rect.height);
                }
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

    // Start initialization
    initializePlayer();

    // Add resize listener to adjust player size when window resizes (desktop only)
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile && youtubePlayerRef.current && youtubePlayerRef.current.setSize) {
        const playerElement = document.getElementById('youtube-player');
        if (playerElement && playerElement.parentElement) {
          const wrapper = playerElement.parentElement;
          const rect = wrapper.getBoundingClientRect();

          if (rect.width > 0 && rect.height > 0) {
            youtubePlayerRef.current.setSize(rect.width, rect.height);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // Also handle orientation change on mobile
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);

      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [isYouTube, isYouTubeAPIReady, lesson]);

  // Load transcript when lesson is ready (from SWR)
  useEffect(() => {
    if (lesson && lesson.json) {
      loadTranscript(lesson.json);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson]);

  // Load vocabulary when lesson is ready
  useEffect(() => {
    const loadVocabulary = async () => {
      if (!lesson || !lesson.json) return;

      // Convert transcript path to vocabulary path
      // e.g., /text/lesson-name.json -> /text/lesson-name.vocab.json
      const vocabPath = lesson.json.replace('.json', '.vocab.json');

      setIsLoadingVocabulary(true);
      try {
        const response = await fetch(vocabPath);
        if (response.ok) {
          const data = await response.json();
          setLessonVocabulary(data.vocabulary || []);
        } else {
          // No vocabulary file for this lesson
          setLessonVocabulary([]);
        }
      } catch (error) {
        console.error('Error loading vocabulary:', error);
        setLessonVocabulary([]);
      } finally {
        setIsLoadingVocabulary(false);
      }
    };

    loadVocabulary();
  }, [lesson]);

  // Load saved vocabulary for this lesson (user's saved words)
  const fetchSavedVocabulary = useCallback(async () => {
    if (!lessonId) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setSavedVocabulary([]);
      return;
    }

    setIsLoadingSavedVocab(true);
    try {
      const response = await fetch(`/api/vocabulary?lessonId=${lessonId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSavedVocabulary(data || []);
      } else {
        setSavedVocabulary([]);
      }
    } catch (error) {
      console.error('Error loading saved vocabulary:', error);
      setSavedVocabulary([]);
    } finally {
      setIsLoadingSavedVocab(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchSavedVocabulary();
  }, [fetchSavedVocabulary]);

  // Handle delete vocabulary
  const handleDeleteVocabulary = useCallback(async (vocabId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const response = await fetch(`/api/vocabulary?id=${vocabId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove from local state
        setSavedVocabulary(prev => prev.filter(v => v._id !== vocabId));
        toast.success('Đã xóa từ vựng');
      }
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      toast.error('Không thể xóa từ vựng');
    }
  }, []);

  // Load progress from SWR hook (logged-in users) or localStorage (guests)
  useEffect(() => {
    // Helper function to normalize and set progress data
    const setProgressData = (loadedSentences, loadedWords, loadedRevealedWords, source) => {
      // Normalize keys to numbers
      const normalizedWords = {};
      Object.keys(loadedWords).forEach(sentenceIdx => {
        const numIdx = parseInt(sentenceIdx);
        normalizedWords[numIdx] = {};
        Object.keys(loadedWords[sentenceIdx]).forEach(wordIdx => {
          const numWordIdx = parseInt(wordIdx);
          normalizedWords[numIdx][numWordIdx] = loadedWords[sentenceIdx][wordIdx];
        });
      });

      // Normalize revealedHintWords keys to numbers
      const normalizedRevealedWords = {};
      if (loadedRevealedWords) {
        Object.keys(loadedRevealedWords).forEach(sentenceIdx => {
          const numIdx = parseInt(sentenceIdx);
          normalizedRevealedWords[numIdx] = {};
          Object.keys(loadedRevealedWords[sentenceIdx]).forEach(wordIdx => {
            const numWordIdx = parseInt(wordIdx);
            normalizedRevealedWords[numIdx][numWordIdx] = loadedRevealedWords[sentenceIdx][wordIdx];
          });
        });
      }

      setCompletedSentences(loadedSentences);
      setCompletedWords(normalizedWords);
      setRevealedHintWords(normalizedRevealedWords);
      setProgressLoaded(true);
    };

    // Wait until loadedProgress is actually loaded (not undefined)
    if (loadedProgress !== undefined) {
      // Check if user is logged in
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (token) {
        // Logged-in user: use data from API (SWR)
        const loadedSentences = loadedProgress.completedSentences || [];
        const loadedWords = loadedProgress.completedWords || {};
        const loadedRevealedWords = loadedProgress.revealedHintWords || {};
        setProgressData(loadedSentences, loadedWords, loadedRevealedWords, 'API (logged-in user)');
      } else {
        // Guest user: try to load from localStorage
        try {
          const savedProgress = localStorage.getItem(`dictation_progress_${lessonId}`);
          if (savedProgress) {
            const parsed = JSON.parse(savedProgress);
            const loadedSentences = parsed.completedSentences || [];
            const loadedWords = parsed.completedWords || {};
            const loadedRevealedWords = parsed.revealedHintWords || {};
            setProgressData(loadedSentences, loadedWords, loadedRevealedWords, 'localStorage (guest)');
          } else {
            // No saved progress for guest
            setProgressData([], {}, {}, 'none (new guest)');
          }
        } catch (error) {
          console.error('Error loading guest progress from localStorage:', error);
          setProgressData([], {}, {}, 'none (error)');
        }
      }
    }
  }, [loadedProgress, lessonId]);

  // Auto-jump to first incomplete sentence on page load (once only)
  // This useEffect is DISABLED - using the one at line ~3290 instead
  // Keep this commented out to avoid duplicate jumps
  /*
  useEffect(() => {
    if (!progressLoaded || !transcriptData.length || hasJumpedToIncomplete.current) {
      return;
    }

    // Find first incomplete sentence
    let firstIncompleteIndex = -1;
    for (let i = 0; i < transcriptData.length; i++) {
      if (!completedSentences.includes(i)) {
        firstIncompleteIndex = i;
        break;
      }
    }

    // Jump to first incomplete sentence if found and different from current
    if (firstIncompleteIndex !== -1 && firstIncompleteIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(firstIncompleteIndex);
      
      // Seek to the start of that sentence
      const targetSentence = transcriptData[firstIncompleteIndex];
      if (targetSentence) {
        if (isYouTube) {
          const player = youtubePlayerRef.current;
          if (player && player.seekTo) {
            player.seekTo(targetSentence.start);
          }
        } else {
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = targetSentence.start;
          }
        }
      }
    }

    // Mark as jumped so we don't auto-jump again
    hasJumpedToIncomplete.current = true;
  }, [progressLoaded, transcriptData, completedSentences, currentSentenceIndex, isYouTube]);
  */

  // Smooth time update with requestAnimationFrame
  useEffect(() => {
    let animationFrameId = null;

    const updateTime = () => {
      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player && player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
          const currentTime = player.getCurrentTime();
          setCurrentTime(currentTime);

          // Auto-stop when segment ends (only if autoStop is enabled)
          if (autoStop && segmentPlayEndTime !== null && currentTime >= segmentPlayEndTime - 0.02) {
            if (player.pauseVideo) player.pauseVideo();
            setIsPlaying(false);
            setSegmentPlayEndTime(null);
          }
        }
      } else {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          setCurrentTime(audio.currentTime);

          // Auto-stop when segment ends (only if autoStop is enabled)
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

    // Initial time update
    setCurrentTime(audio.currentTime);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [isYouTube]);

  // Auto-update current sentence based on audio time
  useEffect(() => {
    if (isUserSeeking) return; // Skip auto-update during user seek

    if (!transcriptData.length) return;

    const currentIndex = transcriptData.findIndex(
      (item, index) => currentTime >= item.start && currentTime < item.end
    );

    if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(currentIndex);

      // Khi câu thay đổi và đang phát, update endTime của câu mới (chỉ khi không lock)
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
  }, [currentTime, transcriptData, currentSentenceIndex, segmentEndTimeLocked, isYouTube, isUserSeeking]);

  // Cleanup user seek timeout
  useEffect(() => {
    return () => {
      if (userSeekTimeout) clearTimeout(userSeekTimeout);
    };
  }, [userSeekTimeout]);

  // Audio control functions
  const handleSeek = useCallback((direction, customSeekTime = null) => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player || !player.getCurrentTime) return;

      const seekTime = customSeekTime || 2;
      const currentSegment = transcriptData[currentSentenceIndex];

      if (!currentSegment) return;

      let newTime = player.getCurrentTime();
      if (direction === 'backward') {
        newTime = player.getCurrentTime() - seekTime;
      } else if (direction === 'forward') {
        newTime = player.getCurrentTime() + seekTime;
      }

      // Constrain the new time to current segment boundaries
      newTime = Math.max(currentSegment.start, Math.min(currentSegment.end - 0.1, newTime));
      if (player.seekTo) player.seekTo(newTime);

      // Update segment end time if playing
      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        setSegmentPlayEndTime(currentSegment.end);
      }
    } else {
      const audio = audioRef.current;
      if (!audio || !isFinite(audio.duration)) return;

      const seekTime = customSeekTime || 2;
      const currentSegment = transcriptData[currentSentenceIndex];

      if (!currentSegment) return;

      // Calculate new position but constrain it within current segment
      let newTime = audio.currentTime;
      if (direction === 'backward') {
        newTime = audio.currentTime - seekTime;
      } else if (direction === 'forward') {
        newTime = audio.currentTime + seekTime;
      }

      // Constrain the new time to current segment boundaries
      newTime = Math.max(currentSegment.start, Math.min(currentSegment.end - 0.1, newTime));
      audio.currentTime = newTime;

      // Update segment end time if playing
      if (!audio.paused) {
        setSegmentPlayEndTime(currentSegment.end);
      }
    }
  }, [transcriptData, currentSentenceIndex, isYouTube]);

  const handlePlayPause = useCallback(() => {
    // Haptic feedback for play/pause
    hapticEvents.audioPlay();

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
          setSegmentEndTimeLocked(false); // Cho phép chuyển câu tự động khi phát liên tục
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
        // Kiểm tra nếu đang ở cuối câu (hoặc sau endTime), reset về đầu câu
        if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
          const currentSentence = transcriptData[currentSentenceIndex];

          // Nếu currentTime >= endTime của câu, reset về đầu câu
          if (audio.currentTime >= currentSentence.end - 0.05) {
            audio.currentTime = currentSentence.start;
          }

          audio.play();
          setIsPlaying(true);
          setSegmentPlayEndTime(currentSentence.end);
          setSegmentEndTimeLocked(false); // Cho phép chuyển câu tự động khi phát liên tục
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

  // Handle playback speed change
  const handleSpeedChange = useCallback((speed) => {
    setPlaybackSpeed(speed);

    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (player && player.setPlaybackRate) {
        player.setPlaybackRate(speed);
      }
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.playbackRate = speed;
      }
    }
  }, [isYouTube]);

  // Apply playback speed when YouTube player is ready
  useEffect(() => {
    if (isYouTube && youtubePlayerRef.current && playbackSpeed !== 1) {
      const player = youtubePlayerRef.current;
      if (player.setPlaybackRate) {
        player.setPlaybackRate(playbackSpeed);
      }
    }
  }, [isYouTube, playbackSpeed]);

  // Audio control functions
  const handleSentenceClick = useCallback((startTime, endTime) => {
    // Find the clicked sentence index
    const clickedIndex = transcriptData.findIndex(
      (item) => item.start === startTime && item.end === endTime
    );
    if (clickedIndex === -1) return;

    // Always replay from the beginning of the sentence
    if (userSeekTimeout) clearTimeout(userSeekTimeout);
    setIsUserSeeking(true);

    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player) return;
      if (player.seekTo) player.seekTo(startTime);
      if (player.playVideo) player.playVideo();
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = startTime;
      audio.play();
    }
    setIsPlaying(true);
    setSegmentPlayEndTime(endTime);
    setSegmentEndTimeLocked(true);

    // Reset seeking flag after seek completes
    const timeout = setTimeout(() => {
      setIsUserSeeking(false);
    }, 1500);
    setUserSeekTimeout(timeout);

    // Update currentSentenceIndex to match the clicked sentence
    setCurrentSentenceIndex(clickedIndex);

    // Set flag to skip auto-scroll (user clicked directly)
    isUserClickedTranscriptRef.current = true;
    // Reset flag after a short delay
    setTimeout(() => {
      isUserClickedTranscriptRef.current = false;
    }, 500);
  }, [transcriptData, isYouTube, userSeekTimeout]);

  // Transcript indices in normal order
  const sortedTranscriptIndices = useMemo(() => {
    if (!transcriptData || transcriptData.length === 0) return [];
    return [...Array(transcriptData.length).keys()];
  }, [transcriptData]);

  // Transcript display indices - ALWAYS in original order for the transcript column
  const transcriptDisplayIndices = useMemo(() => {
    if (!transcriptData || transcriptData.length === 0) return [];
    // Always return normal order (1, 2, 3...) for transcript display
    return [...Array(transcriptData.length).keys()];
  }, [transcriptData]);

  // Mobile dictation slides show all sentences in normal order
  const mobileVisibleIndices = useMemo(() => {
    return sortedTranscriptIndices;
  }, [sortedTranscriptIndices]);

  // LAZY LOADING: Calculate visible slide range (only render 3 slides: prev, current, next)
  const lazySlideRange = useMemo(() => {
    if (!isMobile || mobileVisibleIndices.length === 0) {
      return { start: 0, end: mobileVisibleIndices.length };
    }

    const currentSlideIndex = mobileVisibleIndices.indexOf(currentSentenceIndex);

    // If current sentence not in visible indices, render all (fallback)
    if (currentSlideIndex === -1) {
      return { start: 0, end: mobileVisibleIndices.length };
    }

    // Calculate range: [currentIndex - 1, currentIndex, currentIndex + 1]
    const start = Math.max(0, currentSlideIndex - 1);
    const end = Math.min(mobileVisibleIndices.length, currentSlideIndex + 2);

    return { start, end };
  }, [isMobile, mobileVisibleIndices, currentSentenceIndex]);

  // Lazy loading enabled slides (only the ones to render)
  const lazySlidesToRender = useMemo(() => {
    return mobileVisibleIndices.slice(lazySlideRange.start, lazySlideRange.end);
  }, [mobileVisibleIndices, lazySlideRange]);

  // Auto-scroll mobile dictation slides to current sentence (with lazy loading support)
  useEffect(() => {
    if (isMobile && dictationSlidesRef.current && transcriptData.length > 0) {
      const container = dictationSlidesRef.current;
      const slideIndex = mobileVisibleIndices.indexOf(currentSentenceIndex);

      if (slideIndex !== -1) {
        // Find the actual rendered slide by data-slide-index attribute
        const targetSlide = container.querySelector(`[data-slide-index="${slideIndex}"]`);

        if (targetSlide) {
          // Mark as programmatic scroll to prevent handleScroll from interfering
          isProgrammaticScrollRef.current = true;

          // Scroll to center the slide
          targetSlide.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });

          // Clear flag after scroll animation completes
          setTimeout(() => {
            isProgrammaticScrollRef.current = false;
          }, 800);
        } else {
          console.warn('⚠️ Target slide not found in lazy-loaded range');
        }
      }
    }
  }, [currentSentenceIndex, isMobile, mobileVisibleIndices, transcriptData.length, lazySlideRange]);

  // Auto-scroll mobile shadowing list to current sentence when playing
  useEffect(() => {
    if (!isMobile || learningMode !== 'shadowing' || !mobileShadowingListRef.current) return;
    if (transcriptData.length === 0) return;

    const container = mobileShadowingListRef.current;
    const targetItem = container.querySelector(`[data-sentence-index="${currentSentenceIndex}"]`);

    if (targetItem) {
      // Calculate scroll position to show current sentence at position 2 (with 1 item above)
      const itemHeight = targetItem.offsetHeight;
      const targetScrollTop = targetItem.offsetTop - itemHeight;

      container.scrollTo({
        top: Math.max(0, targetScrollTop), // Ensure we don't scroll to negative position
        behavior: 'smooth'
      });
    }
  }, [currentSentenceIndex, isMobile, learningMode, transcriptData.length]);

  // Sync currentSentenceIndex when user manually scrolls slides
  useEffect(() => {
    if (!isMobile || !dictationSlidesRef.current) return;

    const container = dictationSlidesRef.current;
    let scrollTimeout;

    const handleScroll = () => {
      // Skip if this is a programmatic scroll (from buttons/swipe/keyboard)
      if (isProgrammaticScrollRef.current) {
        return;
      }

      // Clear previous timeout
      clearTimeout(scrollTimeout);

      // Debounce to avoid too many updates during scroll
      scrollTimeout = setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        // Find which slide is currently centered
        const slides = container.querySelectorAll('[data-slide-index]');
        let closestSlide = null;
        let minDistance = Infinity;

        slides.forEach((slide) => {
          const slideRect = slide.getBoundingClientRect();
          const slideCenter = slideRect.left + slideRect.width / 2;
          const distance = Math.abs(slideCenter - containerCenter);

          if (distance < minDistance) {
            minDistance = distance;
            closestSlide = slide;
          }
        });

        if (closestSlide) {
          const slideIndex = parseInt(closestSlide.getAttribute('data-slide-index'));
          const sentenceIndex = mobileVisibleIndices[slideIndex];

          // Only update if different from current
          if (sentenceIndex !== undefined && sentenceIndex !== currentSentenceIndex) {
            setCurrentSentenceIndex(sentenceIndex);

            // Update audio/video position to match the sentence
            const sentence = transcriptData[sentenceIndex];
            if (sentence) {
              if (youtubePlayerRef.current && isYouTube) {
                youtubePlayerRef.current.seekTo(sentence.start, true);
                setCurrentTime(sentence.start);
              } else if (audioRef.current) {
                audioRef.current.currentTime = sentence.start;
                setCurrentTime(sentence.start);
              }
              setSegmentPlayEndTime(sentence.end);
            }
          }
        }
      }, 150); // 150ms debounce
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isMobile, mobileVisibleIndices, currentSentenceIndex, transcriptData, isYouTube]);

  const goToPreviousSentence = useCallback(() => {
    // Find current position in sorted list
    const currentPositionInSorted = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    if (currentPositionInSorted > 0) {
      // Mark as programmatic scroll to prevent handleScroll from interfering
      isProgrammaticScrollRef.current = true;

      // Get previous index from sorted list
      const newIndex = sortedTranscriptIndices[currentPositionInSorted - 1];
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);

      // Clear flag after scroll animation completes (smooth scroll ~300ms)
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    }
  }, [currentSentenceIndex, transcriptData, handleSentenceClick, sortedTranscriptIndices]);

  const goToNextSentence = useCallback(() => {
    // Find current position in sorted list
    const currentPositionInSorted = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    if (currentPositionInSorted < sortedTranscriptIndices.length - 1) {
      // Mark as programmatic scroll to prevent handleScroll from interfering
      isProgrammaticScrollRef.current = true;

      // Get next index from sorted list
      const newIndex = sortedTranscriptIndices[currentPositionInSorted + 1];
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);

      // Clear flag after scroll animation completes (smooth scroll ~300ms)
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    }
  }, [currentSentenceIndex, transcriptData, handleSentenceClick, sortedTranscriptIndices]);

  // Handle mobile slide click (for inactive slides)
  const handleMobileSlideClick = useCallback((originalIndex, sentence) => {
    isProgrammaticScrollRef.current = true;
    setCurrentSentenceIndex(originalIndex);
    handleSentenceClick(sentence.start, sentence.end);
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 1000);
  }, [handleSentenceClick]);

  // Handle mobile input change
  const handleMobileInputChange = useCallback((sentenceIndex, value) => {
    setFullSentenceInputs(prev => ({
      ...prev,
      [sentenceIndex]: value
    }));
  }, []);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 60; // Optimized threshold for accurate swipe detection
    const isRightSwipe = distance < -60;

    if (isLeftSwipe) {
      e.preventDefault();

      // Haptic feedback for swipe
      hapticEvents.slideSwipe();

      goToNextSentence();
    } else if (isRightSwipe) {
      e.preventDefault();

      // Haptic feedback for swipe
      hapticEvents.slideSwipe();

      goToPreviousSentence();
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, goToNextSentence, goToPreviousSentence]);

  // Global keyboard shortcuts
  const handleGlobalKeyDown = useCallback((event) => {
    const isMediaReady = isYouTube ? (youtubePlayerRef.current && duration > 0) : (audioRef.current && isFinite(audioRef.current.duration));

    // Check if focus is on an input field
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );

    switch (event.key) {
      case 'ArrowLeft':
        // Arrow left should always work for seek backward, even when input is focused
        if (isMediaReady) {
          event.preventDefault();
          handleSeek('backward');
        }
        break;
      case 'ArrowRight':
        // Arrow right should always work for seek forward, even when input is focused
        if (isMediaReady) {
          event.preventDefault();
          handleSeek('forward');
        }
        break;
      case ' ':
        // Space key for play/pause - works even when input is focused (shadowing mode)
        if (isMediaReady) {
          event.preventDefault();
          handlePlayPause();
        }
        break;
      case 'ArrowUp':
        if (!isInputFocused) {
          event.preventDefault();
          goToPreviousSentence();
        }
        break;
      case 'ArrowDown':
        if (!isInputFocused) {
          event.preventDefault();
          goToNextSentence();
        }
        break;
      default: break;
    }
  }, [handleSeek, handlePlayPause, goToPreviousSentence, goToNextSentence, isYouTube, duration]);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Load transcript from JSON
  const loadTranscript = async (jsonPath) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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

      setTranscriptData(transformedData);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Timeout loading transcript:', jsonPath);
      } else {
        console.error('Lỗi tải transcript:', error);
      }
    }
  };



  // Handle progress bar click
  const handleProgressClick = useCallback((e) => {
    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (player && player.seekTo) {
        player.seekTo(newTime);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    }
  }, [duration, isYouTube]);

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Format study time to HH:MM:SS
  const formatStudyTime = (totalSeconds) => {
    if (!isFinite(totalSeconds)) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Save progress to database (logged-in users) or localStorage (guests)
  const saveProgress = useCallback(async (updatedCompletedSentences, updatedCompletedWords, updatedRevealedHintWords = null) => {
    if (!lessonId) return;

    // Use current state if not provided
    const revealedWordsToSave = updatedRevealedHintWords !== null ? updatedRevealedHintWords : revealedHintWords;

    try {
      const token = localStorage.getItem('token');

      // Guest users: save to localStorage
      if (!token) {
        const guestProgress = {
          completedSentences: updatedCompletedSentences,
          completedWords: updatedCompletedWords,
          revealedHintWords: revealedWordsToSave,
          lastUpdated: Date.now()
        };
        localStorage.setItem(`dictation_progress_${lessonId}`, JSON.stringify(guestProgress));
        return;
      }

      const totalWords = transcriptData.reduce((sum, sentence) => {
        const words = sentence.text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1);
        return sum + words.length;
      }, 0);

      // Count correct words from completedWords object
      let correctWordsCount = 0;
      Object.keys(updatedCompletedWords).forEach(sentenceIdx => {
        const sentenceWords = updatedCompletedWords[sentenceIdx];
        correctWordsCount += Object.keys(sentenceWords).length;
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          mode: 'shadowing',
          progress: {
            completedSentences: updatedCompletedSentences,
            completedWords: updatedCompletedWords,
            revealedHintWords: revealedWordsToSave,
            currentSentenceIndex,
            totalSentences: transcriptData.length,
            correctWords: correctWordsCount,
            totalWords
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      await response.json();
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [lessonId, transcriptData, currentSentenceIndex, revealedHintWords]);

  // Handle full sentence submission
  const handleFullSentenceSubmit = useCallback((sentenceIndex) => {
    const userInput = fullSentenceInputs[sentenceIndex] || '';
    const correctSentence = transcriptData[sentenceIndex]?.text || '';

    if (!userInput.trim()) {
      // toast.warning('Vui lòng nhập văn bản');
      return;
    }

    // Calculate similarity
    const similarity = calculateSimilarity(userInput, correctSentence);
    const isCorrect = similarity >= 80;

    // Compare word by word
    const normalize = (str) => str.toLowerCase().trim().replace(/[.,!?;:"""''„]/g, '').replace(/\s+/g, ' ');
    const userWords = normalize(userInput).split(' ').filter(w => w.length > 0);
    const correctWords = normalize(correctSentence).split(' ').filter(w => w.length > 0);

    // Build word comparison results
    const wordComparison = {};
    correctWords.forEach((correctWord, idx) => {
      const userWord = userWords[idx] || '';
      wordComparison[idx] = userWord === correctWord ? 'correct' : 'incorrect';
    });

    // Update sentence results
    setSentenceResults(prev => ({
      ...prev,
      [sentenceIndex]: { similarity, isCorrect }
    }));

    // Update word comparison results
    setWordComparisonResults(prev => ({
      ...prev,
      [sentenceIndex]: wordComparison
    }));

    // Auto-reveal all hint words to show comparison
    const revealAllWords = {};
    correctWords.forEach((_, idx) => {
      revealAllWords[idx] = true;
    });
    setRevealedHintWords(prev => ({
      ...prev,
      [sentenceIndex]: revealAllWords
    }));

    // Clear partial reveals after checking
    setPartialRevealedChars(prev => ({
      ...prev,
      [sentenceIndex]: {}
    }));

    // Mark sentence as checked (to reveal in transcript, regardless of correct/incorrect)
    if (!checkedSentences.includes(sentenceIndex)) {
      setCheckedSentences(prev => [...prev, sentenceIndex]);
    }

    // If correct (>=80%), mark as completed
    if (isCorrect) {
      // Haptic feedback for success
      hapticEvents.wordCorrect();

      // Mark sentence as completed
      if (!completedSentences.includes(sentenceIndex)) {
        const updatedCompleted = [...completedSentences, sentenceIndex];
        setCompletedSentences(updatedCompleted);

        // Also update completedWords for full-sentence mode
        // Fill completedWords for the sentence so progress indicator shows 100%
        const sentenceWords = correctSentence.split(/\s+/).filter(w => {
          const pureWord = w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
          return pureWord.length >= 1;
        });

        const updatedCompletedWords = { ...completedWords };
        updatedCompletedWords[sentenceIndex] = {};
        sentenceWords.forEach((word, idx) => {
          updatedCompletedWords[sentenceIndex][idx] = word;
        });
        setCompletedWords(updatedCompletedWords);

        saveProgress(updatedCompleted, updatedCompletedWords);

        // Show success toast
        // toast.success(`✓ Chính xác ${similarity}%!`);
      }
    } else {
      // Haptic feedback for error
      hapticEvents.wordIncorrect();

      // Show error with similarity percentage
      // toast.error(`✗ Chỉ đúng ${similarity}%. Cần ≥80%`);
    }
  }, [fullSentenceInputs, transcriptData, completedSentences, completedWords, checkedSentences, saveProgress]);

  // Handle points for full-sentence mode when word comparison results change
  useEffect(() => {
    if (!transcriptData.length) return;

    // Process points for each sentence that has comparison results
    Object.keys(wordComparisonResults).forEach(sentenceIdx => {
      const sentenceIndex = parseInt(sentenceIdx);
      const comparisonResults = wordComparisonResults[sentenceIndex];
      const sentence = transcriptData[sentenceIndex];

      if (!sentence || !comparisonResults) return;

      // Count correct and incorrect words - ONLY for words NOT already processed via hint popup
      let correctCount = 0;
      let incorrectCount = 0;
      const unprocessedWordIndices = [];

      Object.keys(comparisonResults).forEach(wordIdxStr => {
        const wordIdx = parseInt(wordIdxStr);

        // Skip words already processed via hint popup (either correct or incorrect)
        if (wordPointsProcessed[sentenceIndex]?.[wordIdx]) {
          return;
        }

        unprocessedWordIndices.push(wordIdx);

        if (comparisonResults[wordIdx] === 'correct') {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });

      // If all words were already processed, skip this sentence
      if (unprocessedWordIndices.length === 0) {
        return;
      }

      // Award/deduct points as batch (with small delay for DOM update)
      setTimeout(() => {
        const firstWordBox = document.querySelector(`[data-sentence-index="${sentenceIndex}"] .${styles.hintWordBox}`);

        // Calculate total points: +1 per correct word, -0.5 per incorrect word
        const totalPoints = (correctCount * 1) + (incorrectCount * -0.5);

        // Only update if there's a point change
        if (totalPoints !== 0) {
          const reason = `Full-sentence: ${correctCount} từ đúng, ${incorrectCount} từ sai (tổng: ${totalPoints > 0 ? '+' : ''}${totalPoints})`;
          updatePoints(totalPoints, reason, firstWordBox);
        }

        // Mark only UNPROCESSED words as processed (skip ones already done via popup)
        const updatedProcessed = {};
        unprocessedWordIndices.forEach(wordIdx => {
          updatedProcessed[wordIdx] = comparisonResults[wordIdx];
        });

        setWordPointsProcessed(prev => ({
          ...prev,
          [sentenceIndex]: {
            ...(prev[sentenceIndex] || {}),
            ...updatedProcessed
          }
        }));
      }, 50);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordComparisonResults, transcriptData, wordPointsProcessed]);

  // Toggle reveal hint word (legacy - direct reveal without popup)
  const toggleRevealHintWord = useCallback((sentenceIndex, wordIndex) => {
    setRevealedHintWords(prev => {
      const updated = { ...prev };
      if (!updated[sentenceIndex]) {
        updated[sentenceIndex] = {};
      }

      // Toggle the word
      if (updated[sentenceIndex][wordIndex]) {
        // Hide word
        const newSentenceState = { ...updated[sentenceIndex] };
        delete newSentenceState[wordIndex];
        updated[sentenceIndex] = newSentenceState;
      } else {
        // Show word
        updated[sentenceIndex] = {
          ...updated[sentenceIndex],
          [wordIndex]: true
        };
        // Haptic feedback
        hapticEvents.buttonPress();
      }

      return updated;
    });
  }, []);

  // Calculate partial reveals based on user input
  const calculatePartialReveals = useCallback((sentenceIndex, userInput, correctSentence) => {
    const normalize = (str) => str.toLowerCase().trim().replace(/[.,!?;:"""''„]/g, '');
    const userWords = normalize(userInput).split(/\s+/).filter(w => w.length > 0);
    const correctWords = correctSentence.split(/\s+/).filter(w => w.length > 0).map(w => {
      return w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
    });

    const partialReveals = {};

    correctWords.forEach((correctWord, wordIdx) => {
      const userWord = userWords[wordIdx] || '';
      const normalizedCorrect = normalize(correctWord);
      const normalizedUser = normalize(userWord);

      // Count how many characters match from the start
      let matchingChars = 0;
      for (let i = 0; i < Math.min(normalizedCorrect.length, normalizedUser.length); i++) {
        if (normalizedCorrect[i] === normalizedUser[i]) {
          matchingChars++;
        } else {
          break; // Stop at first mismatch
        }
      }

      if (matchingChars > 0) {
        partialReveals[wordIdx] = matchingChars;
      }
    });

    setPartialRevealedChars(prev => ({
      ...prev,
      [sentenceIndex]: partialReveals
    }));
  }, []);

  // Save word function
  const saveWord = useCallback((word) => {
    setSavedWords(prev => {
      if (!prev.includes(word)) {
        return [...prev, word];
      }
      return prev;
    });
  }, []);

  // Save vocabulary to database
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
        // Refresh saved vocabulary list after saving
        fetchSavedVocabulary();
      } else {
        const error = await response.json();
        toast.error(error.message || t('lesson.vocabulary.error'));
      }
    } catch (error) {
      console.error('Save vocabulary error:', error);
      toast.error(t('lesson.vocabulary.generalError'));
    }
  }, [lessonId, transcriptData, currentSentenceIndex, t, fetchSavedVocabulary]);

  // Handle word click for popup (for completed words)
  const handleWordClickForPopup = useCallback(async (word, eventOrElement) => {
    // Handle both event object and element reference
    let element = eventOrElement;
    if (eventOrElement && eventOrElement.target) {
      // It's an event object
      element = eventOrElement.target;
    } else if (!eventOrElement || !(eventOrElement instanceof Element)) {
      // Invalid input
      console.error('Invalid event/element in handleWordClickForPopup');
      return;
    }

    // Pause main audio nếu đang phát
    if (typeof window !== 'undefined' && window.mainAudioRef?.current) {
      const audio = window.mainAudioRef.current;
      if (!audio.paused) {
        audio.pause();
      }
    }

    // Pause YouTube if playing
    if (isYouTube && youtubePlayerRef.current) {
      const player = youtubePlayerRef.current;
      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        if (player.pauseVideo) player.pauseVideo();
      }
    }

    const cleanedWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    if (!cleanedWord) return;

    // Speak the word
    speakText(cleanedWord);

    const rect = element.getBoundingClientRect();
    const isMobileView = window.innerWidth <= 768;

    if (isMobileView) {
      // Mobile: Show DictionaryPopup (same as desktop but with mobile styling)
      const popupWidth = 280;
      const popupHeight = 320;

      // Position popup centered at bottom of screen for mobile
      const top = window.innerHeight - popupHeight - 80; // 80px from bottom for mobile controls
      const left = (window.innerWidth - popupWidth) / 2;

      setClickedWordElement(element);
      setSelectedWord(cleanedWord);
      setPopupPosition({ top, left });
      setPopupArrowPosition('bottom');
      setShowVocabPopup(true);
    } else {
      // Desktop: Show full popup (top/bottom only)
      const popupWidth = 350;
      const popupHeight = 280;
      const gapFromWord = 30;

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top, left, arrowPos;

      // Default: try to show above
      if (spaceAbove >= popupHeight + gapFromWord + 20) {
        top = rect.top - popupHeight - gapFromWord;
        arrowPos = 'bottom';
      } else {
        // Show below if not enough space above
        top = rect.bottom + gapFromWord;
        arrowPos = 'top';
      }

      // Center horizontally with bounds checking
      left = rect.left + rect.width / 2 - popupWidth / 2;

      if (left < 20) {
        left = 20;
      }
      if (left + popupWidth > window.innerWidth - 20) {
        left = window.innerWidth - popupWidth - 20;
      }

      // Ensure popup doesn't go off screen vertically
      if (top < 20) {
        top = 20;
      }
      if (top + popupHeight > window.innerHeight - 20) {
        top = window.innerHeight - popupHeight - 20;
      }

      // Show popup immediately (loading state handled inside DictionaryPopup)
      setClickedWordElement(element);
      setSelectedWord(cleanedWord);
      setPopupPosition({ top, left });
      setPopupArrowPosition(arrowPos);
      setShowVocabPopup(true);
    }
  }, [isYouTube]);

  // Handle input click - Show hint popup on both Desktop and Mobile
  const handleInputClick = useCallback((input, correctWord, wordIndex) => {
    // Blur input to prevent typing - show 3 word suggestions popup instead
    input.blur();

    // Show hint popup with 3 word suggestions
    if (typeof window.showHintFromInput === 'function') {
      window.showHintFromInput(input, correctWord, wordIndex);
    }
  }, []);

  const findNextInput = (currentInput) => {
    // On mobile, only search within the current sentence/slide to prevent auto-jumping
    const isMobileView = window.innerWidth <= 768;

    if (isMobileView) {
      // Find the parent slide/sentence container
      const slideContainer = currentInput.closest('[data-sentence-index]');
      if (slideContainer) {
        const inputsInSlide = slideContainer.querySelectorAll(".word-input");
        const currentIndex = Array.from(inputsInSlide).indexOf(currentInput);
        return inputsInSlide[currentIndex + 1] || null; // Return null if no more inputs in this slide
      }
    }

    // Desktop: search all inputs on the page
    const allInputs = document.querySelectorAll(".word-input");
    const currentIndex = Array.from(allInputs).indexOf(currentInput);
    return allInputs[currentIndex + 1];
  };

  // Save individual word completion
  const saveWordCompletion = useCallback((wordIndex, correctWord) => {
    setCompletedWords(prevWords => {
      const updatedWords = { ...prevWords };

      if (!updatedWords[currentSentenceIndex]) {
        updatedWords[currentSentenceIndex] = {};
      }

      updatedWords[currentSentenceIndex][wordIndex] = correctWord;

      // Save to database with updated data
      saveProgress(completedSentences, updatedWords);

      return updatedWords;
    });
  }, [currentSentenceIndex, completedSentences, saveProgress]);

  // Check if current sentence is completed
  const checkSentenceCompletion = useCallback(() => {
    setTimeout(() => {
      // Check if this sentence is already marked as completed
      if (completedSentences.includes(currentSentenceIndex)) {
        return;
      }

      // Get the sentence text and count total words that need to be filled
      const sentence = transcriptData[currentSentenceIndex];
      if (!sentence) return;

      const words = sentence.text.split(/\s+/);

      // Full-sentence mode: all words count
      const validWordIndices = [];
      words.forEach((word, idx) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          validWordIndices.push(idx);
        }
      });

      // Full-sentence mode: all words need to be completed
      const totalValidWords = validWordIndices.length;
      const wordsToHideCount = totalValidWords;

      // Count completed words from DOM (not state) to avoid timing issues
      // This ensures we get the most up-to-date count including just-completed words
      const sentenceContainer = document.querySelector(`[data-sentence-index="${currentSentenceIndex}"]`);
      let completedWordsCount = 0;

      if (sentenceContainer) {
        // Count only user-completed words, EXCLUDE revealed-word and completed-word (those are already visible)
        const correctWordSpans = sentenceContainer.querySelectorAll('.correct-word:not(.revealed-word):not(.completed-word)');
        completedWordsCount = correctWordSpans.length;
      } else {
        // Fallback to state if DOM element not found (shouldn't happen)
        completedWordsCount = Object.keys(completedWords[currentSentenceIndex] || {}).length;
      }

      if (completedWordsCount >= wordsToHideCount && wordsToHideCount > 0) {
        // All words are correct, mark sentence as completed
        const updatedCompleted = [...completedSentences, currentSentenceIndex];
        setCompletedSentences(updatedCompleted);
        saveProgress(updatedCompleted, completedWords);

        // Check if all sentences are completed
        setTimeout(async () => {
          if (updatedCompleted.length === transcriptData.length) {

            // Haptic feedback for lesson completion
            hapticEvents.lessonComplete();

            // Calculate bonus points based on lesson length
            // 100+ sentences = 50 points, 50+ sentences = 20 points
            const totalSentences = transcriptData.length;
            let bonusPoints = 0;
            if (totalSentences >= 100) {
              bonusPoints = 50;
            } else if (totalSentences >= 50) {
              bonusPoints = 20;
            }

            const token = localStorage.getItem('token');
            if (token && bonusPoints > 0) {
              try {
                await fetch('/api/user/points', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    pointsChange: bonusPoints,
                    reason: `Hoàn thành bài Shadowing (${totalSentences} câu)`,
                    completedToday: true
                  })
                });

                // Show celebration toast with bonus info
                toast.success(`🎉 ${t('lesson.completion.allCompleted')} +${bonusPoints} bonus points!`);
              } catch (error) {
                console.error('Error awarding bonus points:', error);
                toast.success(t('lesson.completion.allCompleted'));
              }
            } else {
              toast.success(t('lesson.completion.allCompleted'));
            }
          }
        }, 400);
      }
    }, 50); // Reduced to 50ms for faster detection
  }, [completedSentences, currentSentenceIndex, completedWords, saveProgress, transcriptData, t]);

  // showPointsAnimation is now provided by usePointsAnimation hook

  // Update points function
  const updatePoints = useCallback(async (pointsChange, reason, element = null) => {
    if (!user) return;

    // Use hook's updatePoints for API call and animation
    await updatePointsBase(user, pointsChange, reason, element);
  }, [user, updatePointsBase]);

  // Update input background
  const updateInputBackground = useCallback((input, correctWord) => {
    const trimmedValue = input.value.trim();
    if (trimmedValue.toLowerCase() === correctWord.substring(0, trimmedValue.length).toLowerCase()) {
      input.style.setProperty('background', '#10b981', 'important');
      input.style.setProperty('border-color', '#10b981', 'important');
    } else {
      input.style.setProperty('background', '#ef4444', 'important');
      input.style.setProperty('border-color', '#ef4444', 'important');
    }
  }, []);

  // Check word function
  const checkWord = useCallback((input, correctWord, wordIndex) => {
    const sanitizedCorrectWord = correctWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const sanitizedInputValue = input.value.trim();

    if (sanitizedInputValue.toLowerCase() === sanitizedCorrectWord.toLowerCase()) {
      // Haptic feedback for correct word
      hapticEvents.wordCorrect();

      saveWord(correctWord);

      // Save this word completion to database
      saveWordCompletion(wordIndex, correctWord);

      // Award points for correct word (+1 point)
      const wordKey = `${currentSentenceIndex}-${wordIndex}`;
      if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
        updatePoints(1, `Correct word: ${correctWord}`, input);
        setWordPointsProcessed(prev => ({
          ...prev,
          [currentSentenceIndex]: {
            ...(prev[currentSentenceIndex] || {}),
            [wordIndex]: 'correct'
          }
        }));
      }

      const wordSpan = document.createElement("span");
      wordSpan.className = "correct-word";
      wordSpan.innerText = correctWord;
      wordSpan.onclick = function () {
        saveWord(correctWord);
      };

      // Set programmatic scroll flag before DOM manipulation to prevent manual scroll sync
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        isProgrammaticScrollRef.current = true;
      }

      input.parentNode.replaceWith(wordSpan);

      // Check if sentence is now completed
      checkSentenceCompletion();

      // Clear programmatic scroll flag after DOM updates settle
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 300);
      }

      // Only auto-focus next input when word is actually completed by typing
      // Not when just clicking on input
      // Skip auto-focus on mobile to prevent unwanted slide jumping
      const isMobileView = window.innerWidth <= 768;
      if (!isMobileView) {
        setTimeout(() => {
          const nextInput = findNextInput(input);
          if (nextInput) {
            nextInput.focus();
          }
        }, 100);
      }
    } else {
      updateInputBackground(input, sanitizedCorrectWord);

      // Deduct points for incorrect attempt (-0.5 points, only once per word)
      if (sanitizedInputValue.length === sanitizedCorrectWord.length) {
        if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
          // Haptic feedback for incorrect word
          hapticEvents.wordIncorrect();

          updatePoints(-0.5, `Incorrect word attempt: ${sanitizedInputValue}`, input);
          setWordPointsProcessed(prev => ({
            ...prev,
            [currentSentenceIndex]: {
              ...(prev[currentSentenceIndex] || {}),
              [wordIndex]: 'incorrect'
            }
          }));

          // Reset consecutive sentence counter when user makes a mistake
          setConsecutiveSentences(0);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveWord, updateInputBackground, checkSentenceCompletion, saveWordCompletion, currentSentenceIndex, wordPointsProcessed, updatePoints]);

  // seededRandom is now imported from lib/dictationUtils.js

  // maskTextByPercentage is now imported from lib/dictationUtils.js

  // Handle input focus - keep placeholder visible and scroll into view
  const handleInputFocus = useCallback((input, correctWord) => {
    const isMobileView = window.innerWidth <= 768;

    // On mobile: blur immediately to prevent keyboard, show popup instead
    if (isMobileView) {
      input.blur();
      return;
    }

    // Desktop: Keep placeholder showing the masked word length
    if (input.value === '') {
      input.placeholder = '*'.repeat(correctWord.length);
      // Reset background color when empty
      input.style.removeProperty('background');
      input.style.removeProperty('border-color');
    }

    // Scroll input into view when focused (desktop only)
    input.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  }, []);

  // Handle input blur - show placeholder if empty
  const handleInputBlur = useCallback((input, correctWord) => {
    if (input.value === '') {
      input.placeholder = '*'.repeat(correctWord.length);
    }
  }, []);

  // generateLocalSuggestions is now provided by useSuggestionPopup hook

  // Show word suggestion popup when clicking on hint word box (full-sentence mode)
  const showHintWordSuggestion = useCallback((sentenceIndex, wordIndex, correctWord, event) => {
    // Haptic feedback
    hapticEvents.buttonPress();

    // Use currentTarget to ensure we get the clicked element, not a child
    const rect = event.currentTarget.getBoundingClientRect();
    const isMobileView = window.innerWidth <= 768;

    // Popup size - horizontal layout with 3 buttons (height ~50px)
    const popupWidth = isMobileView ? 240 : 280;
    const popupHeight = 50;
    const gap = isMobileView ? 4 : 8; // Smaller gap on mobile for closer positioning

    // Calculate word center position
    const wordCenterX = rect.left + (rect.width / 2);

    // Center popup horizontally on the word
    let left = wordCenterX - (popupWidth / 2);

    let top;
    if (isMobileView) {
      // Mobile: Always show popup directly below the clicked element (more natural)
      top = rect.bottom + gap;
    } else {
      // Desktop: Position popup above the word
      top = rect.top - popupHeight - gap;
      // If not enough space above, show below
      if (top < 10) {
        top = rect.bottom + gap;
      }
    }

    // Keep within horizontal screen bounds
    if (left < 10) {
      left = 10;
    }
    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }

    // Final bounds check for top
    if (top < 10) top = 10;
    if (top + popupHeight > window.innerHeight - 10) {
      top = window.innerHeight - popupHeight - 10;
    }

    // Generate 3 word options from transcript data
    const localOptions = generateLocalSuggestions(correctWord);

    // Store sentence index for later use when handling correct/wrong answers
    setSuggestionWord(correctWord);
    setSuggestionWordIndex(wordIndex);
    setSuggestionContext(transcriptData[sentenceIndex]?.text || '');
    setSuggestionPosition({ top, left });
    setSuggestionOptions(localOptions);

    // Store current sentence index for the popup handler
    setCurrentSentenceIndex(sentenceIndex);

    setShowSuggestionPopup(true);
  }, [transcriptData, generateLocalSuggestions]);

  // Show hint for a word - now opens suggestion popup instead of revealing directly
  const showHint = useCallback((button, correctWord, wordIndex) => {
    // Haptic feedback for hint button
    hapticEvents.wordHintUsed();

    // If user is not logged in, reveal the word directly
    if (!user) {
      const container = button.parentElement;
      const input = container.querySelector('.word-input');

      if (input) {
        // Save this word completion to database
        saveWordCompletion(wordIndex, correctWord);

        // Award points for correct word (+1 point) and show animation
        if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
          updatePoints(1, `Correct word from hint: ${correctWord}`, button);
          setWordPointsProcessed(prev => ({
            ...prev,
            [currentSentenceIndex]: {
              ...(prev[currentSentenceIndex] || {}),
              [wordIndex]: 'correct'
            }
          }));
        }

        // Replace input with correct word
        const wordSpan = document.createElement("span");
        wordSpan.className = "correct-word hint-revealed";
        wordSpan.innerText = correctWord;
        wordSpan.onclick = function () {
          if (window.saveWord) window.saveWord(correctWord);
        };

        // Find the punctuation span
        const punctuation = container.querySelector('.word-punctuation');

        // Set programmatic scroll flag before DOM manipulation to prevent manual scroll sync
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          isProgrammaticScrollRef.current = true;
        }

        // Clear container and rebuild
        container.innerHTML = '';
        container.appendChild(wordSpan);
        if (punctuation) {
          container.appendChild(punctuation);
        }

        // Save the word
        saveWord(correctWord);

        // Check if sentence is completed
        checkSentenceCompletion();

        // Clear programmatic scroll flag after DOM updates settle
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          setTimeout(() => {
            isProgrammaticScrollRef.current = false;
          }, 300);
        }
      }
      return;
    }

    // For logged-in users, show suggestion popup
    // Get current sentence context
    const context = transcriptData[currentSentenceIndex]?.text || '';

    // Calculate popup position relative to the hint button
    const rect = button.getBoundingClientRect();
    const isMobileView = window.innerWidth <= 768;

    let top, left;

    // Popup size - horizontal layout with 3 buttons (height ~50px)
    const popupWidth = isMobileView ? 240 : 280;
    const popupHeight = 50;
    const gap = isMobileView ? 4 : 8; // Smaller gap on mobile for closer positioning

    // Calculate word center position
    const wordCenterX = rect.left + (rect.width / 2);

    // Center popup horizontally on the word
    left = wordCenterX - (popupWidth / 2);

    if (isMobileView) {
      // Mobile: Always show popup directly below the clicked element (more natural)
      top = rect.bottom + gap;
    } else {
      // Desktop: Position popup above the word
      top = rect.top - popupHeight - gap;
      // If not enough space above, show below
      if (top < 10) {
        top = rect.bottom + gap;
      }
    }

    // Keep within horizontal screen bounds
    if (left < 10) {
      left = 10;
    }
    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }

    // Final bounds check
    if (top < 10) top = 10;
    if (top + popupHeight > window.innerHeight - 10) {
      top = window.innerHeight - popupHeight - 10;
    }

    // Generate options from transcript data (instant, no API call)
    const localOptions = generateLocalSuggestions(correctWord);

    // Set state for popup
    setSuggestionWord(correctWord);
    setSuggestionWordIndex(wordIndex);
    setSuggestionContext(context);
    setSuggestionPosition({ top, left });
    setSuggestionOptions(localOptions);
    setShowSuggestionPopup(true);
  }, [transcriptData, currentSentenceIndex, user, saveWord, saveWordCompletion, checkSentenceCompletion, wordPointsProcessed, updatePoints, generateLocalSuggestions]);

  // Show hint from input element (for desktop click on input)
  const showHintFromInput = useCallback((input, correctWord, wordIndex) => {
    // Haptic feedback
    hapticEvents.wordHintUsed();

    // If user is not logged in, reveal the word directly
    if (!user) {
      const container = input.parentElement;

      // Save this word completion to database
      saveWordCompletion(wordIndex, correctWord);

      // Award points for correct word (+1 point) and show animation
      if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
        updatePoints(1, `Correct word from hint: ${correctWord}`, input);
        setWordPointsProcessed(prev => ({
          ...prev,
          [currentSentenceIndex]: {
            ...(prev[currentSentenceIndex] || {}),
            [wordIndex]: 'correct'
          }
        }));
      }

      // Replace input with correct word
      const wordSpan = document.createElement("span");
      wordSpan.className = "correct-word hint-revealed";
      wordSpan.innerText = correctWord;
      wordSpan.onclick = function () {
        if (window.saveWord) window.saveWord(correctWord);
      };

      // Find the punctuation span
      const punctuation = container.querySelector('.word-punctuation');

      // Clear container and rebuild
      container.innerHTML = '';
      container.appendChild(wordSpan);
      if (punctuation) {
        container.appendChild(punctuation);
      }

      // Save the word
      saveWord(correctWord);

      // Check if sentence is completed
      checkSentenceCompletion();
      return;
    }

    // For logged-in users, show suggestion popup
    const context = transcriptData[currentSentenceIndex]?.text || '';
    const rect = input.getBoundingClientRect();
    const isMobileView = window.innerWidth <= 768;

    // Popup size - horizontal layout with 3 buttons (height ~50px for both)
    const popupWidth = isMobileView ? 240 : 280;
    const popupHeight = 50;
    const gap = isMobileView ? 4 : 8; // Smaller gap on mobile for closer positioning

    // Calculate word center position
    const wordCenterX = rect.left + (rect.width / 2);

    // Center popup horizontally on the word
    let left = wordCenterX - (popupWidth / 2);

    let top;
    if (isMobileView) {
      // Mobile: Always show popup directly below the clicked element (more natural)
      top = rect.bottom + gap;
    } else {
      // Desktop: Position popup above the word
      top = rect.top - popupHeight - gap;
      // If not enough space above, show below
      if (top < 10) {
        top = rect.bottom + gap;
      }
    }

    // Keep within horizontal screen bounds
    if (left < 10) {
      left = 10;
    }
    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }

    // Final bounds check
    if (top < 10) top = 10;
    if (top + popupHeight > window.innerHeight - 10) {
      top = window.innerHeight - popupHeight - 10;
    }

    // Generate options from transcript data (instant, no API call)
    const localOptions = generateLocalSuggestions(correctWord);

    setSuggestionWord(correctWord);
    setSuggestionWordIndex(wordIndex);
    setSuggestionContext(context);
    setSuggestionPosition({ top, left });
    setSuggestionOptions(localOptions);
    setShowSuggestionPopup(true);
  }, [transcriptData, currentSentenceIndex, user, saveWord, saveWordCompletion, checkSentenceCompletion, wordPointsProcessed, updatePoints, generateLocalSuggestions]);

  // Handle correct answer from suggestion popup
  const handleCorrectSuggestion = useCallback((correctWord, wordIndex) => {
    // Find the input with this word index (for traditional dictation mode)
    const input = document.querySelector(`input[data-correct-word="${correctWord}"][id="word-${wordIndex}"]`) ||
      document.querySelector(`input#word-${wordIndex}`);

    if (input) {
      // Traditional mode with input elements
      const container = input.parentElement;

      // Save this word completion to database
      saveWordCompletion(wordIndex, correctWord);

      // Award points for correct word (+1 point) and show animation
      if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
        updatePoints(1, `Correct word from hint: ${correctWord}`, input);
        setWordPointsProcessed(prev => ({
          ...prev,
          [currentSentenceIndex]: {
            ...(prev[currentSentenceIndex] || {}),
            [wordIndex]: 'correct'
          }
        }));
      }

      // Replace input with correct word
      const wordSpan = document.createElement("span");
      wordSpan.className = "correct-word hint-revealed";
      wordSpan.innerText = correctWord;
      wordSpan.onclick = function () {
        if (window.saveWord) window.saveWord(correctWord);
      };

      // Find the punctuation span
      const punctuation = container.querySelector('.word-punctuation');

      // Set programmatic scroll flag before DOM manipulation to prevent manual scroll sync
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        isProgrammaticScrollRef.current = true;
      }

      // Clear container and rebuild
      container.innerHTML = '';
      container.appendChild(wordSpan);
      if (punctuation) {
        container.appendChild(punctuation);
      }

      // Save the word
      saveWord(correctWord);

      // Check if sentence is completed
      checkSentenceCompletion();

      // Clear programmatic scroll flag after DOM updates settle
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 300);
      }
    } else {
      // Full-sentence mode - reveal the word and award points
      const newRevealedWords = {
        ...(revealedHintWords[currentSentenceIndex] || {}),
        [wordIndex]: true
      };

      setRevealedHintWords(prev => ({
        ...prev,
        [currentSentenceIndex]: newRevealedWords
      }));

      // Save revealed word to DB immediately
      const updatedRevealedHintWords = {
        ...revealedHintWords,
        [currentSentenceIndex]: newRevealedWords
      };
      saveProgress(completedSentences, completedWords, updatedRevealedHintWords);

      // Award points for correct word selection (+1 point)
      if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
        // Find the word box element for animation
        const wordBoxes = document.querySelectorAll(`[data-sentence-index="${currentSentenceIndex}"] .hintWordBox, [data-sentence-index="${currentSentenceIndex}"] [class*="hintWordBox"]`);
        const wordBox = wordBoxes[wordIndex] || null;
        updatePoints(1, `Correct word from popup: ${correctWord}`, wordBox);
        setWordPointsProcessed(prev => ({
          ...prev,
          [currentSentenceIndex]: {
            ...(prev[currentSentenceIndex] || {}),
            [wordIndex]: 'correct'
          }
        }));
      }

      // Check if ALL words in sentence are now revealed → mark as completed
      const sentence = transcriptData[currentSentenceIndex];
      if (sentence) {
        const words = sentence.text.split(/\s+/);
        const validWordIndices = [];
        words.forEach((word, idx) => {
          const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
          if (pureWord.length >= 1) {
            validWordIndices.push(idx);
          }
        });

        // Count revealed words (including the one just revealed)
        const revealedCount = Object.keys(newRevealedWords).filter(k => newRevealedWords[k]).length;
        const totalWordsToReveal = validWordIndices.length; // 100% hide = all words

        if (revealedCount >= totalWordsToReveal && !completedSentences.includes(currentSentenceIndex)) {
          // Haptic feedback for success
          hapticEvents.wordCorrect();

          // Mark sentence as completed
          const updatedCompleted = [...completedSentences, currentSentenceIndex];
          setCompletedSentences(updatedCompleted);

          // Update completedWords for progress tracking
          const updatedCompletedWords = { ...completedWords };
          updatedCompletedWords[currentSentenceIndex] = {};
          words.forEach((word, idx) => {
            const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
            if (pureWord.length >= 1) {
              updatedCompletedWords[currentSentenceIndex][idx] = pureWord;
            }
          });
          setCompletedWords(updatedCompletedWords);

          // Save progress to database
          saveProgress(updatedCompleted, updatedCompletedWords);

          // Check if all sentences completed
          if (updatedCompleted.length === transcriptData.length) {
            hapticEvents.lessonComplete();
            toast.success(t('lesson.completion.allCompleted'));
          }
        }
      }
    }

    // Close popup
    setShowSuggestionPopup(false);
  }, [saveWord, checkSentenceCompletion, saveWordCompletion, wordPointsProcessed, currentSentenceIndex, updatePoints, revealedHintWords, transcriptData, completedSentences, completedWords, saveProgress, t]);

  // Handle wrong answer from suggestion popup
  const handleWrongSuggestion = useCallback((correctWord, wordIndex, selectedWord) => {
    // DON'T close popup - let user try again
    // The popup will reset to normal state after shake animation (2s)

    // Show points animation for wrong suggestion
    const wrongButton = document.querySelector('.optionButton.wrongShake') ||
      document.querySelector('.optionButtonMobile.wrongShake');
    if (wrongButton) {
      showPointsAnimation(-0.5, wrongButton);
    }

    // Update points
    updatePoints(-0.5, `Wrong suggestion selected: ${selectedWord}, correct: ${correctWord}`);

    // Reset consecutive sentence counter when wrong word is selected
    setConsecutiveSentences(0);
  }, [showPointsAnimation, updatePoints]);

  // renderCompletedSentenceWithWordBoxes is now imported from lib/dictationUtils.js

  /**
   * ============================================================================
   * DYNAMIC HTML GENERATION FOR DICTATION
   * ============================================================================
   *
   * This function generates HTML dynamically with GLOBAL CSS classes.
   *
   * WHY GLOBAL CLASSES:
   * -------------------
   * - We use innerHTML to create interactive word elements at runtime
   * - CSS Modules would require dynamic class name generation (complex)
   * - Global classes are simpler and work well when properly scoped
   *
   * GLOBAL CLASSES GENERATED:
   * -------------------------
   * - .word-container    → Wrapper for each word + input/button
   * - .hint-btn          → Button to reveal the word
   * - .word-input        → Input field for typing
   * - .correct-word      → Display for correctly typed word
   * - .completed-word    → Word from a completed sentence
   * - .word-punctuation  → Punctuation marks
   *
   * SCOPING MECHANISM:
   * ------------------
   * These classes are styled in dictationPage.module.css using:
   *   .dictationInputArea :global(.word-input) { }
   *
   * This means they ONLY work inside .dictationInputArea and won't
   * affect other components/pages.
   *
   * CSS MODULES PATTERN:
   * --------------------
   * ✅ Container uses CSS Modules: className={styles.dictationInputArea}
   * ⚠️ Children use global classes: class="word-input"
   * ✅ Global classes are scoped by parent CSS Module class
   *
   * This is a VALID and DOCUMENTED approach when working with dynamic HTML.
   * See: dictationPage.module.css (line 977) for detailed documentation.
   * ============================================================================
   */
  const processLevelUp = useCallback((sentence, isCompleted, sentenceWordsCompleted, hidePercent) => {
    const sentences = sentence.split(/\n+/);

    const processedSentences = sentences.map((sentence) => {
      const words = sentence.split(/\s+/);

      // Determine which words to hide based on hidePercentage
      const validWordIndices = [];
      words.forEach((word, idx) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          validWordIndices.push(idx);
        }
      });

      // Calculate how many words to hide
      const totalValidWords = validWordIndices.length;
      const wordsToHideCount = Math.ceil((totalValidWords * hidePercent) / 100);

      // Deterministically select words to hide based on sentence index and word position
      const hiddenWordIndices = new Set();
      if (hidePercent < 100) {
        // Use seeded random to make it consistent for the same sentence
        // Seed is based on currentSentenceIndex to ensure same words are hidden on each render
        const shuffled = [...validWordIndices].sort((a, b) => {
          const seedA = seededRandom(currentSentenceIndex * 1000 + a);
          const seedB = seededRandom(currentSentenceIndex * 1000 + b);
          return seedA - seedB;
        });
        for (let i = 0; i < wordsToHideCount; i++) {
          hiddenWordIndices.add(shuffled[i]);
        }
      } else {
        // Hide all words (100%)
        validWordIndices.forEach(idx => hiddenWordIndices.add(idx));
      }

      const processedWords = words.map((word, wordIndex) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          const nonAlphaNumeric = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");

          // Check if this specific word is completed
          const isWordCompleted = sentenceWordsCompleted && sentenceWordsCompleted[wordIndex];

          // If entire sentence is completed, show all words
          if (isCompleted) {
            return `<span class="word-container completed">
              <span class="correct-word completed-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }

          // If this specific word is completed, show it
          if (isWordCompleted) {
            return `<span class="word-container">
              <span class="correct-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }

          // Check if this word should be hidden based on hidePercentage
          const shouldHide = hiddenWordIndices.has(wordIndex);

          if (shouldHide) {
            // Show input only (hint button removed - click on input shows hint popup)
            const dynamicSize = Math.max(Math.min(pureWord.length, 20), 3);

            return `<span class="word-container">
               <input
                 type="text"
                 class="word-input"
                 id="word-${wordIndex}"
                 name="word-${wordIndex}"
                 data-word-id="word-${wordIndex}"
                 data-word-length="${pureWord.length}"
                 data-correct-word="${pureWord}"
                 oninput="window.checkWord?.(this, '${pureWord}', ${wordIndex})"
                 onclick="window.handleInputClick?.(this, '${pureWord}', ${wordIndex})"
                 onkeydown="window.disableArrowKeys?.(event)"
                 onfocus="window.handleInputFocus?.(this, '${pureWord}')"
                 onblur="window.handleInputBlur?.(this, '${pureWord}')"
                 maxlength="${pureWord.length}"
                 size="${dynamicSize}"
                 placeholder="${'*'.repeat(pureWord.length)}"
                 autocomplete="off"
                 style="width: ${dynamicSize}ch;"
               />
             <span class="word-punctuation">${nonAlphaNumeric}</span>
           </span>`;
          } else {
            // Show the word (not hidden)
            return `<span class="word-container">
              <span class="correct-word revealed-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }
        }
        return `<span>${word}</span>`;
      });

      return processedWords.join(" ");
    });

    return processedSentences.join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceIndex]);

  // Initialize dictation for current sentence
  useEffect(() => {
    // Render dictation content if transcript is loaded (even if progress is still loading)
    if (transcriptData.length > 0 && transcriptData[currentSentenceIndex]) {
      const text = transcriptData[currentSentenceIndex].text;
      const isCompleted = progressLoaded && completedSentences.includes(currentSentenceIndex);
      const sentenceWordsCompleted = progressLoaded ? (completedWords[currentSentenceIndex] || {}) : {};

      // Prevent infinite loop: only render if sentence or completion status changed
      if (
        lastRenderedStateRef.current.sentenceIndex === currentSentenceIndex &&
        lastRenderedStateRef.current.isCompleted === isCompleted &&
        progressLoaded
      ) {
        return;
      }

      const processed = processLevelUp(text, isCompleted, sentenceWordsCompleted, hidePercentage);
      setProcessedText(processed);

      // Mark this state as rendered
      lastRenderedStateRef.current = { sentenceIndex: currentSentenceIndex, isCompleted };

      // Detect sentence length and add appropriate class + set word-length CSS variables
      setTimeout(() => {
        // NOTE: Using class selector here instead of ref because this element
        // is rendered via dangerouslySetInnerHTML. The class is from CSS Modules
        // (styles.dictationInputArea) but we query it as a plain class.
        const dictationArea = document.querySelector('.dictationInputArea');
        if (dictationArea) {
          const wordCount = text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1).length;

          // Remove old classes
          dictationArea.classList.remove('short-sentence', 'medium-sentence', 'long-sentence', 'very-long-sentence');

          // Add new class based on word count
          if (wordCount <= 8) {
            dictationArea.classList.add('short-sentence');
          } else if (wordCount <= 15) {
            dictationArea.classList.add('medium-sentence');
          } else if (wordCount <= 25) {
            dictationArea.classList.add('long-sentence');
          } else {
            dictationArea.classList.add('very-long-sentence');
          }

          // Set word-length CSS variable for each input based on actual word length
          const inputs = dictationArea.querySelectorAll('.word-input');
          inputs.forEach(input => {
            const wordLength = input.getAttribute('data-word-length');
            if (wordLength) {
              input.style.setProperty('--word-length', wordLength);
            }
          });
        }
      }, 100);

      // Expose functions to window object for dynamic HTML event handlers
      // NOTE: These functions are called from dynamically generated HTML (innerHTML)
      // via onclick, oninput, etc. Since the HTML is created as strings, we can't
      // use React event handlers directly. This is a valid pattern for this use case.
      if (typeof window !== 'undefined') {
        window.checkWord = checkWord;
        window.handleInputClick = handleInputClick;
        window.handleInputFocus = handleInputFocus;
        window.handleInputBlur = handleInputBlur;
        window.saveWord = saveWord;
        window.showHint = showHint;
        window.showHintFromInput = showHintFromInput;
        window.handleWordClickForPopup = handleWordClickForPopup;
        window.showPointsAnimation = showPointsAnimation;
        window.disableArrowKeys = (e) => {
          // Prevent all arrow keys and space from being typed in input fields
          if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
            e.preventDefault();
          }
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSentenceIndex, transcriptData, processLevelUp, checkWord, handleInputClick, handleInputFocus, handleInputBlur, saveWord, showHint, showHintFromInput, handleWordClickForPopup, completedSentences, progressLoaded, showPointsAnimation]);
  // Note: Removed 'completedWords' from dependencies to prevent infinite loop
  // Individual word completions are handled via direct DOM manipulation (input → span)

  const handleBackToHome = () => navigateWithLocale(router, '/');

  // Calculate accurate progress based on words completed (not just sentences)
  const progressPercentage = useMemo(() => {
    if (!transcriptData || transcriptData.length === 0) return 0;

    let totalWords = 0;
    let completedWordsCount = 0;

    transcriptData.forEach((segment, sentenceIndex) => {
      const words = segment.text.split(/\s+/);
      const validWords = words.filter(word => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        return pureWord.length >= 1;
      });

      totalWords += validWords.length;

      // Count completed words for this sentence
      const sentenceWordsCompleted = completedWords[sentenceIndex] || {};
      const completedCount = Object.keys(sentenceWordsCompleted).filter(
        wordIdx => sentenceWordsCompleted[wordIdx]
      ).length;

      completedWordsCount += completedCount;
    });

    return totalWords > 0 ? Math.round((completedWordsCount / totalWords) * 100) : 0;
  }, [transcriptData, completedWords]);

  // Set initial sentence to first incomplete sentence when progress is loaded
  // Works on both desktop and mobile - uses isProgrammaticScrollRef to prevent mobile scroll conflicts
  useEffect(() => {
    if (progressLoaded && sortedTranscriptIndices.length > 0 && !hasJumpedToIncomplete.current && transcriptData.length > 0) {
      // Find the first INCOMPLETE sentence (not completed)
      let firstIncompleteSentence = 0;
      for (let i = 0; i < transcriptData.length; i++) {
        if (!completedSentences.includes(i)) {
          firstIncompleteSentence = i;
          break;
        }
      }

      // On mobile: set flag to prevent scroll handler from overriding our jump
      const isMobileView = typeof window !== 'undefined' && window.innerWidth <= 768;
      if (isMobileView) {
        isProgrammaticScrollRef.current = true;
      }

      setCurrentSentenceIndex(firstIncompleteSentence);

      // Also seek video to that sentence's start time
      const targetSentence = transcriptData[firstIncompleteSentence];
      if (targetSentence) {
        // Seek to the sentence without auto-playing
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

      // On mobile: clear flag after scroll animation completes
      if (isMobileView) {
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 1000); // 1 second to ensure slide scroll animation is complete
      }
    }
  }, [progressLoaded, sortedTranscriptIndices, completedSentences, transcriptData, isYouTube]);

  if (loading) {
    return <ShadowingSkeleton isMobile={isMobile} />;
  }

  if (!lesson) {
    return (
      <div className={styles.centeredState}>
        <div style={{ textAlign: 'center' }}>
          <h1>❌ Lektion nicht gefunden</h1>
          <p style={{ marginTop: '20px' }}>Lektion mit ID <strong>{lessonId}</strong> existiert nicht.</p>
          <button
            onClick={handleBackToHome}
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

  // Generate structured data for this lesson
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
    { name: lesson.displayTitle || lesson.title, url: `/${lessonId}` }
  ]);

  const structuredDataArray = videoData
    ? [videoData, breadcrumbData]
    : [breadcrumbData];

  const sentenceListClassNames = {
    item: styles.sentenceItem,
    itemActive: styles.sentenceItemActive,
    itemPlaying: styles.sentenceItemPlaying,
    number: styles.sentenceNumber,
    content: styles.sentenceContent,
    text: styles.sentenceText,
    time: styles.sentenceTime,
    actions: styles.sentenceActions,
    actionButton: styles.sentenceActionButton
  };

  const footerClassNames = {
    wrapper: styles.footerControls,
    button: styles.footerButton,
    icon: styles.footerIcon,
    label: styles.footerLabel
  };

  return (
    <div className={styles.page}>
      <SEO
        title={`${lesson.displayTitle || lesson.title} - Diktat Übung | PapaGeil`}
        description={`Verbessere dein Deutsch mit Diktat: "${lesson.title}". ✓ Level ${lesson.difficulty || 'A1-C2'} ✓ Hörverstehen trainieren ✓ Rechtschreibung üben ✓ Mit sofortigem Feedback`}
        keywords={`Diktat ${lesson.title}, Deutsch Diktat üben, ${lesson.difficulty || 'A1-C2'} Deutsch, Hörverstehen Deutsch, Rechtschreibung Deutsch, PapaGeil Diktat, German dictation practice, Deutsch schreiben lernen`}
        ogType="video.other"
        ogImage={lesson.thumbnail || '/og-image.jpg'}
        canonicalUrl={`/${lessonId}`}
        locale="de_DE"
        author="PapaGeil"
        publishedTime={lesson.createdAt}
        modifiedTime={lesson.updatedAt || lesson.createdAt}
        structuredData={structuredDataArray}
      />

      {/* Hide footer and header on mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .header,
          footer {
            display: none !important;
          }
        }
      `}</style>

      <div className={styles.pageContainer}>
        {/* Desktop Top Bar - SHADOWING */}
        {!isMobile && (
          <DictationHeader
            isMobile={false}
            learningMode="shadowing"
            studyTime={studyTime}
            formatStudyTime={formatStudyTime}
          />
        )}

        {/* Main 3-Column Layout */}
        <div className={styles.mainContent}>
          {/* Left Column - Video */}
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
            isMobile={isMobile}
            onVideoClick={handlePlayPause}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onReplayFromStart={handleReplayFromStart}
            onPrevSentence={goToPreviousSentence}
            onNextSentence={goToNextSentence}
            playbackSpeed={playbackSpeed}
            onSpeedChange={handleSpeedChange}
            currentSentence={transcriptData[currentSentenceIndex]}
            onVoiceRecordingComplete={(result) => {
              console.log('Voice recording result:', result);
            }}
            onComparisonResultChange={setVoiceRecordingResult}
            youtubePlayerRef={youtubePlayerRef}
            showRecordButton={true}
          />

          {/* Middle Column - Dictation Area (Mobile Only) */}
          {isMobile && (
            <div className={styles.middleSection}>
              {/* Dictation Header - Using Component */}
              <DictationHeader
                isMobile={isMobile}
                currentSentenceIndex={currentSentenceIndex}
                totalSentences={transcriptData.length}
                completedCount={completedSentences.length}
                playbackSpeed={playbackSpeed}
                onSpeedChange={handleSpeedChange}
                showTranslation={showTranslation}
                onToggleTranslation={() => setShowTranslation(!showTranslation)}
                autoStop={autoStop}
                onAutoStopChange={setAutoStop}
                learningMode={learningMode}
                onToggleLearningMode={null}
                lessonId={lessonId}
                savedVocabularyCount={savedVocabulary.length}
                onShowVocabulary={() => setShowMobileVocabulary(true)}
              />

              <div className={styles.dictationContainer}>
                {/* Mobile: Content changes based on learning mode */}
                {transcriptData.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    <div>
                      <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                      <div>Loading dictation...</div>
                    </div>
                  </div>
                ) : isMobile ? (
                  /* Mobile: Shadowing Mode - Transcript list */
                  <div className={styles.mobileTranscriptList} ref={mobileShadowingListRef}>
                    {transcriptData.map((segment, originalIndex) => {
                      const isCompleted = completedSentences.includes(originalIndex);
                      const isActive = originalIndex === currentSentenceIndex;

                      return (
                        <div
                          key={originalIndex}
                          data-sentence-index={originalIndex}
                          className={`${styles.mobileTranscriptItem} ${isActive ? styles.mobileTranscriptItemActive : ''} ${isCompleted ? styles.mobileTranscriptItemCompleted : ''}`}
                          onClick={(e) => {
                            // Chỉ phát câu nếu click vào vùng trống (không phải từ)
                            if (!e.target.closest(`.${styles.clickableWord}`)) {
                              handleSentenceClick(segment.start, segment.end);
                            }
                          }}
                        >
                          <div
                            className={styles.mobileTranscriptNumber}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSentenceClick(segment.start, segment.end);
                            }}
                          >
                            {isCompleted ? '✓' : '▶'}
                          </div>
                          <div className={styles.mobileTranscriptContent}>
                            <div className={styles.mobileTranscriptText}>
                              {segment.text.split(/\s+/).map((word, idx) => {
                                const isSpoken = isActive && isPlaying && idx < activeWordIndex;
                                const isCurrent = isActive && isPlaying && idx === activeWordIndex;
                                const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");

                                // Voice recording color highlighting
                                const wordComparison = isActive && voiceRecordingResult ? voiceRecordingResult.wordComparison || {} : {};
                                const comparisonStatus = wordComparison[idx];
                                let wordColor = '';
                                if (comparisonStatus === 'correct') {
                                  wordColor = '#10b981'; // Green
                                } else if (comparisonStatus === 'incorrect') {
                                  wordColor = '#ef4444'; // Red
                                } else if (comparisonStatus === 'missing') {
                                  wordColor = '#f59e0b'; // Orange
                                }

                                return (
                                  <span
                                    key={idx}
                                    className={`${styles.clickableWord} ${isSpoken ? styles.karaokeWordSpoken : ''} ${isCurrent ? styles.karaokeWordCurrent : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (pureWord.length > 0) {
                                        handleWordClickForPopup(pureWord, e);
                                      }
                                    }}
                                    style={{
                                      color: wordColor || undefined,
                                      fontWeight: wordColor ? '600' : undefined
                                    }}
                                  >
                                    {word}{idx < segment.text.split(/\s+/).length - 1 ? ' ' : ''}
                                  </span>
                                );
                              })}
                              {/* Voice Recording Badge */}
                              {isActive && voiceRecordingResult && (
                                <span className={`${styles.voiceResultBadge} ${voiceRecordingResult.isCorrect ? styles.voiceResultBadgeCorrect : styles.voiceResultBadgeIncorrect}`}>
                                  {voiceRecordingResult.isCorrect ? '✅' : '❌'} {voiceRecordingResult.similarity}%
                                </span>
                              )}
                            </div>
                            {showTranslation && segment.translation && (
                              <div className={styles.mobileTranscriptTranslation}>
                                {segment.translation}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Right Column - Transcript List (Desktop only, Using Component) */}
          <TranscriptPanel
            transcriptData={transcriptData}
            currentSentenceIndex={currentSentenceIndex}
            completedSentences={completedSentences}
            completedWords={completedWords}
            checkedSentences={checkedSentences}
            revealedHintWords={revealedHintWords}
            hidePercentage={hidePercentage}
            dictationMode={dictationMode}
            studyTime={studyTime}
            onSentenceClick={handleSentenceClick}
            maskTextByPercentage={maskTextByPercentage}
            learningMode={learningMode}
            showOnMobile={false}
            currentTime={currentTime}
            isPlaying={isPlaying}
            vocabulary={lessonVocabulary}
            isLoadingVocabulary={isLoadingVocabulary}
            onWordClickForPopup={handleWordClickForPopup}
            savedVocabulary={savedVocabulary}
            onDeleteVocabulary={handleDeleteVocabulary}
            lessonId={lessonId}
            showTranslation={showTranslation}
            onToggleTranslation={() => setShowTranslation(!showTranslation)}
            voiceRecordingResult={voiceRecordingResult}
          />
        </div>
      </div>

      {/* Mobile Bottom Controls - Using Component */}
      {isMobile && (
        <MobileBottomControls
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onPrevious={goToPreviousSentence}
          onNext={goToNextSentence}
          canGoPrevious={sortedTranscriptIndices.indexOf(currentSentenceIndex) !== 0}
          canGoNext={sortedTranscriptIndices.indexOf(currentSentenceIndex) < sortedTranscriptIndices.length - 1}
          currentSentence={transcriptData[currentSentenceIndex]}
          onVoiceRecordingComplete={(result) => setVoiceRecordingResult(result)}
          showRecordButton={true}
          audioRef={audioRef}
          youtubePlayerRef={youtubePlayerRef}
          isYouTube={isYouTube}
        />
      )}

      {/* Mobile Vocabulary Popup */}
      {showMobileVocabulary && isMobile && (
        <div
          className={styles.mobileVocabularyOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMobileVocabulary(false);
            }
          }}
        >
          <div className={styles.mobileVocabularyPopup}>
            <div className={styles.mobileVocabularyHeader}>
              <h3>📚 Từ vựng đã lưu</h3>
              <button
                className={styles.mobileVocabularyClose}
                onClick={() => setShowMobileVocabulary(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.mobileVocabularyContent}>
              {savedVocabulary.length === 0 ? (
                <div className={styles.mobileVocabularyEmpty}>
                  Chưa có từ vựng nào được lưu cho bài này.
                  <br />
                  <small>Click vào từ trong bài rồi ấn ⭐ Lưu để thêm từ vựng.</small>
                </div>
              ) : (
                savedVocabulary.map((vocab) => (
                  <div key={vocab._id} className={styles.mobileVocabularyItem}>
                    <div className={styles.mobileVocabularyWord}>
                      <span
                        className={styles.mobileVocabularyWordText}
                        onClick={() => speakText(vocab.word)}
                      >
                        🔊 {vocab.word}
                      </span>
                      <button
                        className={styles.mobileVocabularyDeleteBtn}
                        onClick={() => handleDeleteVocabulary(vocab._id)}
                      >
                        ×
                      </button>
                    </div>
                    <div className={styles.mobileVocabularyTranslation}>{vocab.translation}</div>
                    {vocab.context && (
                      <div className={styles.mobileVocabularyContext}>
                        📝 {vocab.context}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tooltip */}
      {showTooltip && (
        <WordTooltip
          translation={tooltipTranslation}
          position={tooltipPosition}
          onClose={() => {
            setShowTooltip(false);
            setTooltipTranslation('');
          }}
        />
      )}

      {/* Dictionary Popup (Desktop & Mobile) */}
      {showVocabPopup && (
        <DictionaryPopup
          word={selectedWord}
          position={popupPosition}
          arrowPosition={popupArrowPosition}
          lessonId={lessonId}
          context={transcriptData[currentSentenceIndex]?.text || ''}
          sentenceTranslation={transcriptData[currentSentenceIndex]?.translation || ''}
          transcriptData={transcriptData}
          onClose={() => {
            setShowVocabPopup(false);
            setClickedWordElement(null);
          }}
          onSaveSuccess={fetchSavedVocabulary}
        />
      )}

      {/* Word Suggestion Popup */}
      {showSuggestionPopup && (
        <WordSuggestionPopup
          correctWord={suggestionWord}
          context={suggestionContext}
          wordIndex={suggestionWordIndex}
          position={suggestionPosition}
          initialOptions={suggestionOptions}
          onCorrectAnswer={handleCorrectSuggestion}
          onWrongAnswer={handleWrongSuggestion}
          onClose={() => setShowSuggestionPopup(false)}
        />
      )}

      {/* Points animations */}
      {pointsAnimations.map(animation => (
        <PointsAnimation
          key={animation.id}
          points={animation.points}
          startPosition={animation.startPosition}
          endPosition={animation.endPosition}
          onComplete={() => { }}
        />
      ))}

      {/* Locked Lesson Overlay */}
      {lesson?.isLocked && (
        <LockedLessonOverlay lesson={lesson} />
      )}

    </div>
  );
};

const DictationPage = () => {
  return <DictationPageContent />;
};

export default DictationPage;