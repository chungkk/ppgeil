import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const TOPIC_ID = 'nomen_verb';
const LOCAL_STORAGE_KEY = `srs_progress_${TOPIC_ID}`;

const NomenVerbPage = () => {
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
  
  // New states for progress view
  const [viewMode, setViewMode] = useState('learn'); // 'learn' | 'progress'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'learned' | 'hard' | 'new'

  const isEn = currentLanguage === 'en';
  
  // Derived data for progress tracking
  const progressData = useMemo(() => {
    if (!topic?.words) return { learned: [], hard: [], newWords: [], mastered: [] };
    
    const learned = [];
    const hard = [];
    const newWords = [];
    const mastered = [];
    
    topic.words.forEach(wordItem => {
      const card = srsCards[wordItem.word];
      if (!card || card.reviews === 0) {
        newWords.push(wordItem);
      } else if (card.state === CardState.REVIEW && card.interval >= 7) {
        mastered.push({ ...wordItem, card });
      } else if (card.lapses > 0 || card.state === CardState.RELEARNING) {
        hard.push({ ...wordItem, card });
      } else {
        learned.push({ ...wordItem, card });
      }
    });
    
    return { learned, hard, newWords, mastered };
  }, [topic?.words, srsCards]);
  
  const filteredWords = useMemo(() => {
    if (!topic?.words) return [];
    
    switch (filterMode) {
      case 'learned':
        return [...progressData.learned, ...progressData.mastered];
      case 'hard':
        return progressData.hard;
      case 'new':
        return progressData.newWords;
      default:
        return topic.words.map(w => {
          const card = srsCards[w.word];
          return card ? { ...w, card } : w;
        });
    }
  }, [topic?.words, filterMode, progressData, srsCards]);

  // Get auth token for API calls
  const getAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }, []);

  // Load progress from localStorage
  const loadLocalProgress = useCallback(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error loading local progress:', e);
      return {};
    }
  }, []);

  // Save progress to localStorage
  const saveLocalProgress = useCallback((cards) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      console.error('Error saving local progress:', e);
    }
  }, []);

  // Load progress from API (for logged in users)
  const loadAPIProgress = useCallback(async () => {
    const token = getAuthToken();
    if (!token || !user) return null;
    
    try {
      const response = await fetch(`/api/user/srs-progress?topic=${TOPIC_ID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.queue?.cards || {};
      }
    } catch (error) {
      console.error('Error loading API progress:', error);
    }
    return null;
  }, [getAuthToken, user]);

  // Save card progress to database and localStorage
  const saveCardProgress = useCallback(async (word, rating, cardData, allCards) => {
    // Always save to localStorage first
    saveLocalProgress(allCards);
    
    const token = getAuthToken();
    if (!token || !user) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 1500);
      return;
    }

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
  }, [getAuthToken, user, saveLocalProgress]);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      // First try localStorage
      const localProgress = loadLocalProgress();
      if (Object.keys(localProgress).length > 0) {
        setSrsCards(localProgress);
      }
      
      // If logged in, try to load from API and merge
      if (user) {
        const apiProgress = await loadAPIProgress();
        if (apiProgress && Object.keys(apiProgress).length > 0) {
          setSrsCards(prev => ({ ...prev, ...apiProgress }));
        }
      }
    };
    
    loadProgress();
  }, [user, loadLocalProgress, loadAPIProgress]);

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

    const newCards = {
      ...srsCards,
      [currentCard.word]: updatedCard
    };
    
    setSrsCards(newCards);
    saveCardProgress(currentCard.word, rating, updatedCard, newCards);
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
    // Keep srsCards to preserve progress
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowButtons(false);
    setIsComplete(false);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    stopSpeech();
  };
  
  // Practice only hard words
  const handlePracticeHard = () => {
    if (progressData.hard.length === 0) return;
    const shuffled = [...progressData.hard].sort(() => Math.random() - 0.5);
    setShuffledData(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowButtons(false);
    setIsComplete(false);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setViewMode('learn');
    stopSpeech();
  };
  
  // Practice only new words
  const handlePracticeNew = () => {
    if (progressData.newWords.length === 0) return;
    const shuffled = [...progressData.newWords].sort(() => Math.random() - 0.5);
    setShuffledData(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowButtons(false);
    setIsComplete(false);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setViewMode('learn');
    stopSpeech();
  };
  
  // Reset all progress
  const handleResetProgress = () => {
    if (confirm(isEn ? 'Reset all progress? This cannot be undone.' : 'Xóa toàn bộ tiến độ? Không thể hoàn tác.')) {
      setSrsCards({});
      saveLocalProgress({});
      setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    }
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

  const topicIcon = topicIcons[TOPIC_ID] || '📎';
  const topicColor = '#ec4899';

  return (
    <>
      <SEO
        title={`${topic.name} - ${t('vocabPage.nounVerb.title')}`}
        description={t('vocabPage.nounVerb.desc')}
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
          {viewMode === 'learn' && (
            <div className={styles.progressText}>
              {currentIndex + 1} / {shuffledData.length}
            </div>
          )}
        </div>

        {/* View Mode Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          justifyContent: 'center', 
          marginBottom: '1rem',
          padding: '0 1rem'
        }}>
          <button
            onClick={() => setViewMode('learn')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'learn' ? topicColor : 'rgba(255,255,255,0.1)',
              color: viewMode === 'learn' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            📝 {isEn ? 'Learn' : 'Học'}
          </button>
          <button
            onClick={() => setViewMode('progress')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'progress' ? topicColor : 'rgba(255,255,255,0.1)',
              color: viewMode === 'progress' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            📊 {isEn ? 'Progress' : 'Tiến độ'}
          </button>
        </div>

        {viewMode === 'learn' && (
          <>
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
              {saveStatus && (
                <span style={{ 
                  marginLeft: 'auto', 
                  fontSize: '12px', 
                  color: saveStatus === 'saved' ? '#22c55e' : saveStatus === 'error' ? '#ef4444' : '#f59e0b' 
                }}>
                  {saveStatus === 'saving' ? '💾...' : saveStatus === 'saved' ? '✓ Saved' : '⚠'}
                </span>
              )}
            </div>
          </>
        )}

        {/* Main Content - Learn Mode */}
        {viewMode === 'learn' && (
          <>
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
          </>
        )}
        
        {/* Progress View */}
        {viewMode === 'progress' && (
          <div style={{ padding: '0 1rem' }}>
            {/* Stats Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderRadius: '8px',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
                  {progressData.hard.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                  {isEn ? 'Hard' : 'Khó'}
                </div>
              </div>
              <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                borderRadius: '8px',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
                  {progressData.learned.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                  {isEn ? 'Learning' : 'Đang học'}
                </div>
              </div>
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                borderRadius: '8px',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>
                  {progressData.mastered.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>
                  {isEn ? 'Mastered' : 'Thuộc'}
                </div>
              </div>
              <div style={{
                background: 'rgba(156, 163, 175, 0.15)',
                borderRadius: '8px',
                padding: '0.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9ca3af' }}>
                  {progressData.newWords.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  {isEn ? 'New' : 'Chưa học'}
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {progressData.hard.length > 0 && (
                <button
                  onClick={handlePracticeHard}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  🔥 {isEn ? `Practice Hard (${progressData.hard.length})` : `Ôn từ khó (${progressData.hard.length})`}
                </button>
              )}
              {progressData.newWords.length > 0 && (
                <button
                  onClick={handlePracticeNew}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(156, 163, 175, 0.2)',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  ✨ {isEn ? `Learn New (${progressData.newWords.length})` : `Học từ mới (${progressData.newWords.length})`}
                </button>
              )}
              <button
                onClick={handleResetProgress}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  marginLeft: 'auto'
                }}
              >
                🗑️ {isEn ? 'Reset' : 'Xóa tiến độ'}
              </button>
            </div>

            {/* Filter Tabs */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              marginBottom: '1rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem'
            }}>
              {[
                { key: 'all', label: isEn ? 'All' : 'Tất cả', count: topic?.words?.length || 0 },
                { key: 'hard', label: isEn ? 'Hard' : 'Khó', count: progressData.hard.length, color: '#ef4444' },
                { key: 'learned', label: isEn ? 'Learned' : 'Đã học', count: progressData.learned.length + progressData.mastered.length, color: '#22c55e' },
                { key: 'new', label: isEn ? 'New' : 'Chưa học', count: progressData.newWords.length, color: '#9ca3af' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterMode(tab.key)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: filterMode === tab.key ? (tab.color || topicColor) : 'rgba(255,255,255,0.1)',
                    color: filterMode === tab.key ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Word List */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem',
              maxHeight: '50vh',
              overflowY: 'auto'
            }}>
              {filteredWords.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: 'var(--text-secondary)' 
                }}>
                  {isEn ? 'No words in this category' : 'Không có từ trong danh mục này'}
                </div>
              ) : (
                filteredWords.map((item, idx) => {
                  const card = item.card || srsCards[item.word];
                  const isHard = card && (card.lapses > 0 || card.state === CardState.RELEARNING);
                  const isMastered = card && card.state === CardState.REVIEW && card.interval >= 7;
                  const isLearning = card && card.reviews > 0 && !isMastered && !isHard;
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-secondary, rgba(255,255,255,0.03))',
                        border: `1px solid ${isHard ? 'rgba(239,68,68,0.3)' : isMastered ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ 
                          fontWeight: 600, 
                          color: isHard ? '#ef4444' : isMastered ? '#22c55e' : 'var(--text-primary)',
                          marginBottom: '0.25rem'
                        }}>
                          {item.word}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {getTranslation(item)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isHard && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>❌ {isEn ? 'Hard' : 'Khó'}</span>}
                        {isMastered && <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓ {isEn ? 'Mastered' : 'Thuộc'}</span>}
                        {isLearning && <span style={{ fontSize: '0.7rem', color: '#3b82f6' }}>📖 {isEn ? 'Learning' : 'Đang học'}</span>}
                        {!card && <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>✨ {isEn ? 'New' : 'Mới'}</span>}
                        <button
                          onClick={() => {
                            speakText(item.word, 'de-DE', 0.8);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            padding: '0.25rem'
                          }}
                        >
                          🔊
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NomenVerbPage;
