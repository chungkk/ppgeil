import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '../../../components/SEO';
import { useLessonData } from '../../../lib/hooks/useLessonData';
import styles from '../../../styles/practice.module.css';

const ReadPracticePage = () => {
  const router = useRouter();
  const { lessonId } = router.query;
  const { lesson, isLoading } = useLessonData(lessonId, 'dictation');

  const [transcriptData, setTranscriptData] = useState([]);
  const [readQuestions, setReadQuestions] = useState([]);
  const [readAnswers, setReadAnswers] = useState({});
  const [readResults, setReadResults] = useState({});
  const [readChecked, setReadChecked] = useState(false);

  // Load transcript
  useEffect(() => {
    if (lesson?.json) {
      fetch(lesson.json)
        .then(res => res.json())
        .then(data => setTranscriptData(data))
        .catch(err => console.error('Error loading transcript:', err));
    }
  }, [lesson]);

  // Generate reading questions
  useEffect(() => {
    if (transcriptData.length > 0 && readQuestions.length === 0) {
      const questions = generateReadingQuestions(transcriptData);
      setReadQuestions(questions);
    }
  }, [transcriptData, readQuestions.length]);

  // Generate fill-in-the-blank questions
  const generateReadingQuestions = (data) => {
    if (data.length < 5) return [];
    
    const questions = [];
    const usedIndices = new Set();
    const targetCount = Math.min(8, Math.floor(data.length / 8) + 3);
    
    while (questions.length < targetCount && usedIndices.size < data.length) {
      const idx = Math.floor(Math.random() * data.length);
      if (usedIndices.has(idx)) continue;
      
      const sentence = data[idx];
      if (!sentence?.text) continue;
      
      const words = sentence.text.split(' ');
      if (words.length < 4) continue;
      
      usedIndices.add(idx);
      
      // Pick a word to blank out (not first or last, prefer longer words)
      const candidates = words.map((w, i) => ({ word: w, idx: i }))
        .filter((w, i) => i > 0 && i < words.length - 1 && w.word.length > 3);
      
      if (candidates.length === 0) continue;
      
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const blankIdx = picked.idx;
      const answer = words[blankIdx].replace(/[.,!?;:]/g, '');
      
      const questionWords = [...words];
      questionWords[blankIdx] = '_____';
      
      questions.push({
        id: idx,
        type: 'fill-blank',
        question: questionWords.join(' '),
        answer: answer,
        fullSentence: sentence.text,
        translation: sentence.translationVi || sentence.translation || ''
      });
    }
    
    return questions;
  };

  // Check answers
  const checkAnswers = () => {
    const results = {};
    readQuestions.forEach((q, idx) => {
      const userAnswer = (readAnswers[idx] || '').toLowerCase().trim();
      const correctAnswer = q.answer.toLowerCase().trim();
      results[idx] = {
        isCorrect: userAnswer === correctAnswer,
        correctAnswer: q.answer,
        fullSentence: q.fullSentence
      };
    });
    setReadResults(results);
    setReadChecked(true);
  };

  // Reset
  const resetExercise = () => {
    setReadAnswers({});
    setReadResults({});
    setReadChecked(false);
    setReadQuestions(generateReadingQuestions(transcriptData));
  };

  // Calculate score
  const getScore = () => {
    if (!readChecked) return null;
    const correct = Object.values(readResults).filter(r => r.isCorrect).length;
    return { correct, total: readQuestions.length };
  };

  if (isLoading) {
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
        title={`Luyện đọc: ${lesson?.title || 'Bài học'}`}
        description="Luyện đọc tiếng Đức"
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.practiceHeader}>
          <Link href={`/practice/${lessonId}`} className={styles.backLink}>
            ← Quay lại
          </Link>
          <div className={styles.practiceHeaderContent}>
            <span className={styles.practiceIcon}>📖</span>
            <h1 className={styles.practiceTitle}>Luyện đọc</h1>
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
          <p>🎯 Điền từ còn thiếu vào chỗ trống trong mỗi câu.</p>
        </div>

        {/* Exercises */}
        <div className={styles.exercises}>
          {readQuestions.map((q, idx) => (
            <div key={idx} className={`${styles.exerciseCard} ${
              readChecked ? (readResults[idx]?.isCorrect ? styles.exerciseCardCorrect : styles.exerciseCardIncorrect) : ''
            }`}>
              <div className={styles.exerciseHeader}>
                <span className={styles.exerciseNumber}>Câu {idx + 1}</span>
              </div>
              
              <p className={styles.questionText}>{q.question}</p>
              
              <div className={styles.inputRow}>
                <input
                  type="text"
                  className={styles.answerInput}
                  placeholder="Điền từ..."
                  value={readAnswers[idx] || ''}
                  onChange={(e) => setReadAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                  disabled={readChecked}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !readChecked) {
                      e.preventDefault();
                      const nextInput = document.querySelector(`input[data-idx="${idx + 1}"]`);
                      if (nextInput) nextInput.focus();
                    }
                  }}
                  data-idx={idx}
                />
              </div>
              
              {readChecked && (
                <div className={styles.resultBox}>
                  <div className={styles.resultHeader}>
                    <span className={readResults[idx]?.isCorrect ? styles.resultCorrect : styles.resultIncorrect}>
                      {readResults[idx]?.isCorrect ? '✓ Chính xác!' : '✗ Sai'}
                    </span>
                  </div>
                  {!readResults[idx]?.isCorrect && (
                    <div className={styles.correctAnswerBox}>
                      <span className={styles.correctAnswerLabel}>Đáp án:</span>
                      <p className={styles.correctAnswerText}><strong>{readResults[idx]?.correctAnswer}</strong></p>
                    </div>
                  )}
                  <div className={styles.fullSentenceBox}>
                    <span className={styles.fullSentenceLabel}>Câu đầy đủ:</span>
                    <p className={styles.fullSentenceText}>{q.fullSentence}</p>
                    {q.translation && (
                      <p className={styles.translationText}>→ {q.translation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actionButtons}>
          {!readChecked ? (
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

export default ReadPracticePage;
