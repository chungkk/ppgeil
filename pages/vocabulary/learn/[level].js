import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { speakText, stopSpeech } from '../../../lib/textToSpeech';
import { 
  createNewCard, 
  calculateNextReview, 
  getAllNextReviewTexts,
  buildStudyQueue,
  CardState,
  Rating 
} from '../../../lib/srs';
import SEO from '../../../components/SEO';
import styles from '../../../styles/VocabLearn.module.css';

// Import vocabulary data
import goetheA1Vocabulary from '../../../lib/data/goetheA1Vocabulary';
import goetheA2Vocabulary from '../../../lib/data/goetheA2Vocabulary';
import goetheB1Vocabulary from '../../../lib/data/goetheB1Vocabulary';

const levelConfig = {
  a1: {
    id: 'A1',
    title: { en: 'A1 - Beginner', vi: 'A1 - Cơ bản' },
    data: goetheA1Vocabulary,
    color: '#22c55e',
    icon: '🌱'
  },
  a2: {
    id: 'A2',
    title: { en: 'A2 - Elementary', vi: 'A2 - Sơ cấp' },
    data: goetheA2Vocabulary,
    color: '#3b82f6',
    icon: '📚'
  },
  b1: {
    id: 'B1',
    title: { en: 'B1 - Intermediate', vi: 'B1 - Trung cấp' },
    data: goetheB1Vocabulary,
    color: '#8b5cf6',
    icon: '🎓'
  }
};

const VocabularyLearnPage = () => {
  const router = useRouter();
  const { level } = router.query;
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();

  const isEn = currentLanguage === 'en';
  
  // Use user's nativeLanguage setting for translations, fallback to currentLanguage
  const translationLang = user?.nativeLanguage || currentLanguage;
  const isTranslationEn = translationLang === 'en';
  
  const config = levelConfig[level?.toLowerCase()];

  // States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [studyQueue, setStudyQueue] = useState({ newCards: [], learningCards: [], reviewCards: [], counts: { new: 0, learning: 0, review: 0 } });
  const [srsCards, setSrsCards] = useState({});
  const [savedProgress, setSavedProgress] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Track results for this session - Anki style
  const [sessionResults, setSessionResults] = useState([]);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [studiedCounts, setStudiedCounts] = useState({ new: 0, review: 0 });
  
  // Next review times for current card
  const [nextReviewTimes, setNextReviewTimes] = useState({ again: '', hard: '', good: '', easy: '' });

  // Load saved progress
  useEffect(() => {
    if (user && level) {
      loadProgress();
    }
  }, [user, level]);

  const loadProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/user/srs-progress?level=' + level, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.deckStats) {
          setSavedProgress(data.deckStats);
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  // Save single card progress via API
  const saveCardProgress = useCallback(async (word, rating, cardData) => {
    if (!user || !level) return;

    try {
      setIsSaving(true);
      setSaveStatus('saving');
      
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/user/srs-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          level: level.toLowerCase(),
          word,
          rating,
          cardData
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
        
        // Update local SRS card data
        if (data.card) {
          setSrsCards(prev => ({
            ...prev,
            [word]: data.card
          }));
        }
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving card progress:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [user, level]);

  // Build study queue only once when config loads
  useEffect(() => {
    if (config?.data && level && studyQueue.newCards.length === 0 && studyQueue.reviewCards.length === 0) {
      // Create SRS cards for all vocabulary
      const allCards = config.data.map(wordData => {
        return { ...createNewCard(wordData.word), wordData };
      });

      // Build study queue (prioritizes due cards)
      const queue = buildStudyQueue(allCards, {
        newCardsLimit: 20,
        reviewsLimit: 100
      });

      setStudyQueue(queue);
      setCurrentIndex(0);
    }
  }, [config?.data, level, studyQueue.newCards.length, studyQueue.reviewCards.length]);

  // Get translation based on user's nativeLanguage setting
  const getTranslation = (item) => {
    if (!item) return '';
    return isTranslationEn ? (item.en || item.vi || '') : (item.vi || item.en || '');
  };

  // Speak word
  const handleSpeak = (e) => {
    e?.stopPropagation();
    if (!currentCard) return;
    
    setIsSpeaking(true);
    const textToSpeak = currentCard.article 
      ? `${currentCard.article} ${currentCard.word}`
      : currentCard.word;
    
    speakText(textToSpeak, 'de-DE', 0.8);
    
    // Reset speaking state after a delay
    setTimeout(() => setIsSpeaking(false), 1500);
  };

  // Get current card from queue
  const getAllQueueCards = () => {
    const { newCards, learningCards, reviewCards } = studyQueue;
    return [...learningCards, ...reviewCards, ...newCards];
  };
  
  const allQueueCards = getAllQueueCards();
  const currentCard = allQueueCards[currentIndex]?.wordData || allQueueCards[currentIndex];
  const currentSrsCard = allQueueCards[currentIndex];
  
  // Calculate progress
  const totalInSession = allQueueCards.length;
  const progress = totalInSession > 0 ? ((currentIndex + 1) / totalInSession) * 100 : 0;

  // Update next review times when card changes
  useEffect(() => {
    if (currentSrsCard) {
      const times = getAllNextReviewTexts(currentSrsCard, isEn ? 'en' : 'vi');
      setNextReviewTimes(times);
    }
  }, [currentSrsCard, isEn]);

  // Calculate remaining cards count
  const remainingCards = allQueueCards.length - currentIndex;
  const totalWords = config?.data?.length || 0;

  // Handle card click - flip only
  const handleCardClick = (e) => {
    if (!isFlipped) {
      setIsFlipped(true);
      setShowButtons(true);
    }
  };

  // Handle answer with Anki 4-button rating
  const handleAnswer = (rating) => {
    if (!currentCard || !currentSrsCard) return;

    // Calculate updated card
    const updatedCard = calculateNextReview(currentSrsCard, rating);
    
    // Record result
    const ratingName = rating === Rating.AGAIN ? 'again' : 
                       rating === Rating.HARD ? 'hard' : 
                       rating === Rating.GOOD ? 'good' : 'easy';
    
    const result = { word: currentCard.word, rating, ratingName };
    setSessionResults(prev => [...prev, result]);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      [ratingName]: prev[ratingName] + 1
    }));

    // Update studied counts
    const cardType = currentSrsCard.state === CardState.NEW ? 'new' : 'review';
    setStudiedCounts(prev => ({
      ...prev,
      [cardType]: prev[cardType] + 1
    }));

    // Save progress to API
    saveCardProgress(currentCard.word, rating, updatedCard);

    // Update local SRS card
    setSrsCards(prev => ({
      ...prev,
      [currentCard.word]: updatedCard
    }));

    nextCard();
  };

  // Next card
  const nextCard = () => {
    setIsFlipped(false);
    setShowButtons(false);
    stopSpeech();

    if (currentIndex < allQueueCards.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 200);
    } else {
      setIsComplete(true);
    }
  };

  // Restart - rebuild queue
  const handleRestart = () => {
    // Reset SRS cards to trigger queue rebuild
    setSrsCards({});
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowButtons(false);
    setIsComplete(false);
    setSessionResults([]);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setStudiedCounts({ new: 0, review: 0 });
    stopSpeech();
  };

  // Loading or invalid level
  if (!config) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          {isEn ? 'Loading...' : 'Đang tải...'}
        </div>
      </div>
    );
  }

  // Get card state badge
  const getCardStateBadge = () => {
    if (!currentSrsCard) return null;
    const state = currentSrsCard.state;
    const badgeClass = state === CardState.NEW ? styles.badgeNew :
                       state === CardState.LEARNING ? styles.badgeLearning :
                       state === CardState.REVIEW ? styles.badgeReview :
                       styles.badgeRelearning;
    const label = state === CardState.NEW ? (isEn ? 'NEW' : 'MỚI') :
                  state === CardState.LEARNING ? (isEn ? 'LEARNING' : 'ĐANG HỌC') :
                  state === CardState.REVIEW ? (isEn ? 'REVIEW' : 'ÔN TẬP') :
                  (isEn ? 'RELEARN' : 'HỌC LẠI');
    return { badgeClass, label };
  };

  return (
    <>
      <SEO
        title={`${config.title[currentLanguage] || config.title.en} - ${isEn ? 'Vocabulary' : 'Từ vựng'}`}
        description={isEn ? `Learn ${config.id} German vocabulary` : `Học từ vựng tiếng Đức ${config.id}`}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/vocabulary" className={styles.backLink}>
            ←
          </a>
          <div className={styles.levelBadge}>
            <span className={styles.levelIcon}>{config.icon}</span>
            <span className={styles.levelTitle} style={{ color: config.color }}>
              {config.id}
            </span>
          </div>
          <div className={styles.headerSpacer} />
          <div className={styles.progressText}>
            {currentIndex + 1} / {totalInSession}
          </div>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress}%`, background: config.color }}
          />
        </div>

        {/* Session Score - Anki style */}
        <div className={styles.scoreRow}>
          <span className={styles.scoreNew}>❌ {stats.again}</span>
          <span className={styles.scoreLearning}>😐 {stats.hard}</span>
          <span className={styles.scoreMastered}>✓ {stats.good}</span>
          <span style={{ color: '#a78bfa', fontWeight: 600 }}>⚡ {stats.easy}</span>
          {user && saveStatus && (
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '12px', 
              color: saveStatus === 'saved' ? '#22c55e' : saveStatus === 'error' ? '#ef4444' : '#f59e0b' 
            }}>
              {saveStatus === 'saving' ? '💾...' : saveStatus === 'saved' ? '✓' : '⚠'}
            </span>
          )}
        </div>

        {/* Main Content */}
        {!isComplete ? (
          <div className={styles.cardArea}>
            {currentCard && (
              <>
                {/* Flashcard */}
                <div 
                  className={`${styles.flashcard} ${isFlipped ? styles.flipped : ''}`}
                  onClick={handleCardClick}
                  style={{ '--card-color': config.color, maxWidth: '600px', width: '100%', height: '280px' }}
                >
                  <div className={styles.cardInner}>
                    {/* Front */}
                    <div className={styles.cardFront}>
                      {/* Card State Badge */}
                      {getCardStateBadge() && (
                        <span className={`${styles.cardStateBadge} ${getCardStateBadge().badgeClass}`}>
                          {getCardStateBadge().label}
                        </span>
                      )}
                      
                      {currentCard.article && (
                        <span className={styles.article}>{currentCard.article}</span>
                      )}
                      <span className={styles.word}>{currentCard.word}</span>
                      
                      {/* Speak button on front */}
                      <button 
                        className={`${styles.speakBtn} ${isSpeaking ? styles.speaking : ''}`}
                        onClick={handleSpeak}
                      >
                        🔊
                      </button>
                      
                      <span className={styles.hint}>
                        👆 {t('vocabPage.learn.tapToSee')}
                      </span>
                    </div>

                    {/* Back */}
                    <div className={styles.cardBack}>
                      <span className={styles.translation}>
                        {getTranslation(currentCard)}
                      </span>
                      <span className={styles.wordSmall}>
                        {currentCard.word}
                      </span>
                      
                      {/* Speak button on back */}
                      <button 
                        className={`${styles.speakBtnBack} ${isSpeaking ? styles.speaking : ''}`}
                        onClick={handleSpeak}
                      >
                        🔊 {t('vocabPage.learn.listen')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Answer Buttons - Anki 4 levels */}
                {showButtons && (
                  <div className={styles.answerRowAnki}>
                    <button 
                      className={`${styles.ankiBtn} ${styles.btnAgain}`}
                      onClick={() => handleAnswer(Rating.AGAIN)}
                    >
                      <span className={styles.ankiBtnTime}>{nextReviewTimes.again}</span>
                      <span className={styles.ankiBtnLabel}>{isEn ? 'Again' : 'Lại'}</span>
                    </button>
                    <button 
                      className={`${styles.ankiBtn} ${styles.btnHard}`}
                      onClick={() => handleAnswer(Rating.HARD)}
                    >
                      <span className={styles.ankiBtnTime}>{nextReviewTimes.hard}</span>
                      <span className={styles.ankiBtnLabel}>{isEn ? 'Hard' : 'Khó'}</span>
                    </button>
                    <button 
                      className={`${styles.ankiBtn} ${styles.btnGood}`}
                      onClick={() => handleAnswer(Rating.GOOD)}
                    >
                      <span className={styles.ankiBtnTime}>{nextReviewTimes.good}</span>
                      <span className={styles.ankiBtnLabel}>{isEn ? 'Good' : 'Tốt'}</span>
                    </button>
                    <button 
                      className={`${styles.ankiBtn} ${styles.btnEasy}`}
                      onClick={() => handleAnswer(Rating.EASY)}
                    >
                      <span className={styles.ankiBtnTime}>{nextReviewTimes.easy}</span>
                      <span className={styles.ankiBtnLabel}>{isEn ? 'Easy' : 'Dễ'}</span>
                    </button>
                  </div>
                )}

                {!showButtons && (
                  <p className={styles.tapText}>
                    {t('vocabPage.learn.tapCard')}
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          /* Complete Screen - Anki style */
          <div className={styles.completeArea}>
            <div className={styles.completeIcon}>🎉</div>
            <h2 className={styles.completeTitle}>
              {t('vocabPage.learn.topicComplete')}
            </h2>

            <div className={styles.statsRowAnki}>
              <div className={`${styles.statBoxAnki} ${styles.statBoxAgain}`}>
                <span className={styles.statNum}>{stats.again}</span>
                <span className={styles.statLabel}>{isEn ? 'Again' : 'Lại'}</span>
              </div>
              <div className={`${styles.statBoxAnki} ${styles.statBoxHard}`}>
                <span className={styles.statNum}>{stats.hard}</span>
                <span className={styles.statLabel}>{isEn ? 'Hard' : 'Khó'}</span>
              </div>
              <div className={`${styles.statBoxAnki} ${styles.statBoxGood}`}>
                <span className={styles.statNum}>{stats.good}</span>
                <span className={styles.statLabel}>{isEn ? 'Good' : 'Tốt'}</span>
              </div>
              <div className={`${styles.statBoxAnki} ${styles.statBoxEasy}`}>
                <span className={styles.statNum}>{stats.easy}</span>
                <span className={styles.statLabel}>{isEn ? 'Easy' : 'Dễ'}</span>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button className={styles.btnRestart} onClick={handleRestart}>
                🔄 {t('vocabPage.learn.practiceMore')}
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/vocabulary" className={styles.btnHome}>
                📚 {t('vocabPage.backToVocab')}
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VocabularyLearnPage;
