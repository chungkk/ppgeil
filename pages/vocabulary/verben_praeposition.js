import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { speakText, stopSpeech } from '../../lib/textToSpeech';
import { 
  createNewCard, 
  calculateNextReview, 
  getAllNextReviewTexts,
  CardState,
  Rating 
} from '../../lib/srs';
import SEO from '../../components/SEO';
import { getTopicById, topicIcons } from '../../lib/data/goetheTopicVocabulary';
import styles from '../../styles/VocabLearn.module.css';

const TOPIC_ID = 'verben_praeposition';

const VerbenPraepositionPage = () => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { currentLanguage } = useLanguage();
  const { user } = useAuth();
  
  const translationLang = user?.nativeLanguage || currentLanguage;
  const isTranslationEn = translationLang === 'en';

  const topic = getTopicById(TOPIC_ID);

  // States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [shuffledData, setShuffledData] = useState([]);
  const [srsCards, setSrsCards] = useState({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [nextReviewTimes, setNextReviewTimes] = useState({ again: '', hard: '', good: '', easy: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const isEn = currentLanguage === 'en';

  // Get auth token for API calls
  const getAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }, []);

  // Save card progress to database
  const saveCardProgress = useCallback(async (word, rating, cardData) => {
    const token = getAuthToken();
    if (!token || !user) return;

    try {
      setIsSaving(true);
      setSaveStatus('saving');

      const response = await fetch('/api/user/srs-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topic: TOPIC_ID,
          word,
          rating,
          cardData
        })
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [getAuthToken, user]);

  // Initialize shuffled data
  useEffect(() => {
    if (topic?.words) {
      const shuffled = [...topic.words].sort(() => Math.random() - 0.5);
      setShuffledData(shuffled);
    }
  }, [topic]);

  const getTranslation = (item) => {
    if (!item) return '';
    if (isTranslationEn) return item.en || item.vi || '';
    return item.vi || item.en || '';
  };

  const getTopicName = () => {
    if (!topic) return '';
    if (currentLanguage === 'de') return topic.name;
    if (currentLanguage === 'en') return topic.name_en || topic.name;
    return topic.name_vi || topic.name;
  };

  const parseWord = (wordStr) => {
    const match = wordStr.match(/^(der|die|das)\s+(.+)$/i);
    if (match) {
      return { article: match[1], word: match[2] };
    }
    return { article: null, word: wordStr };
  };

  const handleSpeak = (e) => {
    e?.stopPropagation();
    if (!currentCard) return;
    
    setIsSpeaking(true);
    speakText(currentCard.word, 'de-DE', 0.8);
    setTimeout(() => setIsSpeaking(false), 1500);
  };

  const currentCard = shuffledData[currentIndex];
  const parsed = currentCard ? parseWord(currentCard.word) : { article: null, word: '' };
  const progress = shuffledData.length > 0 ? ((currentIndex + 1) / shuffledData.length) * 100 : 0;

  const currentSrsCard = currentCard ? (srsCards[currentCard.word] || createNewCard(currentCard.word)) : null;

  useEffect(() => {
    if (currentSrsCard) {
      const times = getAllNextReviewTexts(currentSrsCard, isEn ? 'en' : 'vi');
      setNextReviewTimes(times);
    }
  }, [currentSrsCard, isEn]);

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

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      setShowButtons(true);
    }
  };

  const handleAnswer = (rating) => {
    if (!currentCard || !currentSrsCard) return;

    const updatedCard = calculateNextReview(currentSrsCard, rating);
    
    const ratingName = rating === Rating.AGAIN ? 'again' : 
                       rating === Rating.HARD ? 'hard' : 
                       rating === Rating.GOOD ? 'good' : 'easy';
    setStats(prev => ({ ...prev, [ratingName]: prev[ratingName] + 1 }));

    setSrsCards(prev => ({
      ...prev,
      [currentCard.word]: updatedCard
    }));

    saveCardProgress(currentCard.word, rating, updatedCard);
    nextCard();
  };

  const nextCard = () => {
    setIsFlipped(false);
    setShowButtons(false);
    stopSpeech();

    if (currentIndex < shuffledData.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    } else {
      setIsComplete(true);
    }
  };

  const handleRestart = () => {
    const shuffled = [...topic.words].sort(() => Math.random() - 0.5);
    setShuffledData(shuffled);
    setSrsCards({});
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowButtons(false);
    setIsComplete(false);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    stopSpeech();
  };

  if (!topic) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          {t('vocabPage.learn.loading')}
        </div>
      </div>
    );
  }

  const topicIcon = topicIcons[TOPIC_ID] || '🔗';
  const topicColor = '#10b981';

  return (
    <>
      <SEO
        title={`${topic.name} - ${t('vocabPage.verbPrep.title')}`}
        description={t('vocabPage.verbPrep.desc')}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/vocabulary" className={styles.backLink}>
            ←
          </Link>
          <div className={styles.levelBadge}>
            <span className={styles.levelIcon}>{topicIcon}</span>
            <span className={styles.levelTitle} style={{ color: topicColor }}>
              {topic.name}
            </span>
          </div>
          <div className={styles.headerSpacer} />
          <div className={styles.progressText}>
            {currentIndex + 1} / {shuffledData.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress}%`, background: topicColor }}
          />
        </div>

        {/* Session Score */}
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
                  onClick={handleFlip}
                  style={{ '--card-color': topicColor }}
                >
                  <div className={styles.cardInner}>
                    {/* Front */}
                    <div className={styles.cardFront}>
                      {getCardStateBadge() && (
                        <span className={`${styles.cardStateBadge} ${getCardStateBadge().badgeClass}`}>
                          {getCardStateBadge().label}
                        </span>
                      )}
                      
                      {parsed.article && (
                        <span className={styles.article}>{parsed.article}</span>
                      )}
                      <span className={styles.word}>{parsed.word}</span>
                      
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
                      
                      <button 
                        className={`${styles.speakBtnBack} ${isSpeaking ? styles.speaking : ''}`}
                        onClick={handleSpeak}
                      >
                        🔊 {t('vocabPage.learn.listen')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Answer Buttons */}
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
          /* Complete Screen */
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
              <Link href="/vocabulary" className={styles.btnHome}>
                📚 {t('vocabPage.title')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VerbenPraepositionPage;
