import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import SEO from '../../components/SEO';
import styles from '../../styles/VocabHome.module.css';

// Import vocabulary data for counts
import goetheA1Vocabulary from '../../lib/data/goetheA1Vocabulary';
import goetheA2Vocabulary from '../../lib/data/goetheA2Vocabulary';
import goetheB1Vocabulary from '../../lib/data/goetheB1Vocabulary';
import { getTotalWordCount as getTopicWordCount, getAllTopics, getTopicById } from '../../lib/data/goetheTopicVocabulary';

const VocabularyHomePage = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const [progress, setProgress] = useState(null);

  // Load user progress
  useEffect(() => {
    if (user) {
      loadProgress();
    }
  }, [user]);

  const loadProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/user/vocab-progress', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setProgress(data.vocabProgress);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const levels = [
    {
      id: 'A1',
      key: 'a1',
      count: goetheA1Vocabulary.length,
      icon: '🌱',
      color: '#22c55e'
    },
    {
      id: 'A2',
      key: 'a2',
      count: goetheA2Vocabulary.length,
      icon: '📚',
      color: '#3b82f6'
    },
    {
      id: 'B1',
      key: 'b1',
      count: goetheB1Vocabulary.length,
      icon: '🎓',
      color: '#8b5cf6'
    }
  ];

  const totalWords = goetheA1Vocabulary.length + goetheA2Vocabulary.length + goetheB1Vocabulary.length;
  const topicCount = getAllTopics().length;
  const topicWordCount = getTopicWordCount();
  const verbenPraepTopic = getTopicById('verben_praeposition');
  const verbenPraepCount = verbenPraepTopic?.words?.length || 60;
  const nomenVerbTopic = getTopicById('nomen_verb');
  const nomenVerbCount = nomenVerbTopic?.words?.length || 60;
  
  // Calculate totals with new structure
  const getLevelStats = (levelKey) => {
    const p = progress?.[levelKey];
    return {
      newWords: p?.newWords?.length || 0,
      learning: p?.learningWords?.length || 0,
      mastered: p?.masteredWords?.length || 0,
      dueForReview: p?.dueForReview?.length || 0
    };
  };

  const totalMastered = progress 
    ? (progress.a1?.masteredWords?.length || 0) + (progress.a2?.masteredWords?.length || 0) + (progress.b1?.masteredWords?.length || 0)
    : 0;
  
  const totalDue = progress
    ? (progress.a1?.dueForReview?.length || 0) + (progress.a2?.dueForReview?.length || 0) + (progress.b1?.dueForReview?.length || 0)
    : 0;

  return (
    <>
      <SEO
        title={t('vocabPage.title')}
        description={t('vocabPage.subtitle')}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📚</span>
            {t('vocabPage.title')}
          </h1>
          <p className={styles.subtitle}>
            {t('vocabPage.subtitle')}
          </p>
        </div>

        <div className={styles.content}>
          {/* Two Main Sections */}
          <div className={styles.mainSections}>
            
            {/* Section 1: Learn by Topic */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconWrapper} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  📂
                </div>
                <div className={styles.sectionInfo}>
                  <h2 className={styles.sectionTitle}>
                    {t('vocabPage.byTopic.title')}
                  </h2>
                  <p className={styles.sectionDesc}>
                    {topicCount} {t('vocabPage.byTopic.topics')} • {topicWordCount} {t('vocabPage.byTopic.words')}
                  </p>
                </div>
              </div>
              
              <p className={styles.sectionText}>
                {t('vocabPage.byTopic.desc')}
              </p>

              <Link href="/vocabulary/topics" className={styles.sectionBtn} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                {t('vocabPage.byTopic.btn')} →
              </Link>
            </div>

            {/* Section 2: Verben mit Präpositionen */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconWrapper} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  🔗
                </div>
                <div className={styles.sectionInfo}>
                  <h2 className={styles.sectionTitle}>
                    {t('vocabPage.verbPrep.title')}
                  </h2>
                  <p className={styles.sectionDesc}>
                    {t('vocabPage.verbPrep.name')} • {verbenPraepCount} {t('vocabPage.verbPrep.phrases')}
                  </p>
                </div>
              </div>
              
              <p className={styles.sectionText}>
                {t('vocabPage.verbPrep.desc')}
              </p>

              <Link href="/vocabulary/topics/verben_praeposition" className={styles.sectionBtn} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                {t('vocabPage.startLearning')} →
              </Link>
            </div>

            {/* Section 3: Nomen-Verb-Verbindungen */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconWrapper} style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                  📎
                </div>
                <div className={styles.sectionInfo}>
                  <h2 className={styles.sectionTitle}>
                    {t('vocabPage.nounVerb.title')}
                  </h2>
                  <p className={styles.sectionDesc}>
                    {t('vocabPage.nounVerb.name')} • {nomenVerbCount} {t('vocabPage.nounVerb.phrases')}
                  </p>
                </div>
              </div>
              
              <p className={styles.sectionText}>
                {t('vocabPage.nounVerb.desc')}
              </p>

              <Link href="/vocabulary/topics/nomen_verb" className={styles.sectionBtn} style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                {t('vocabPage.startLearning')} →
              </Link>
            </div>

            {/* Section 4: Learn by Level */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconWrapper} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  📊
                </div>
                <div className={styles.sectionInfo}>
                  <h2 className={styles.sectionTitle}>
                    {t('vocabPage.byLevel.title')}
                  </h2>
                  <p className={styles.sectionDesc}>
                    A1 → A2 → B1 • {totalWords} {t('vocabPage.byLevel.words')}
                  </p>
                </div>
              </div>

              <p className={styles.sectionText}>
                {t('vocabPage.byLevel.desc')}
              </p>

              {/* Level Cards */}
              <div className={styles.levelGrid}>
                {levels.map((level) => {
                  const stats = getLevelStats(level.key);
                  const totalProgress = stats.newWords + stats.learning + stats.mastered;
                  const percent = Math.round(((stats.mastered + stats.learning * 0.5) / level.count) * 100);

                  return (
                    <Link 
                      key={level.id} 
                      href={`/vocabulary/learn/${level.key}`}
                      className={styles.levelCard}
                      style={{ '--level-color': level.color }}
                    >
                      <div className={styles.levelTop}>
                        <span className={styles.levelIcon}>{level.icon}</span>
                        <span className={styles.levelBadge}>{level.id}</span>
                      </div>
                      <div className={styles.levelInfo}>
                        <span className={styles.levelCount}>{level.count}</span>
                        <span className={styles.levelLabel}>{t('vocabPage.byLevel.words')}</span>
                      </div>
                      
                      {/* Progress indicator */}
                      {user && totalProgress > 0 && (
                        <div className={styles.levelProgress}>
                          <div className={styles.progressBarSmall}>
                            <div 
                              className={styles.progressFillSmall}
                              style={{ width: `${percent}%`, background: level.color }}
                            />
                          </div>
                          <span className={styles.progressPercent}>{percent}%</span>
                        </div>
                      )}

                      {/* Due indicator */}
                      {stats.dueForReview > 0 && (
                        <span className={styles.dueBadge}>🔔 {stats.dueForReview}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stats Footer */}
          {user && (totalMastered > 0 || totalDue > 0) && (
            <div className={styles.statsSection}>
              {totalMastered > 0 && (
                <div className={styles.statItem}>
                  <span className={styles.statIcon}>✅</span>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>{totalMastered}</span>
                    <span className={styles.statLabel}>{t('vocabPage.stats.mastered')}</span>
                  </div>
                </div>
              )}
              {totalDue > 0 && (
                <div className={styles.statItem + ' ' + styles.statDue}>
                  <span className={styles.statIcon}>🔔</span>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>{totalDue}</span>
                    <span className={styles.statLabel}>{t('vocabPage.stats.dueReview')}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VocabularyHomePage;
