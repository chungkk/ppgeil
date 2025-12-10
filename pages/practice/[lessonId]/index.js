import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '../../../components/SEO';
import { useLessonData } from '../../../lib/hooks/useLessonData';
import styles from '../../../styles/practice.module.css';

const PracticeHomePage = () => {
  const router = useRouter();
  const { lessonId } = router.query;
  const { lesson, isLoading } = useLessonData(lessonId, 'dictation');
  const [vocabulary, setVocabulary] = useState([]);

  // Load vocabulary to check if available
  useEffect(() => {
    if (lesson?.json) {
      const vocabPath = lesson.json.replace('.json', '.vocab.json');
      fetch(vocabPath)
        .then(res => res.json())
        .then(data => setVocabulary(data.vocabulary || []))
        .catch(() => setVocabulary([]));
    }
  }, [lesson]);

  const goBackToDictation = () => {
    router.push(`/dictation/${lessonId}`);
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

  const practiceCards = [
    {
      id: 'listen',
      icon: '🎧',
      title: 'Luyện nghe',
      description: 'Nghe 5 câu chứa từ vựng quan trọng và viết lại',
      color: '#10b981',
      available: vocabulary.length > 0
    },
    {
      id: 'speak',
      icon: '🎤',
      title: 'Luyện nói',
      description: 'Nghe và lặp lại theo mẫu, ghi âm giọng nói',
      color: '#f59e0b',
      available: false,
      comingSoon: true
    },
    {
      id: 'read',
      icon: '📖',
      title: 'Luyện đọc',
      description: 'Đọc hiểu và điền từ còn thiếu vào chỗ trống',
      color: '#667eea',
      available: true
    },
    {
      id: 'write',
      icon: '✍️',
      title: 'Luyện viết',
      description: 'Đặt câu với 5 từ vựng quan trọng của bài',
      color: '#ef4444',
      available: vocabulary.length > 0
    }
  ];

  return (
    <div className={styles.page}>
      <SEO 
        title={`Luyện tập: ${lesson?.title || 'Bài học'}`}
        description="Luyện nghe, nói, đọc, viết tiếng Đức"
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backButton} onClick={goBackToDictation}>
            ← Quay lại
          </button>
          <h1 className={styles.title}>🎯 Luyện tập</h1>
          <p className={styles.lessonTitle}>{lesson?.title}</p>
        </div>

        {/* Practice Cards Grid */}
        <div className={styles.cardsGrid}>
          {practiceCards.map((card) => (
            <div key={card.id} className={styles.practiceCardWrapper}>
              {card.available ? (
                <Link href={`/practice/${lessonId}/${card.id}`} className={styles.practiceCard} style={{ '--card-color': card.color }}>
                  <span className={styles.cardIcon}>{card.icon}</span>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardDescription}>{card.description}</p>
                  <span className={styles.cardArrow}>→</span>
                </Link>
              ) : (
                <div className={`${styles.practiceCard} ${styles.practiceCardDisabled}`} style={{ '--card-color': card.color }}>
                  <span className={styles.cardIcon}>{card.icon}</span>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardDescription}>{card.description}</p>
                  {card.comingSoon && (
                    <span className={styles.comingSoonBadge}>Sắp ra mắt</span>
                  )}
                  {!card.comingSoon && !card.available && (
                    <span className={styles.unavailableBadge}>Chưa có từ vựng</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className={styles.infoBox}>
          <p>💡 Mẹo: Hoàn thành tất cả các bài luyện tập để nắm vững bài học!</p>
        </div>
      </div>
    </div>
  );
};

export default PracticeHomePage;
