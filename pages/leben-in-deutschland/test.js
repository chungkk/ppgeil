import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { generalQuestions, stateQuestions, bundeslaender, getImageUrl, testConfig } from '../../lib/data/lebenInDeutschland';
import SEO from '../../components/SEO';
import styles from '../../styles/LebenInDeutschland.module.css';

const TestPage = () => {
  const router = useRouter();
  const { state } = router.query;
  const { t } = useTranslation('common');
  const { user } = useAuth();
  
  const [testQuestions, setTestQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [testState, setTestState] = useState('ready'); // 'ready', 'running', 'finished'
  const [timeLeft, setTimeLeft] = useState(testConfig.timeLimit * 60);
  const [showResult, setShowResult] = useState(false);

  const generateTest = useCallback(() => {
    const shuffledGeneral = [...generalQuestions].sort(() => Math.random() - 0.5);
    const selectedGeneral = shuffledGeneral.slice(0, testConfig.generalQuestions);
    
    let selectedState = [];
    if (state && stateQuestions[state]) {
      const shuffledState = [...stateQuestions[state]].sort(() => Math.random() - 0.5);
      selectedState = shuffledState.slice(0, testConfig.stateQuestions).map(q => ({
        ...q,
        id: 300 + q.id,
        type: 'state'
      }));
    }
    
    const allQuestions = [
      ...selectedGeneral.map(q => ({ ...q, type: 'general' })),
      ...selectedState
    ].sort(() => Math.random() - 0.5);

    setTestQuestions(allQuestions);
  }, [state]);

  useEffect(() => {
    if (router.isReady) {
      generateTest();
    }
  }, [router.isReady, generateTest]);

  useEffect(() => {
    let timer;
    if (testState === 'running' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            finishTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testState, timeLeft]);

  const startTest = () => {
    setTestState('running');
    setTimeLeft(testConfig.timeLimit * 60);
    setAnswers({});
    setCurrentIndex(0);
  };

  const selectAnswer = (questionId, answerIndex) => {
    if (testState !== 'running') return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const goToQuestion = (index) => {
    setCurrentIndex(index);
  };

  const finishTest = async () => {
    setTestState('finished');
    setShowResult(true);

    if (user) {
      try {
        const token = localStorage.getItem('token');
        const score = calculateScore();
        await fetch('/api/user/lid-progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ score, totalQuestions: testQuestions.length })
        });
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
  };

  const calculateScore = () => {
    let correct = 0;
    testQuestions.forEach(q => {
      if (answers[q.id] === q.a) {
        correct++;
      }
    });
    return correct;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const score = calculateScore();
  const passed = score >= testConfig.passingScore;
  const selectedBundeslandInfo = bundeslaender.find(b => b.code === state);
  const currentQuestion = testQuestions[currentIndex];

  if (testState === 'ready') {
    return (
      <>
        <SEO title={`${t('lid.test')} - ${t('lid.title')}`} />
        <div className={styles.container}>
          <div className={styles.header}>
            <Link href="/leben-in-deutschland" className={styles.backLink}>
              ← {t('lid.back')}
            </Link>
            <h1 className={styles.title}>
              <span className={styles.flag}>✍️</span>
              {t('lid.testTitle')}
            </h1>
          </div>

          <div className={styles.content}>
            <div className={styles.testReadyCard}>
              <h2>{t('lid.ready')}</h2>
              
              <div className={styles.testInfo}>
                <div className={styles.testInfoItem}>
                  <span className={styles.testInfoIcon}>📝</span>
                  <span>{testConfig.totalQuestions} {t('lid.questionsCount')}</span>
                </div>
                <div className={styles.testInfoItem}>
                  <span className={styles.testInfoIcon}>⏱️</span>
                  <span>{testConfig.timeLimit} {t('lid.minutes')}</span>
                </div>
                <div className={styles.testInfoItem}>
                  <span className={styles.testInfoIcon}>✅</span>
                  <span>{t('lid.needCorrect')} {testConfig.passingScore}</span>
                </div>
              </div>

              {selectedBundeslandInfo && (
                <p className={styles.stateInfo}>
                  📍 {t('lid.withStateQuestions')} {selectedBundeslandInfo.name}
                </p>
              )}

              {!state && (
                <p className={styles.noStateWarning}>
                  ⚠️ {t('lid.noStateWarning')}
                </p>
              )}

              <button className={styles.startTestBtn} onClick={startTest}>
                {t('lid.startTest')}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (showResult) {
    return (
      <>
        <SEO title={`${t('lid.viewResult')} - ${t('lid.title')}`} />
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={`${styles.resultCard} ${passed ? styles.passed : styles.failed}`}>
              <div className={styles.resultIcon}>
                {passed ? '🎉' : '📚'}
              </div>
              <h2 className={styles.resultTitle}>
                {passed ? t('lid.passed') : t('lid.failed')}
              </h2>
              <div className={styles.resultScore}>
                <span className={styles.scoreValue}>{score}</span>
                <span className={styles.scoreDivider}>/</span>
                <span className={styles.scoreTotal}>{testQuestions.length}</span>
              </div>
              <p className={styles.resultText}>
                {passed 
                  ? `${t('lid.congratsPass')} ${score}/${testQuestions.length}.`
                  : t('lid.needMore', { score: testConfig.passingScore })
                }
              </p>

              <div className={styles.resultActions}>
                <button 
                  className={styles.reviewBtn}
                  onClick={() => setShowResult(false)}
                >
                  {t('lid.reviewAnswers')}
                </button>
                <button 
                  className={styles.retryBtn}
                  onClick={() => {
                    generateTest();
                    setTestState('ready');
                    setShowResult(false);
                    setAnswers({});
                  }}
                >
                  {t('lid.retryTest')}
                </button>
                <Link href="/leben-in-deutschland" className={styles.backBtn}>
                  {t('lid.back')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title={`${t('lid.testTitle')} - ${t('lid.title')}`} />
      <div className={styles.container}>
        <div className={styles.testHeader}>
          <div className={styles.testProgress}>
            <span>{t('lid.question')} {currentIndex + 1} / {testQuestions.length}</span>
          </div>
          {testState === 'running' && (
            <div className={`${styles.timer} ${timeLeft < 300 ? styles.timerWarning : ''}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          )}
        </div>

        <div className={styles.content}>
          {/* Question Navigator */}
          <div className={styles.questionNav}>
            {testQuestions.map((q, idx) => (
              <button
                key={q.id}
                className={`${styles.navDot} ${
                  idx === currentIndex ? styles.current : ''
                } ${
                  answers[q.id] !== undefined ? styles.answered : ''
                } ${
                  testState === 'finished' 
                    ? answers[q.id] === q.a 
                      ? styles.correct 
                      : styles.wrong
                    : ''
                }`}
                onClick={() => goToQuestion(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Current Question */}
          {currentQuestion && (
            <div className={styles.testQuestion}>
              <div className={styles.questionHeader}>
                <span className={styles.questionNumber}>
                  {t('lid.question')} {currentIndex + 1}
                  {currentQuestion.type === 'state' && (
                    <span className={styles.stateBadge}>{selectedBundeslandInfo?.name}</span>
                  )}
                </span>
              </div>
              
              <p className={styles.questionText}>{currentQuestion.q}</p>
              
              {currentQuestion.img && (
                <div className={styles.questionImage}>
                  <img src={getImageUrl(currentQuestion.img)} alt="Hình ảnh câu hỏi" />
                </div>
              )}

              <div className={styles.testOptions}>
                {currentQuestion.o.map((option, optIdx) => (
                  <button
                    key={optIdx}
                    className={`${styles.testOption} ${
                      answers[currentQuestion.id] === optIdx ? styles.selected : ''
                    } ${
                      testState === 'finished'
                        ? optIdx === currentQuestion.a
                          ? styles.correct
                          : answers[currentQuestion.id] === optIdx
                            ? styles.wrong
                            : ''
                        : ''
                    }`}
                    onClick={() => selectAnswer(currentQuestion.id, optIdx)}
                    disabled={testState === 'finished'}
                  >
                    <span className={styles.optionLetter}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className={styles.optionText}>{option}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className={styles.testNavigation}>
            <button
              className={styles.navBtn}
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              ← {t('lid.prev')}
            </button>
            
            {currentIndex < testQuestions.length - 1 ? (
              <button
                className={styles.navBtn}
                onClick={() => goToQuestion(currentIndex + 1)}
              >
                {t('lid.next')} →
              </button>
            ) : testState === 'running' ? (
              <button
                className={styles.finishBtn}
                onClick={finishTest}
              >
                {t('lid.submit')}
              </button>
            ) : (
              <button
                className={styles.finishBtn}
                onClick={() => setShowResult(true)}
              >
                {t('lid.viewResult')}
              </button>
            )}
          </div>

          {testState === 'running' && (
            <div className={styles.answeredCount}>
              {t('lid.answered')} {Object.keys(answers).length} / {testQuestions.length}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TestPage;
