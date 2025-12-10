import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '../../../components/SEO';
import { useLessonData } from '../../../lib/hooks/useLessonData';
import { useAuth } from '../../../context/AuthContext';
import styles from '../../../styles/practice.module.css';

const WritePracticePage = () => {
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

  const [vocabulary, setVocabulary] = useState([]);
  const [writeVocab, setWriteVocab] = useState([]);
  const [writeAnswers, setWriteAnswers] = useState({});
  const [writeResults, setWriteResults] = useState({});
  const [writeChecked, setWriteChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

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

  // Generate vocabulary for writing
  useEffect(() => {
    if (vocabulary.length > 0 && writeVocab.length === 0) {
      const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
      setWriteVocab(shuffled.slice(0, 5));
    }
  }, [vocabulary, writeVocab.length]);

  // Get base word without article
  const getBaseWord = (word) => {
    return word.replace(/^(der|die|das)\s+/i, '').toLowerCase();
  };

  // Check answers with OpenAI
  const checkAnswers = async () => {
    setIsChecking(true);
    const results = {};
    const targetLang = user?.nativeLanguage || 'vi';
    
    // Process each sentence with OpenAI
    const checkPromises = writeVocab.map(async (vocab, idx) => {
      const userAnswer = writeAnswers[idx] || '';
      const baseWord = getBaseWord(vocab.word);
      
      // Basic validation first
      if (!userAnswer.trim()) {
        return { idx, result: { isCorrect: false, feedback: 'Bạn chưa viết gì!', aiChecked: false } };
      }
      
      const wordCount = userAnswer.trim().split(/\s+/).filter(w => w).length;
      if (wordCount < 3) {
        return { idx, result: { isCorrect: false, feedback: 'Câu quá ngắn!', aiChecked: false } };
      }
      
      // Check with OpenAI
      try {
        const response = await fetch('/api/check-sentence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence: userAnswer,
            vocabulary: vocab.word,
            targetLang
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          return {
            idx,
            result: {
              isCorrect: data.isCorrect && data.hasVocabulary && data.grammarScore >= 7,
              hasVocabulary: data.hasVocabulary,
              grammarScore: data.grammarScore,
              errors: data.errors || [],
              corrections: data.corrections,
              suggestion: data.suggestion,
              explanation: data.explanation,
              feedback: data.isCorrect ? 'Tốt lắm! 👏' : 'Cần cải thiện',
              aiChecked: true
            }
          };
        } else {
          // Fallback to basic check
          const hasWord = userAnswer.toLowerCase().includes(baseWord);
          return {
            idx,
            result: {
              isCorrect: hasWord && wordCount >= 4,
              feedback: hasWord ? 'Tốt lắm! 👏' : `Câu chưa chứa từ "${vocab.word}"!`,
              aiChecked: false
            }
          };
        }
      } catch (error) {
        console.error('AI check error:', error);
        // Fallback to basic check
        const hasWord = userAnswer.toLowerCase().includes(baseWord);
        return {
          idx,
          result: {
            isCorrect: hasWord && wordCount >= 4,
            feedback: hasWord ? 'Tốt lắm! 👏' : `Câu chưa chứa từ "${vocab.word}"!`,
            aiChecked: false
          }
        };
      }
    });
    
    const checkResults = await Promise.all(checkPromises);
    checkResults.forEach(({ idx, result }) => {
      results[idx] = result;
    });
    
    setWriteResults(results);
    setWriteChecked(true);
    setIsChecking(false);
  };

  // Reset
  const resetExercise = () => {
    setWriteAnswers({});
    setWriteResults({});
    setWriteChecked(false);
    const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
    setWriteVocab(shuffled.slice(0, 5));
  };

  // Calculate score
  const getScore = () => {
    if (!writeChecked) return null;
    const correct = Object.values(writeResults).filter(r => r.isCorrect).length;
    return { correct, total: writeVocab.length };
  };

  // Speak word
  const speakWord = useCallback((text) => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.8;
      
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
  }, []);

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
        title={`Luyện viết: ${lesson?.title || 'Bài học'}`}
        description="Luyện viết tiếng Đức"
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.practiceHeader}>
          <Link href={`/practice/${lessonId}`} className={styles.backLink}>
            ← Quay lại
          </Link>
          <div className={styles.practiceHeaderContent}>
            <span className={styles.practiceIcon}>✍️</span>
            <h1 className={styles.practiceTitle}>Luyện viết</h1>
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
          <p>🎯 Đặt câu tiếng Đức với mỗi từ vựng dưới đây. Câu cần có ít nhất 4 từ.</p>
        </div>

        {/* Exercises */}
        <div className={styles.exercises}>
          {writeVocab.map((vocab, idx) => (
            <div key={idx} className={`${styles.exerciseCard} ${
              writeChecked ? (writeResults[idx]?.isCorrect ? styles.exerciseCardCorrect : styles.exerciseCardIncorrect) : ''
            }`}>
              <div className={styles.exerciseHeader}>
                <span className={styles.exerciseNumber}>Từ {idx + 1}</span>
              </div>
              
              {/* Vocab Card */}
              <div className={styles.vocabDisplay}>
                <div className={styles.vocabMain}>
                  <button 
                    className={styles.speakWordBtn}
                    onClick={() => speakWord(vocab.word)}
                    title="Nghe phát âm"
                  >
                    🔊
                  </button>
                  <span className={styles.vocabWord}>{vocab.word}</span>
                  <span className={styles.vocabTranslation}>({vocab.translation})</span>
                </div>
                {vocab.partOfSpeech && (
                  <span className={styles.vocabPOS}>{vocab.partOfSpeech}</span>
                )}
                {vocab.note && (
                  <p className={styles.vocabNote}>{vocab.note}</p>
                )}
              </div>
              
              <textarea
                className={styles.answerTextarea}
                placeholder={`Đặt câu với "${getBaseWord(vocab.word)}"...`}
                value={writeAnswers[idx] || ''}
                onChange={(e) => setWriteAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                disabled={writeChecked}
                rows={2}
              />
              
              {writeChecked && writeResults[idx] && (
                <div className={styles.resultBox}>
                  {/* Score and basic feedback */}
                  <div className={styles.resultHeader}>
                    <span className={writeResults[idx]?.isCorrect ? styles.resultCorrect : styles.resultIncorrect}>
                      {writeResults[idx]?.isCorrect ? '✓ ' : '✗ '}
                      {writeResults[idx]?.aiChecked && writeResults[idx]?.grammarScore 
                        ? `Điểm ngữ pháp: ${writeResults[idx].grammarScore}/10` 
                        : writeResults[idx]?.feedback}
                    </span>
                  </div>
                  
                  {/* AI detailed feedback */}
                  {writeResults[idx]?.aiChecked && (
                    <div className={styles.aiFeedback}>
                      {/* Errors */}
                      {writeResults[idx]?.errors?.length > 0 && (
                        <div className={styles.aiErrorsBox}>
                          <span className={styles.aiLabel}>❌ Lỗi:</span>
                          <ul className={styles.aiErrorList}>
                            {writeResults[idx].errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Corrections - only show if different from original */}
                      {writeResults[idx]?.corrections && 
                       !writeResults[idx]?.isCorrect && 
                       writeResults[idx].corrections.toLowerCase().trim() !== (writeAnswers[idx] || '').toLowerCase().trim() && (
                        <div className={styles.aiCorrectionBox}>
                          <span className={styles.aiLabel}>✏️ Sửa lại:</span>
                          <p className={styles.aiCorrectionText}>{writeResults[idx].corrections}</p>
                        </div>
                      )}
                      
                      {/* Suggestion */}
                      {writeResults[idx]?.suggestion && (
                        <div className={styles.aiSuggestionBox}>
                          <span className={styles.aiLabel}>💡 Gợi ý câu hay hơn:</span>
                          <p className={styles.aiSuggestionText}>{writeResults[idx].suggestion}</p>
                        </div>
                      )}
                      
                      {/* Explanation */}
                      {writeResults[idx]?.explanation && (
                        <div className={styles.aiExplanationBox}>
                          <span className={styles.aiLabel}>📝 Giải thích:</span>
                          <p className={styles.aiExplanationText}>{writeResults[idx].explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className={styles.actionButtons}>
          {!writeChecked ? (
            <button 
              className={styles.primaryBtn} 
              onClick={checkAnswers}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <span className={styles.btnSpinner}></span>
                  AI đang kiểm tra...
                </>
              ) : (
                '✓ Kiểm tra kết quả'
              )}
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

export default WritePracticePage;
