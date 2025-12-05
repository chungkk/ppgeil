import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../context/LanguageContext';
import { speakText, stopSpeech } from '../../../lib/textToSpeech';
import SEO from '../../../components/SEO';
import { getTopicById, topicIcons } from '../../../lib/data/goetheTopicVocabulary';
import styles from '../../../styles/VocabLearn.module.css';

const TopicLearnPage = () => {
  const router = useRouter();
  const { topicId } = router.query;
  const { t } = useTranslation('common');
  const { currentLanguage } = useLanguage();
  const isDe = currentLanguage === 'de';
  const isEn = currentLanguage === 'en';

  const topic = getTopicById(topicId);

  // States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [shuffledData, setShuffledData] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stats, setStats] = useState({ new: 0, learning: 0, mastered: 0 });

  // Shuffle data on mount
  useEffect(() => {
    if (topic?.words) {
      const shuffled = [...topic.words].sort(() => Math.random() - 0.5);
      setShuffledData(shuffled);
    }
  }, [topic]);

  // Get translation based on current language
  const getTranslation = (item) => {
    if (!item) return '';
    if (isDe) return item.en || item.vi || ''; // German users see English translation
    if (isEn) return item.en || item.vi || '';
    return item.vi || item.en || '';
  };

  // Get topic name based on language
  const getTopicName = () => {
    if (!topic) return '';
    if (isDe) return topic.name; // German name
    if (isEn) return topic.name_en || topic.name;
    return topic.name_vi || topic.name;
  };

  // Parse article from word
  const parseWord = (wordStr) => {
    const match = wordStr.match(/^(der|die|das)\s+(.+)$/i);
    if (match) {
      return { article: match[1], word: match[2] };
    }
    return { article: null, word: wordStr };
  };

  // Speak word
  const handleSpeak = (e) => {
    e?.stopPropagation();
    if (!currentCard) return;
    
    setIsSpeaking(true);
    speakText(currentCard.word, 'de-DE', 0.8);
    setTimeout(() => setIsSpeaking(false), 1500);
  };

  // Current card
  const currentCard = shuffledData[currentIndex];
  const parsed = currentCard ? parseWord(currentCard.word) : { article: null, word: '' };
  const progress = shuffledData.length > 0 ? ((currentIndex + 1) / shuffledData.length) * 100 : 0;

  // Flip card
  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      setShowButtons(true);
      handleSpeak();
    }
  };

  // Handle answer
  const handleAnswer = (mastery) => {
    setStats(prev => ({ ...prev, [mastery]: prev[mastery] + 1 }));
    nextCard();
  };

  // Next card
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

  // Restart
  const handleRestart = () => {
    const shuffled = [...topic.words].sort(() => Math.random() - 0.5);
    setShuffledData(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowButtons(false);
    setIsComplete(false);
    setStats({ new: 0, learning: 0, mastered: 0 });
    stopSpeech();
  };

  // Loading or invalid topic
  if (!topic) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          {t('vocabPage.learn.loading')}
        </div>
      </div>
    );
  }

  const topicIcon = topicIcons[topicId] || '📚';
  const topicColor = '#6366f1';

  return (
    <>
      <SEO
        title={`${topic.name} - ${t('header.nav.vocabulary')}`}
        description={`${t('vocabPage.byTopic.title')}: ${getTopicName()}`}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/vocabulary/topics" className={styles.backLink}>
            ← {t('vocabPage.learn.backTopics')}
          </Link>
          <div className={styles.levelInfo}>
            <span className={styles.levelIcon}>{topicIcon}</span>
            <span className={styles.levelTitle} style={{ color: topicColor }}>
              {topic.name}
            </span>
          </div>
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
                  style={{ '--card-color': topicColor }}
                >
                  <div className={styles.cardInner}>
                    {/* Front */}
                    <div className={styles.cardFront}>
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
                  <div className={styles.answerRow3}>
                    <button className={styles.btnNew} onClick={() => handleAnswer('new')}>
                      <span>🆕</span>
                      <span>{t('vocabPage.learn.dontKnow')}</span>
                    </button>
                    <button className={styles.btnLearning} onClick={() => handleAnswer('learning')}>
                      <span>📖</span>
                      <span>{t('vocabPage.learn.familiar')}</span>
                    </button>
                    <button className={styles.btnMastered} onClick={() => handleAnswer('mastered')}>
                      <span>✅</span>
                      <span>{t('vocabPage.learn.knowIt')}</span>
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

            <div className={styles.statsRow3}>
              <div className={styles.statBox3 + ' ' + styles.statBoxNew}>
                <span className={styles.statNum}>{stats.new}</span>
                <span className={styles.statLabel}>{t('vocabPage.learn.dontKnow')}</span>
                <span className={styles.statReview}>{t('vocabPage.learn.reviewTomorrow')}</span>
              </div>
              <div className={styles.statBox3 + ' ' + styles.statBoxLearning}>
                <span className={styles.statNum}>{stats.learning}</span>
                <span className={styles.statLabel}>{t('vocabPage.learn.familiar')}</span>
                <span className={styles.statReview}>{t('vocabPage.learn.review3days')}</span>
              </div>
              <div className={styles.statBox3 + ' ' + styles.statBoxMastered}>
                <span className={styles.statNum}>{stats.mastered}</span>
                <span className={styles.statLabel}>{t('vocabPage.learn.knowIt')}</span>
                <span className={styles.statReview}>{t('vocabPage.learn.review7days')}</span>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button className={styles.btnRestart} onClick={handleRestart}>
                🔄 {t('vocabPage.learn.practiceMore')}
              </button>
              <Link href="/vocabulary/topics" className={styles.btnHome}>
                📂 {t('vocabPage.learn.allTopics')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TopicLearnPage;
