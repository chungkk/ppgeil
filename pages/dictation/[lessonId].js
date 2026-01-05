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

          // Auto-stop at segment end
          if (segmentPlayEndTime !== null && time >= segmentPlayEndTime - 0.02) {
            player.pauseVideo?.();
            setIsPlaying(false);
            setSegmentPlayEndTime(null);
          }
        }
      } else {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          setCurrentTime(audio.currentTime);

          if (segmentPlayEndTime !== null && audio.currentTime >= segmentPlayEndTime - 0.02) {
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
  }, [isPlaying, segmentPlayEndTime, isYouTube]);

  // Auto-update current sentence based on time
  useEffect(() => {
    if (!transcriptData.length) return;

    const currentIndex = transcriptData.findIndex(
      (item) => currentTime >= item.start && currentTime < item.end
    );

    if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(currentIndex);
    }
  }, [currentTime, transcriptData, currentSentenceIndex]);

  // Play sentence
  const playSentence = useCallback((index) => {
    const sentence = transcriptData[index];
    if (!sentence) return;

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
  }, [transcriptData, isYouTube]);

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

  // Handle input change
  const handleInputChange = useCallback((index, value) => {
    setUserInputs(prev => ({ ...prev, [index]: value }));
  }, []);

  // Check answer
  const checkAnswer = useCallback((index) => {
    const userInput = userInputs[index] || '';
    const correctText = transcriptData[index]?.text || '';

    if (!userInput.trim()) return;

    const similarity = calculateSimilarity(userInput, correctText);
    const isCorrect = similarity >= 80;

    setResults(prev => ({
      ...prev,
      [index]: { similarity, isCorrect, showAnswer: true }
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
  }, [userInputs, transcriptData, completedSentences, checkedSentences]);

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

          <div className={styles.threeColumnLayout}>
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

            {/* Middle Column - Dictation Input */}
            <div className={styles.middleColumn}>
              <div className={styles.dictationArea}>
                <h3 className={styles.columnTitle}>Nghe và chép lại</h3>
                
                <div className={styles.inputSection}>
                  <textarea
                    ref={(el) => inputRefs.current[currentSentenceIndex] = el}
                    className={styles.dictationInput}
                    value={userInputs[currentSentenceIndex] || ''}
                    onChange={(e) => handleInputChange(currentSentenceIndex, e.target.value)}
                    placeholder="Nghe và gõ lại câu bạn nghe được..."
                    rows={4}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        checkAnswer(currentSentenceIndex);
                      }
                    }}
                  />

                  {/* Result Display */}
                  {results[currentSentenceIndex] && (
                    <div className={`${styles.resultBox} ${results[currentSentenceIndex].isCorrect ? styles.correct : styles.incorrect}`}>
                      <span className={styles.similarityScore}>
                        {results[currentSentenceIndex].similarity}% chính xác
                      </span>
                      {results[currentSentenceIndex].isCorrect ? (
                        <span className={styles.resultIcon}>✓</span>
                      ) : (
                        <span className={styles.resultIcon}>✗</span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.checkButton}
                      onClick={() => checkAnswer(currentSentenceIndex)}
                      disabled={!userInputs[currentSentenceIndex]?.trim()}
                    >
                      Kiểm tra
                    </button>
                    <button
                      className={styles.showAnswerButton}
                      onClick={() => showAnswer(currentSentenceIndex)}
                    >
                      Xem đáp án
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
                      Câu tiếp →
                    </button>
                  </div>
                </div>

                {/* Progress Indicator */}
                <div className={styles.progressSection}>
                  <ProgressIndicator
                    current={completedSentences.length}
                    total={transcriptData.length}
                    label="Hoàn thành"
                  />
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
