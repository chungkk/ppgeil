import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import SEO from '../../../components/SEO';
import { useLessonData } from '../../../lib/hooks/useLessonData';
import { useAuth } from '../../../context/AuthContext';
import styles from '../../../styles/practice.module.css';

const PracticeHomePage = () => {
  const router = useRouter();
  const { lessonId } = router.query;
  const { lesson, isLoading } = useLessonData(lessonId, 'dictation');
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [vocabulary, setVocabulary] = useState([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/dictation/${lessonId}?login=true`);
    }
  }, [user, authLoading, router, lessonId]);

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

  if (isLoading || authLoading || !user) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>{t('practice.loading')}</p>
        </div>
      </div>
    );
  }

  const practiceCards = [
    {
      id: 'listen',
      icon: '🎧',
      title: t('practice.listen.title'),
      description: t('practice.listen.description'),
      color: '#10b981',
      available: vocabulary.length > 0
    },
    {
      id: 'speak',
      icon: '🎤',
      title: t('practice.speak.title'),
      description: t('practice.speak.description'),
      color: '#f59e0b',
      available: false,
      comingSoon: true
    },
    {
      id: 'read',
      icon: '📖',
      title: t('practice.read.title'),
      description: t('practice.read.description'),
      color: '#667eea',
      available: true
    },
    {
      id: 'write',
      icon: '✍️',
      title: t('practice.write.title'),
      description: t('practice.write.description'),
      color: '#ef4444',
      available: vocabulary.length > 0
    }
  ];

  return (
    <div className={styles.page}>
      <SEO 
        title={`${t('practice.title')}: ${lesson?.title || ''}`}
        description={t('practice.hub.subtitle')}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backButton} onClick={goBackToDictation}>
            ← {t('practice.backTo')}
          </button>
          <h1 className={styles.title}>🎯 {t('practice.hub.title')}</h1>
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
                    <span className={styles.comingSoonBadge}>{t('practice.speak.comingSoon')}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PracticeHomePage;
