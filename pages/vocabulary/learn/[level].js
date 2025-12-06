import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { speakText, stopSpeech } from '../../../lib/textToSpeech';
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

// Mastery levels
const MASTERY = {
  NEW: 'new',           // Chưa biết - review tomorrow
  LEARNING: 'learning', // Hơi quen - review in 3 days
  MASTERED: 'mastered'  // Đã thuộc - review in 7 days
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
  const [shuffledData, setShuffledData] = useState([]);
  const [savedProgress, setSavedProgress] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Track results for this session
  const [sessionResults, setSessionResults] = useState([]);
  const [stats, setStats] = useState({ new: 0, learning: 0, mastered: 0 });

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

      const res = await fetch('/api/user/vocab-progress', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSavedProgress(data.vocabProgress);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  // Save progress when session completes
  const saveProgress = useCallback(async (results) => {
    if (!user || !level || results.length === 0) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/user/vocab-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          level: level.toLowerCase(),
          wordResults: results
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Update saved progress with new data
        setSavedProgress(prev => ({
          ...prev,
          [level.toLowerCase()]: data.levelProgress
        }));
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, level]);

  // Shuffle data on mount - prioritize words due for review
  useEffect(() => {
    if (config?.data && level) {
      let wordsToLearn = [...config.data];
      
      // If user has progress, prioritize due words
      if (savedProgress && savedProgress[level.toLowerCase()]) {
        const levelData = savedProgress[level.toLowerCase()];
        const dueWords = levelData.dueForReview || [];
        const newWords = levelData.newWords || [];
        
        // Sort: due words first, then new words, then rest
        wordsToLearn.sort((a, b) => {
          const aIsDue = dueWords.includes(a.word);
          const bIsDue = dueWords.includes(b.word);
          const aIsNew = newWords.includes(a.word);
          const bIsNew = newWords.includes(b.word);
          
          if (aIsDue && !bIsDue) return -1;
          if (!aIsDue && bIsDue) return 1;
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
          return Math.random() - 0.5;
        });
      } else {
        // Just shuffle randomly
        wordsToLearn.sort(() => Math.random() - 0.5);
      }
      
      // Limit to 20 words per session for better learning
      setShuffledData(wordsToLearn.slice(0, 20));
    }
  }, [config?.data, savedProgress, level]);

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

  // Current card
  const currentCard = shuffledData[currentIndex];
  const progress = shuffledData.length > 0 ? ((currentIndex + 1) / shuffledData.length) * 100 : 0;

  // Get level progress stats
  const levelProgress = savedProgress?.[level?.toLowerCase()];
  const totalNew = levelProgress?.newWords?.length || 0;
  const totalLearning = levelProgress?.learningWords?.length || 0;
  const totalMastered = levelProgress?.masteredWords?.length || 0;
  const totalWords = config?.data?.length || 0;

  // Flip card
  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      setShowButtons(true);
    }
  };

  // Handle answer with 3 levels
  const handleAnswer = (mastery) => {
    if (!currentCard) return;

    // Record result
    const result = { word: currentCard.word, result: mastery };
    setSessionResults(prev => [...prev, result]);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      [mastery]: prev[mastery] + 1
    }));

    nextCard();
  };

  // Next card
  const nextCard = () => {
    setIsFlipped(false);
    setShowButtons(false);
    stopSpeech();

    if (currentIndex < shuffledData.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 200);
    } else {
      setIsComplete(true);
      // Save progress when complete
      if (sessionResults.length > 0) {
        saveProgress([...sessionResults, { word: currentCard.word, result: MASTERY.NEW }]);
      }
    }
  };

  // Restart
  const handleRestart = () => {
    let wordsToLearn = [...config.data].sort(() => Math.random() - 0.5);
    setShuffledData(wordsToLearn.slice(0, 20));
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowButtons(false);
    setIsComplete(false);
    setSessionResults([]);
    setStats({ new: 0, learning: 0, mastered: 0 });
    stopSpeech();
  };

  // Practice due words only
  const handlePracticeDue = () => {
    if (!levelProgress?.dueForReview?.length) return;
    
    const dueWords = levelProgress.dueForReview;
    const wordsToLearn = config.data.filter(w => dueWords.includes(w.word));
    setShuffledData(wordsToLearn.slice(0, 20));
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowButtons(false);
    setIsComplete(false);
    setSessionResults([]);
    setStats({ new: 0, learning: 0, mastered: 0 });
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

  const dueCount = levelProgress?.dueForReview?.length || 0;

  return (
    <>
      <SEO
        title={`${config.title[currentLanguage] || config.title.en} - ${isEn ? 'Vocabulary' : 'Từ vựng'}`}
        description={isEn ? `Learn ${config.id} German vocabulary` : `Học từ vựng tiếng Đức ${config.id}`}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/vocabulary" className={styles.backLink}>
            ← {isEn ? 'Back' : 'Quay lại'}
          </Link>
          <div className={styles.levelInfo}>
            <span className={styles.levelIcon}>{config.icon}</span>
            <span className={styles.levelTitle} style={{ color: config.color }}>
              {config.id}
            </span>
          </div>
          <div className={styles.progressText}>
            {currentIndex + 1} / {shuffledData.length}
          </div>
        </div>

        {/* Overall Progress (if logged in) */}
        {user && (totalNew + totalLearning + totalMastered) > 0 && !isComplete && (
          <div className={styles.overallProgress}>
            <div className={styles.progressStats}>
              <span className={styles.statNew}>🆕 {totalNew}</span>
              <span className={styles.statLearning}>📖 {totalLearning}</span>
              <span className={styles.statMastered}>✅ {totalMastered}</span>
            </div>
            <div className={styles.overallBar}>
              <div 
                className={styles.overallFill}
                style={{ 
                  width: `${((totalMastered + totalLearning * 0.5) / totalWords) * 100}%`,
                  background: config.color 
                }}
              />
            </div>
            {dueCount > 0 && (
              <span className={styles.dueLabel}>
                🔔 {dueCount} {isEn ? 'due for review' : 'cần ôn'}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress}%`, background: config.color }}
          />
        </div>

        {/* Session Score */}
        <div className={styles.scoreRow}>
          <span className={styles.scoreNew}>🆕 {stats.new}</span>
          <span className={styles.scoreLearning}>📖 {stats.learning}</span>
          <span className={styles.scoreMastered}>✅ {stats.mastered}</span>
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
                  style={{ '--card-color': config.color }}
                >
                  <div className={styles.cardInner}>
                    {/* Front */}
                    <div className={styles.cardFront}>
                      {currentCard.article && (
                        <span className={styles.article}>{currentCard.article}</span>
                      )}
                      <span className={styles.word}>{currentCard.word}</span>
                      {currentCard.plural && (
                        <span className={styles.plural}>Pl: {currentCard.plural}</span>
                      )}
                      <span className={styles.type}>
                        {currentCard.type === 'noun' ? '📗 Danh từ' : 
                         currentCard.type === 'verb' ? '📘 Động từ' : '📙 Tính từ'}
                      </span>
                      
                      {/* Speak button on front */}
                      <button 
                        className={`${styles.speakBtn} ${isSpeaking ? styles.speaking : ''}`}
                        onClick={handleSpeak}
                      >
                        🔊
                      </button>
                      
                      <span className={styles.hint}>
                        👆 {isEn ? 'Tap to see meaning' : 'Nhấn để xem nghĩa'}
                      </span>
                    </div>

                    {/* Back */}
                    <div className={styles.cardBack}>
                      <span className={styles.translation}>
                        {getTranslation(currentCard)}
                      </span>
                      <span className={styles.wordSmall}>
                        {currentCard.article && `${currentCard.article} `}{currentCard.word}
                      </span>
                      
                      {/* Speak button on back */}
                      <button 
                        className={`${styles.speakBtnBack} ${isSpeaking ? styles.speaking : ''}`}
                        onClick={handleSpeak}
                      >
                        🔊 {isEn ? 'Listen' : 'Nghe'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Answer Buttons - 3 levels */}
                {showButtons && (
                  <div className={styles.answerRow3}>
                    <button 
                      className={styles.btnNew}
                      onClick={() => handleAnswer(MASTERY.NEW)}
                    >
                      <span>🆕</span>
                      <span>{isEn ? "Don't Know" : 'Chưa biết'}</span>
                    </button>
                    <button 
                      className={styles.btnLearning}
                      onClick={() => handleAnswer(MASTERY.LEARNING)}
                    >
                      <span>📖</span>
                      <span>{isEn ? 'Familiar' : 'Hơi quen'}</span>
                    </button>
                    <button 
                      className={styles.btnMastered}
                      onClick={() => handleAnswer(MASTERY.MASTERED)}
                    >
                      <span>✅</span>
                      <span>{isEn ? 'Know It!' : 'Đã thuộc!'}</span>
                    </button>
                  </div>
                )}

                {!showButtons && (
                  <p className={styles.tapText}>
                    {isEn ? 'Tap the card to reveal meaning' : 'Nhấn vào thẻ để xem nghĩa'}
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
              {isEn ? 'Session Complete!' : 'Hoàn thành!'}
            </h2>

            <div className={styles.statsRow3}>
              <div className={styles.statBox3 + ' ' + styles.statBoxNew}>
                <span className={styles.statNum}>{stats.new}</span>
                <span className={styles.statLabel}>{isEn ? "Don't Know" : 'Chưa biết'}</span>
                <span className={styles.statReview}>{isEn ? 'Review: Tomorrow' : 'Ôn: Ngày mai'}</span>
              </div>
              <div className={styles.statBox3 + ' ' + styles.statBoxLearning}>
                <span className={styles.statNum}>{stats.learning}</span>
                <span className={styles.statLabel}>{isEn ? 'Familiar' : 'Hơi quen'}</span>
                <span className={styles.statReview}>{isEn ? 'Review: 3 days' : 'Ôn: 3 ngày'}</span>
              </div>
              <div className={styles.statBox3 + ' ' + styles.statBoxMastered}>
                <span className={styles.statNum}>{stats.mastered}</span>
                <span className={styles.statLabel}>{isEn ? 'Know It!' : 'Đã thuộc'}</span>
                <span className={styles.statReview}>{isEn ? 'Review: 7 days' : 'Ôn: 7 ngày'}</span>
              </div>
            </div>

            {/* Saved Progress Info */}
            {user && (
              <div className={styles.savedInfo}>
                {isSaving ? (
                  <span className={styles.saving}>
                    {isEn ? 'Saving progress...' : 'Đang lưu tiến trình...'}
                  </span>
                ) : (
                  <span className={styles.saved}>
                    ✓ {isEn ? 'Progress saved with spaced repetition!' : 'Đã lưu với lặp lại ngắt quãng!'}
                  </span>
                )}
              </div>
            )}

            {!user && (
              <div className={styles.loginHint}>
                💡 {isEn ? 'Log in to save progress & use spaced repetition!' : 'Đăng nhập để lưu tiến trình & dùng lặp lại ngắt quãng!'}
              </div>
            )}

            <div className={styles.actionRow}>
              <button className={styles.btnRestart} onClick={handleRestart}>
                🔄 {isEn ? 'Practice More' : 'Luyện thêm'}
              </button>
              {dueCount > 0 && (
                <button className={styles.btnDue} onClick={handlePracticeDue}>
                  🔔 {isEn ? `Review ${dueCount} Due` : `Ôn ${dueCount} từ`}
                </button>
              )}
              <Link href="/vocabulary" className={styles.btnHome}>
                🏠 {isEn ? 'Home' : 'Trang chủ'}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VocabularyLearnPage;
