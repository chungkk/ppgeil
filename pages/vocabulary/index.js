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

  const isEn = currentLanguage === 'en';

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
      title: isEn ? 'A1 - Beginner' : 'A1 - Cơ bản',
      description: isEn ? 'Basic vocabulary for beginners' : 'Từ vựng cơ bản cho người mới',
      count: goetheA1Vocabulary.length,
      icon: '🌱',
      color: '#22c55e'
    },
    {
      id: 'A2',
      key: 'a2',
      title: isEn ? 'A2 - Elementary' : 'A2 - Sơ cấp',
      description: isEn ? 'Expand your basic vocabulary' : 'Mở rộng vốn từ vựng cơ bản',
      count: goetheA2Vocabulary.length,
      icon: '📚',
      color: '#3b82f6'
    },
    {
      id: 'B1',
      key: 'b1',
      title: isEn ? 'B1 - Intermediate' : 'B1 - Trung cấp',
      description: isEn ? 'Advanced vocabulary for communication' : 'Từ vựng nâng cao cho giao tiếp',
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
        title={isEn ? 'German Vocabulary' : 'Từ vựng tiếng Đức'}
        description={isEn ? 'Learn German vocabulary from A1 to B1' : 'Học từ vựng tiếng Đức từ A1 đến B1'}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📚</span>
            {isEn ? 'German Vocabulary' : 'Từ vựng tiếng Đức'}
          </h1>
          <p className={styles.subtitle}>
            {isEn 
              ? 'Learn vocabulary according to Goethe Institut standards' 
              : 'Học từ vựng theo chuẩn Goethe Institut'}
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
                    {isEn ? 'Learn by Topic' : 'Học theo chủ đề'}
                  </h2>
                  <p className={styles.sectionDesc}>
                    {topicCount} {isEn ? 'topics' : 'chủ đề'} • {topicWordCount} {isEn ? 'words' : 'từ'}
                  </p>
                </div>
              </div>
              
              <p className={styles.sectionText}>
                {isEn 
                  ? 'Learn vocabulary grouped by practical topics like Family, Food, Travel, Business, and more.'
                  : 'Học từ vựng theo nhóm chủ đề thực tế như Gia đình, Ẩm thực, Du lịch, Kinh doanh...'}
              </p>

              <Link href="/vocabulary/topics" className={styles.sectionBtn} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                {isEn ? 'Browse Topics' : 'Xem chủ đề'} →
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
                    {isEn ? 'Verbs with Prepositions' : 'Cụm động từ + Giới từ'}
                  </h2>
                  <p className={styles.sectionDesc}>
                    Verben mit Präpositionen • {verbenPraepCount} {isEn ? 'phrases' : 'cụm từ'}
                  </p>
                </div>
              </div>
              
              <p className={styles.sectionText}>
                {isEn 
                  ? 'Master German verbs that require specific prepositions. Essential for fluent communication!'
                  : 'Học các động từ đi kèm giới từ cố định. Rất quan trọng để giao tiếp trôi chảy!'}
              </p>

              <Link href="/vocabulary/topics/verben_praeposition" className={styles.sectionBtn} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                {isEn ? 'Start Learning' : 'Bắt đầu học'} →
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
                    {isEn ? 'Noun-Verb Collocations' : 'Cụm danh từ + động từ'}
                  </h2>
                  <p className={styles.sectionDesc}>
                    Nomen-Verb-Verbindungen • {nomenVerbCount} {isEn ? 'phrases' : 'cụm từ'}
                  </p>
                </div>
              </div>
              
              <p className={styles.sectionText}>
                {isEn 
                  ? 'Learn fixed noun-verb expressions commonly used in German. Example: eine Frage stellen, Bescheid geben...'
                  : 'Học các cụm danh từ + động từ cố định thường dùng. VD: eine Frage stellen, Bescheid geben...'}
              </p>

              <Link href="/vocabulary/topics/nomen_verb" className={styles.sectionBtn} style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                {isEn ? 'Start Learning' : 'Bắt đầu học'} →
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
                    {isEn ? 'Learn by Level' : 'Học theo trình độ'}
                  </h2>
                  <p className={styles.sectionDesc}>
                    A1 → A2 → B1 • {totalWords} {isEn ? 'words' : 'từ'}
                  </p>
                </div>
              </div>

              <p className={styles.sectionText}>
                {isEn 
                  ? 'Follow the official Goethe Institut curriculum from beginner to intermediate level.'
                  : 'Theo giáo trình chuẩn Goethe Institut từ cơ bản đến trung cấp.'}
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
                        <span className={styles.levelLabel}>{isEn ? 'words' : 'từ'}</span>
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
                    <span className={styles.statLabel}>{isEn ? 'Mastered' : 'Đã thuộc'}</span>
                  </div>
                </div>
              )}
              {totalDue > 0 && (
                <div className={styles.statItem + ' ' + styles.statDue}>
                  <span className={styles.statIcon}>🔔</span>
                  <div className={styles.statInfo}>
                    <span className={styles.statValue}>{totalDue}</span>
                    <span className={styles.statLabel}>{isEn ? 'Due for Review' : 'Cần ôn tập'}</span>
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
