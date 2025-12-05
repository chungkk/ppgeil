import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { speakText, stopSpeech } from '../../../lib/textToSpeech';
import SEO from '../../../components/SEO';
import { getTopicById, topicIcons } from '../../../lib/data/goetheTopicVocabulary';
import styles from '../../../styles/VocabLearn.module.css';

const TopicLearnPage = () => {
  const router = useRouter();
  const { topicId } = router.query;
  const { currentLanguage } = useLanguage();
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

  // Get translation
  const getTranslation = (item) => {
    if (!item) return '';
    return isEn ? (item.en || item.vi || '') : (item.vi || item.en || '');
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
          {isEn ? 'Loading...' : 'Đang tải...'}
        </div>
      </div>
    );
  }

  const topicIcon = topicIcons[topicId] || '📚';
  const topicColor = '#6366f1';

  return (
    <>
      <SEO
        title={`${topic.name} - ${isEn ? 'Vocabulary' : 'Từ vựng'}`}
        description={isEn ? `Learn ${topic.name_en} vocabulary` : `Học từ vựng ${topic.name_vi}`}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/vocabulary/topics" className={styles.backLink}>
            ← {isEn ? 'Topics' : 'Chủ đề'}
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
                        👆 {isEn ? 'Tap to see meaning' : 'Nhấn để xem nghĩa'}
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
                        🔊 {isEn ? 'Listen' : 'Nghe'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Answer Buttons */}
                {showButtons && (
                  <div className={styles.answerRow3}>
                    <button className={styles.btnNew} onClick={() => handleAnswer('new')}>
                      <span>🆕</span>
                      <span>{isEn ? "Don't Know" : 'Chưa biết'}</span>
                    </button>
                    <button className={styles.btnLearning} onClick={() => handleAnswer('learning')}>
                      <span>📖</span>
                      <span>{isEn ? 'Familiar' : 'Hơi quen'}</span>
                    </button>
                    <button className={styles.btnMastered} onClick={() => handleAnswer('mastered')}>
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
              {isEn ? 'Topic Complete!' : 'Hoàn thành chủ đề!'}
            </h2>

            <div className={styles.statsRow3}>
              <div className={styles.statBox3 + ' ' + styles.statBoxNew}>
                <span className={styles.statNum}>{stats.new}</span>
                <span className={styles.statLabel}>{isEn ? "Don't Know" : 'Chưa biết'}</span>
              </div>
              <div className={styles.statBox3 + ' ' + styles.statBoxLearning}>
                <span className={styles.statNum}>{stats.learning}</span>
                <span className={styles.statLabel}>{isEn ? 'Familiar' : 'Hơi quen'}</span>
              </div>
              <div className={styles.statBox3 + ' ' + styles.statBoxMastered}>
                <span className={styles.statNum}>{stats.mastered}</span>
                <span className={styles.statLabel}>{isEn ? 'Know It!' : 'Đã thuộc'}</span>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button className={styles.btnRestart} onClick={handleRestart}>
                🔄 {isEn ? 'Practice Again' : 'Luyện lại'}
              </button>
              <Link href="/vocabulary/topics" className={styles.btnHome}>
                📂 {isEn ? 'All Topics' : 'Tất cả chủ đề'}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TopicLearnPage;
