import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '../../../components/SEO';
import { useLessonData } from '../../../lib/hooks/useLessonData';
import { useAuth } from '../../../context/AuthContext';
import styles from '../../../styles/practice.module.css';

const ReadPracticePage = () => {
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
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isChecked, setIsChecked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

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

  // Generate quiz questions when transcript loaded
  useEffect(() => {
    if (transcriptData.length > 0 && questions.length === 0 && !isGenerating) {
      generateQuiz();
    }
  }, [transcriptData, vocabulary]);

  // Generate quiz using OpenAI
  const generateQuiz = async () => {
    if (transcriptData.length < 3) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const targetLang = user?.nativeLanguage || 'vi';
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: transcriptData, 
          vocabulary: vocabulary,
          targetLang 
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.questions?.length > 0) {
        setQuestions(data.questions);
      } else {
        setError('Không thể tạo câu hỏi. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Generate quiz error:', err);
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Select answer
  const selectAnswer = (questionIdx, optionIdx) => {
    if (isChecked) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIdx]: optionIdx }));
  };

  // Check answers
  const checkAnswers = () => {
    setIsChecked(true);
  };

  // Reset
  const resetExercise = () => {
    setSelectedAnswers({});
    setIsChecked(false);
    setQuestions([]);
    generateQuiz();
  };

  // Calculate score
  const getScore = () => {
    if (!isChecked) return null;
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) correct++;
    });
    return { correct, total: questions.length };
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
        title={`Luyện đọc: ${lesson?.title || 'Bài học'}`}
        description="Luyện đọc hiểu tiếng Đức"
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.practiceHeader}>
          <Link href={`/practice/${lessonId}`} className={styles.backLink}>
            ← Quay lại
          </Link>
          <div className={styles.practiceHeaderContent}>
            <span className={styles.practiceIcon}>📖</span>
            <h1 className={styles.practiceTitle}>Luyện đọc hiểu</h1>
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

        {/* Loading state */}
        {isGenerating && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>AI đang tạo câu hỏi...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className={styles.errorBox}>
            <p>{error}</p>
            <button className={styles.secondaryBtn} onClick={generateQuiz}>
              🔄 Thử lại
            </button>
          </div>
        )}

        {/* Instructions */}
        {questions.length > 0 && !isGenerating && (
          <div className={styles.instructions}>
            <p>🎯 Trả lời các câu hỏi trắc nghiệm về nội dung bài học.</p>
          </div>
        )}

        {/* Quiz Questions */}
        {questions.length > 0 && !isGenerating && (
          <div className={styles.exercises}>
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers[idx] !== undefined;
              const isCorrect = isChecked && selectedAnswers[idx] === q.correctIndex;
              const isWrong = isChecked && isAnswered && selectedAnswers[idx] !== q.correctIndex;
              
              return (
                <div key={idx} className={`${styles.exerciseCard} ${
                  isChecked ? (isCorrect ? styles.exerciseCardCorrect : isWrong ? styles.exerciseCardIncorrect : '') : ''
                }`}>
                  <div className={styles.exerciseHeader}>
                    <span className={styles.exerciseNumber}>Câu {idx + 1}</span>
                  </div>
                  
                  <p className={styles.quizQuestion}>{q.question}</p>
                  
                  <div className={styles.quizOptions}>
                    {q.options.map((option, optIdx) => {
                      const isSelected = selectedAnswers[idx] === optIdx;
                      const isCorrectOption = q.correctIndex === optIdx;
                      
                      let optionClass = styles.quizOption;
                      if (isSelected && !isChecked) {
                        optionClass += ` ${styles.quizOptionSelected}`;
                      }
                      if (isChecked) {
                        if (isCorrectOption) {
                          optionClass += ` ${styles.quizOptionCorrect}`;
                        } else if (isSelected && !isCorrectOption) {
                          optionClass += ` ${styles.quizOptionWrong}`;
                        }
                      }
                      
                      return (
                        <button
                          key={optIdx}
                          className={optionClass}
                          onClick={() => selectAnswer(idx, optIdx)}
                          disabled={isChecked}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Explanation after checking */}
                  {isChecked && q.explanation && (
                    <div className={styles.quizExplanation}>
                      <span className={styles.aiLabel}>💡 Giải thích:</span>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        {questions.length > 0 && !isGenerating && (
          <div className={styles.actionButtons}>
            {!isChecked ? (
              <button 
                className={styles.primaryBtn} 
                onClick={checkAnswers}
                disabled={Object.keys(selectedAnswers).length < questions.length}
              >
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
        )}
      </div>
    </div>
  );
};

export default ReadPracticePage;
