import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '../../../components/SEO';
import { useLessonData } from '../../../lib/hooks/useLessonData';
import { useAuth } from '../../../context/AuthContext';
import { youtubeAPI } from '../../../lib/youtubeApi';
import styles from '../../../styles/practice.module.css';

const ListenPracticePage = () => {
  const router = useRouter();
  const { lessonId } = router.query;
  const { lesson, isLoading } = useLessonData(lessonId, 'dictation');
  const { user, loading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/dictation/${lessonId}?login=true`);
    }
  }, [user, authLoading, router, lessonId]);

  const [transcriptData, setTranscriptData] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [listenSentences, setListenSentences] = useState([]);
  const [listenAnswers, setListenAnswers] = useState({});
  const [listenResults, setListenResults] = useState({});
  const [listenChecked, setListenChecked] = useState(false);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  
  // YouTube player
  const [isYouTubeReady, setIsYouTubeReady] = useState(false);
  const youtubePlayerRef = useRef(null);
  const playEndTimeRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // Load transcript
  useEffect(() => {
    if (lesson?.json) {
      fetch(lesson.json)
        .then(res => res.json())
        .then(data => setTranscriptData(data))
        .catch(err => console.error('Error loading transcript:', err));
    }
  }, [lesson]);

  // Load vocabulary
  useEffect(() => {
    if (lesson?.json) {
      const vocabPath = lesson.json.replace('.json', '.vocab.json');
      fetch(vocabPath)
        .then(res => res.json())
        .then(data => setVocabulary(data.vocabulary || []))
        .catch(() => setVocabulary([]));
    }
  }, [lesson]);

  // Generate random sentences for listening
  useEffect(() => {
    if (transcriptData.length > 0 && vocabulary.length > 0 && listenSentences.length === 0) {
      const sentencesWithVocab = [];
      vocabulary.forEach(v => {
        if (v.sentences && v.sentences.length > 0) {
          v.sentences.forEach(idx => {
            if (transcriptData[idx] && !sentencesWithVocab.find(s => s.index === idx)) {
              sentencesWithVocab.push({ index: idx, ...transcriptData[idx] });
            }
          });
        }
      });
      const shuffled = sentencesWithVocab.sort(() => Math.random() - 0.5);
      setListenSentences(shuffled.slice(0, 5));
    }
  }, [transcriptData, vocabulary, listenSentences.length]);

  // Extract YouTube video ID
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Initialize YouTube player
  useEffect(() => {
    if (!lesson?.youtubeUrl) return;
    
    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (!videoId) return;

    youtubeAPI.waitForAPI().then(() => {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
      }
      
      youtubePlayerRef.current = new window.YT.Player('youtube-player-mini', {
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
        },
        events: {
          onReady: () => setIsYouTubeReady(true),
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PAUSED || 
                event.data === window.YT.PlayerState.ENDED) {
              setCurrentPlaying(null);
              if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
              }
            }
          }
        }
      });
    });

    return () => {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [lesson?.youtubeUrl]);

  // Play sentence from YouTube
  const playSentence = useCallback((sentence, idx) => {
    if (!sentence) return;
    
    const player = youtubePlayerRef.current;
    
    // If YouTube player available, use it
    if (player && player.seekTo && isYouTubeReady) {
      setCurrentPlaying(idx);
      
      player.seekTo(sentence.start, true);
      player.playVideo();
      playEndTimeRef.current = sentence.end;
      
      // Check to stop at end time
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      
      checkIntervalRef.current = setInterval(() => {
        if (player.getCurrentTime && player.getCurrentTime() >= playEndTimeRef.current - 0.1) {
          player.pauseVideo();
          setCurrentPlaying(null);
          clearInterval(checkIntervalRef.current);
        }
      }, 100);
    } else {
      // Fallback to TTS
      setCurrentPlaying(idx);
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(sentence.text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.85;
        utterance.onend = () => setCurrentPlaying(null);
        utterance.onerror = () => setCurrentPlaying(null);
        
        const voices = window.speechSynthesis.getVoices();
        const germanVoice = voices.find(v => v.lang.startsWith('de'));
        if (germanVoice) utterance.voice = germanVoice;
        
        window.speechSynthesis.speak(utterance);
      };
      
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = doSpeak;
      } else {
        doSpeak();
      }
    }
  }, [isYouTubeReady]);

  // Calculate similarity
  const calculateSimilarity = (input, correct) => {
    const normalize = (str) => str.toLowerCase().trim()
      .replace(/[.,!?;:"""''„]/g, '')
      .replace(/\s+/g, ' ');
    
    const inputWords = normalize(input).split(' ').filter(w => w);
    const correctWords = normalize(correct).split(' ').filter(w => w);
    
    let matches = 0;
    correctWords.forEach((word, idx) => {
      if (inputWords[idx] === word) matches++;
    });
    
    return Math.round((matches / correctWords.length) * 100);
  };

  // Check answers
  const checkAnswers = () => {
    const results = {};
    listenSentences.forEach((sentence, idx) => {
      const userAnswer = listenAnswers[idx] || '';
      const similarity = calculateSimilarity(userAnswer, sentence.text);
      results[idx] = {
        similarity,
        isCorrect: similarity >= 80,
        correctAnswer: sentence.text
      };
    });
    setListenResults(results);
    setListenChecked(true);
  };

  // Reset
  const resetExercise = () => {
    setListenAnswers({});
    setListenResults({});
    setListenChecked(false);
    const sentencesWithVocab = [];
    vocabulary.forEach(v => {
      if (v.sentences && v.sentences.length > 0) {
        v.sentences.forEach(idx => {
          if (transcriptData[idx] && !sentencesWithVocab.find(s => s.index === idx)) {
            sentencesWithVocab.push({ index: idx, ...transcriptData[idx] });
          }
        });
      }
    });
    const shuffled = sentencesWithVocab.sort(() => Math.random() - 0.5);
    setListenSentences(shuffled.slice(0, 5));
  };

  // Calculate score
  const getScore = () => {
    if (!listenChecked) return null;
    const correct = Object.values(listenResults).filter(r => r.isCorrect).length;
    return { correct, total: listenSentences.length };
  };

  if (isLoading || authLoading || !user) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  const score = getScore();

  return (
    <div className={styles.page}>
      <SEO 
        title={`Luyện nghe: ${lesson?.title || 'Bài học'}`}
        description="Luyện nghe tiếng Đức"
      />

      {/* Mini Video Player - Fixed position */}
      {lesson?.youtubeUrl && (
        <div className={styles.miniVideoContainer}>
          <div className={styles.miniVideoWrapper}>
            <div id="youtube-player-mini"></div>
          </div>
          {!isYouTubeReady && (
            <div className={styles.miniVideoLoading}>
              <div className={styles.spinner}></div>
            </div>
          )}
        </div>
      )}

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.practiceHeader}>
          <Link href={`/practice/${lessonId}`} className={styles.backLink}>
            ← Quay lại
          </Link>
          <div className={styles.practiceHeaderContent}>
            <span className={styles.practiceIcon}>🎧</span>
            <h1 className={styles.practiceTitle}>Luyện nghe</h1>
          </div>
          <p className={styles.practiceSubtitle}>{lesson?.title}</p>
        </div>

        {/* Score */}
        {score && (
          <div className={`${styles.scoreBox} ${score.correct === score.total ? styles.scoreBoxPerfect : ''}`}>
            <span className={styles.scoreIcon}>{score.correct === score.total ? '🎉' : '📊'}</span>
            <span className={styles.scoreText}>
              Kết quả: <strong>{score.correct}/{score.total}</strong> câu đúng
            </span>
          </div>
        )}

        {/* Instructions */}
        <div className={styles.instructions}>
          <p>🎯 Nghe từng câu và viết lại chính xác những gì bạn nghe được.</p>
        </div>

        {/* Exercises */}
        <div className={styles.exercises}>
          {listenSentences.map((sentence, idx) => (
            <div key={idx} className={`${styles.exerciseCard} ${
              listenChecked ? (listenResults[idx]?.isCorrect ? styles.exerciseCardCorrect : styles.exerciseCardIncorrect) : ''
            }`}>
              <div className={styles.exerciseHeader}>
                <span className={styles.exerciseNumber}>Câu {idx + 1}</span>
                <button 
                  className={`${styles.playBtn} ${currentPlaying === idx ? styles.playBtnActive : ''}`}
                  onClick={() => playSentence(sentence, idx)}
                  disabled={currentPlaying !== null && currentPlaying !== idx}
                >
                  {currentPlaying === idx ? '🔊 Đang phát...' : '🔊 Nghe'}
                </button>
              </div>
              
              <textarea
                className={styles.answerTextarea}
                placeholder="Viết lại câu bạn nghe được..."
                value={listenAnswers[idx] || ''}
                onChange={(e) => setListenAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                disabled={listenChecked}
                rows={2}
              />
              
              {listenChecked && (
                <div className={styles.resultBox}>
                  <div className={styles.resultHeader}>
                    <span className={listenResults[idx]?.isCorrect ? styles.resultCorrect : styles.resultIncorrect}>
                      {listenResults[idx]?.isCorrect ? '✓ Chính xác!' : `✗ ${listenResults[idx]?.similarity}% đúng`}
                    </span>
                  </div>
                  {!listenResults[idx]?.isCorrect && (
                    <div className={styles.correctAnswerBox}>
                      <span className={styles.correctAnswerLabel}>Đáp án:</span>
                      <p className={styles.correctAnswerText}>{listenResults[idx]?.correctAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actionButtons}>
          {!listenChecked ? (
            <button className={styles.primaryBtn} onClick={checkAnswers}>
              ✓ Kiểm tra kết quả
            </button>
          ) : (
            <>
              <button className={styles.secondaryBtn} onClick={resetExercise}>
                🔄 Làm lại
              </button>
              <Link href={`/practice/${lessonId}`} className={styles.primaryBtn}>
                Tiếp tục →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListenPracticePage;
