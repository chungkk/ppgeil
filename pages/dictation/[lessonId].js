import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import DictionaryPopup from '../../components/DictionaryPopup';
import ProgressIndicator from '../../components/ProgressIndicator';

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
  const [results, setResults] = useState({}); // { sentenceIndex: { similarity, isCorrect, showAnswer } }
  const [completedSentences, setCompletedSentences] = useState([]);
  const [completedWords, setCompletedWords] = useState({});
  const [checkedSentences, setCheckedSentences] = useState([]);
  const [revealedHintWords, setRevealedHintWords] = useState({});
  const [comparedWords, setComparedWords] = useState({}); // { sentenceIndex: { wordIndex: { isCorrect, userWord, correctWord } } }
  const [revealedWordsByClick, setRevealedWordsByClick] = useState({}); // { sentenceIndex: { wordIndex: true } } - words revealed by double-click

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
  const { user } = useAuth();

  // Study timer
  const { studyTime } = useStudyTimer({
    isPlaying,
    user,
    lessonId,
    loadedStudyTime,
    mode: 'dictation'
  });

  // Refs
  const youtubePlayerRef = useRef(null);
  const audioRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  const inputRefs = useRef({});

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

  // Auto-update current sentence based on time
  useEffect(() => {
    if (isUserSeeking) return; // Skip auto-update during user seek
    if (!transcriptData.length) return;

    const currentIndex = transcriptData.findIndex(
      (item) => currentTime >= item.start && currentTime < item.end
    );

    if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(currentIndex);
    }
  }, [currentTime, transcriptData, currentSentenceIndex, isUserSeeking]);

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

  // Handle input change with realtime word comparison
  const handleInputChange = useCallback((index, value) => {
    setUserInputs(prev => ({ ...prev, [index]: value }));

    // Realtime: compare words as user types
    const correctText = transcriptData[index]?.text || '';
    if (value.trim() && correctText) {
      const wordComparison = compareWords(value, correctText);
      setComparedWords(prev => ({
        ...prev,
        [index]: wordComparison
      }));
    } else {
      // Clear comparison if input is empty
      setComparedWords(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  }, [transcriptData, compareWords]);

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
    if (!checkedSentences.includes(index)) {
      setCheckedSentences(prev => [...prev, index]);
    }

    if (isCorrect && !completedSentences.includes(index)) {
      hapticEvents.wordCorrect();
      setCompletedSentences(prev => [...prev, index]);
    } else if (!isCorrect) {
      hapticEvents.wordIncorrect();
    }
  }, [userInputs, transcriptData, completedSentences, checkedSentences, compareWords]);

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

    // Mark this word as revealed
    setRevealedWordsByClick(prev => ({
      ...prev,
      [sentenceIndex]: {
        ...(prev[sentenceIndex] || {}),
        [wordIndex]: true
      }
    }));
  }, []);

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

  // Global keyboard shortcut: Space to play/pause (when not typing in input)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle Space key
      if (e.code !== 'Space') return;

      // Check if user is typing in an input or textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      // If typing, let Space work normally
      if (isTyping) return;

      // Prevent default scroll behavior
      e.preventDefault();

      // Toggle play/pause
      handlePlayPause();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause]);



  if (loading) {
    return <DictationSkeleton />;
  }

  if (!lesson) {
    return (
      <div className={styles.page}>
        <div className={styles.centeredState}>
          <p>Không tìm thấy bài học</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`Dictation: ${lesson.title}`}
        description={`Luyện nghe chép chính tả với bài: ${lesson.title}`}
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
                  if (currentSentenceIndex < transcriptData.length - 1) {
                    playSentence(currentSentenceIndex + 1);
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
                        if (currentSentenceIndex < transcriptData.length - 1) {
                          playSentence(currentSentenceIndex + 1);
                        }
                      }}
                    >
                      ⏭
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.dictationArea}>
                <div className={styles.dictationHeader}>
                  <h3 className={styles.columnTitle}>Nghe và chép lại</h3>
                  <span className={styles.sentenceCounter}>
                    Câu {currentSentenceIndex + 1} / {transcriptData.length}
                  </span>
                </div>

                {/* Hidden sentence display */}
                <div className={styles.hiddenSentenceBox}>
                  {transcriptData[currentSentenceIndex] && (
                    results[currentSentenceIndex]?.showAnswer ? (
                      // Full answer revealed
                      <div className={styles.revealedSentence}>
                        {transcriptData[currentSentenceIndex].text.split(' ').map((word, i) => (
                          <span
                            key={i}
                            className={styles.revealedWord}
                            onClick={(e) => handleWordClick(word, e)}
                          >
                            {word}{' '}
                          </span>
                        ))}
                      </div>
                    ) : comparedWords[currentSentenceIndex] ? (
                      // Realtime: show matched characters as user types
                      <div className={styles.partialRevealSentence}>
                        {transcriptData[currentSentenceIndex].text.split(' ').map((word, i) => {
                          const comparison = comparedWords[currentSentenceIndex][i];
                          const pureWord = word.replace(/[.,!?;:"""''„]/g, '');
                          const punctuation = word.match(/[.,!?;:"""''„]$/) ? word.slice(-1) : '';

                          if (comparison?.isCorrect) {
                            // Fully correct word - show in green
                            return (
                              <span
                                key={i}
                                className={styles.correctWord}
                                onClick={(e) => handleWordClick(word, e)}
                              >
                                {word}{' '}
                              </span>
                            );
                          } else if (comparison?.matchedChars > 0) {
                            // Partial match - show matched chars, hide rest
                            const revealedPart = pureWord.substring(0, comparison.matchedChars);
                            const hiddenPart = '_'.repeat(pureWord.length - comparison.matchedChars);
                            return (
                              <span key={i} className={styles.partialWord}>
                                <span className={styles.revealedChars}>{revealedPart}</span>
                                <span className={styles.maskedChars}>{hiddenPart}</span>
                                {punctuation}{' '}
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
                                  {word}{' '}
                                </span>
                              );
                            }
                            // Fully hidden - can double-click to reveal
                            return (
                              <span
                                key={i}
                                className={styles.maskedWordClickable}
                                onDoubleClick={(e) => handleMaskedWordDoubleClick(currentSentenceIndex, i, word, e)}
                                title="Double-click để xem từ"
                              >
                                {'_'.repeat(pureWord.length)}
                                {punctuation}{' '}
                              </span>
                            );
                          }
                        })}
                      </div>
                    ) : (
                      // Initial state: all words hidden - can double-click to reveal
                      <div className={styles.maskedSentence}>
                        {transcriptData[currentSentenceIndex].text.split(' ').map((word, i) => {
                          const pureWord = word.replace(/[.,!?;:"""''„]/g, '');
                          const punctuation = word.match(/[.,!?;:"""''„]$/) ? word.slice(-1) : '';
                          const isRevealedByClick = revealedWordsByClick[currentSentenceIndex]?.[i];

                          if (isRevealedByClick) {
                            return (
                              <span
                                key={i}
                                className={styles.revealedByClickWord}
                                onClick={(e) => handleWordClick(word, e)}
                              >
                                {word}{' '}
                              </span>
                            );
                          }

                          return (
                            <span
                              key={i}
                              className={styles.maskedWordClickable}
                              onDoubleClick={(e) => handleMaskedWordDoubleClick(currentSentenceIndex, i, word, e)}
                              title="Double-click để xem từ"
                            >
                              {'_'.repeat(pureWord.length)}
                              {punctuation}{' '}
                            </span>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>

                <div className={styles.inputSection}>
                  <div className={styles.textareaWrapper}>
                    <textarea
                      ref={(el) => inputRefs.current[currentSentenceIndex] = el}
                      className={styles.dictationInput}
                      value={userInputs[currentSentenceIndex] || ''}
                      onChange={(e) => handleInputChange(currentSentenceIndex, e.target.value)}
                      placeholder="Nghe và gõ lại câu bạn nghe được..."
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          checkAnswer(currentSentenceIndex);
                        }
                      }}
                    />

                    {/* Voice Recording Button - Inside textarea */}
                    <div className={styles.inputRecordingControls}>
                      <button
                        className={`${styles.inputRecordBtn} ${isRecording ? styles.recording : ''}`}
                        onClick={handleRecordingClick}
                        disabled={isProcessingAudio}
                        title={isRecording ? 'Dừng ghi âm' : 'Ghi âm giọng nói'}
                      >
                        {isProcessingAudio ? (
                          <svg className={styles.spinner} viewBox="0 0 24 24" width="20" height="20">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32">
                              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                            </circle>
                          </svg>
                        ) : isRecording ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                            <path d="M19 10v1a7 7 0 0 1-14 0v-1h2v1a5 5 0 0 0 10 0v-1h2z" />
                            <path d="M11 18h2v4h-2z" />
                            <path d="M8 22h8v2H8z" />
                          </svg>
                        )}
                      </button>

                      {/* Playback button - shown when recording exists */}
                      {recordedBlob && !isRecording && (
                        <button
                          className={`${styles.inputPlaybackBtn} ${isPlayingRecording ? styles.playing : ''}`}
                          onClick={playRecordedAudio}
                          title={isPlayingRecording ? 'Dừng phát' : 'Nghe lại'}
                        >
                          {isPlayingRecording ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.nextButton}
                      onClick={() => {
                        if (currentSentenceIndex > 0) {
                          playSentence(currentSentenceIndex - 1);
                        }
                      }}
                      disabled={currentSentenceIndex <= 0}
                    >
                      ← Câu trước
                    </button>
                    <button
                      className={styles.nextButton}
                      onClick={() => {
                        if (currentSentenceIndex < transcriptData.length - 1) {
                          playSentence(currentSentenceIndex + 1);
                        }
                      }}
                      disabled={currentSentenceIndex >= transcriptData.length - 1}
                    >
                      Câu sau →
                    </button>
                  </div>
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
      </div>

      {/* Dictionary Popup */}
      {showVocabPopup && (
        <DictionaryPopup
          word={selectedWord}
          position={popupPosition}
          onClose={() => setShowVocabPopup(false)}
        />
      )}
    </>
  );
};

export default DictationPage;
