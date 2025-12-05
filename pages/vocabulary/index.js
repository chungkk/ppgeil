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
          {/* Category Cards */}
          <div className={styles.categorySection}>
            <div className={styles.categoryCard + ' ' + styles.disabled}>
              <div className={styles.categoryIcon}>📂</div>
              <div className={styles.categoryInfo}>
                <h3 className={styles.categoryTitle}>
                  {isEn ? 'Learn by Topic' : 'Học theo chủ đề'}
                </h3>
                <p className={styles.categoryDesc}>
                  {isEn ? 'Coming soon...' : 'Sắp ra mắt...'}
                </p>
              </div>
              <span className={styles.badge}>{isEn ? 'Coming Soon' : 'Sắp có'}</span>
            </div>

            <div className={styles.categoryCard + ' ' + styles.active}>
              <div className={styles.categoryIcon}>📊</div>
              <div className={styles.categoryInfo}>
                <h3 className={styles.categoryTitle}>
                  {isEn ? 'Learn by Level' : 'Học theo trình độ'}
                </h3>
                <p className={styles.categoryDesc}>
                  {isEn ? 'A1, A2, B1 - Goethe Institut' : 'A1, A2, B1 - Chuẩn Goethe Institut'}
                </p>
              </div>
              <span className={styles.wordsBadge}>{totalWords} {isEn ? 'words' : 'từ'}</span>
            </div>
          </div>

          {/* Level Selection */}
          <div className={styles.levelSection}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎯</span>
              {isEn ? 'Choose Your Level' : 'Chọn trình độ'}
            </h2>

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
                    <div className={styles.levelHeader}>
                      <span className={styles.levelIcon}>{level.icon}</span>
                      <span className={styles.levelBadge}>{level.id}</span>
                    </div>
                    <h3 className={styles.levelTitle}>{level.title}</h3>
                    <p className={styles.levelDesc}>{level.description}</p>
                    
                    <div className={styles.levelStats}>
                      <span className={styles.levelCount}>{level.count}</span>
                      <span className={styles.levelLabel}>{isEn ? 'words' : 'từ vựng'}</span>
                    </div>

                    {/* Progress for logged in users */}
                    {user && totalProgress > 0 && (
                      <div className={styles.levelProgress}>
                        <div className={styles.progressMini}>
                          <span className={styles.miniNew}>🆕 {stats.newWords}</span>
                          <span className={styles.miniLearning}>📖 {stats.learning}</span>
                          <span className={styles.miniMastered}>✅ {stats.mastered}</span>
                        </div>
                        <div className={styles.progressBarSmall}>
                          <div 
                            className={styles.progressFillSmall}
                            style={{ width: `${percent}%`, background: level.color }}
                          />
                        </div>
                        {stats.dueForReview > 0 && (
                          <span className={styles.dueLabel}>
                            🔔 {stats.dueForReview} {isEn ? 'due' : 'cần ôn'}
                          </span>
                        )}
                      </div>
                    )}

                    <div className={styles.levelAction}>
                      {totalProgress > 0 
                        ? (isEn ? 'Continue Learning' : 'Tiếp tục học')
                        : (isEn ? 'Start Learning' : 'Bắt đầu học')
                      } →
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsSection}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{totalWords}</span>
              <span className={styles.statLabel}>{isEn ? 'Total Words' : 'Tổng số từ'}</span>
            </div>
            {user && totalMastered > 0 && (
              <div className={styles.statItem}>
                <span className={styles.statValue}>{totalMastered}</span>
                <span className={styles.statLabel}>{isEn ? 'Mastered' : 'Đã thuộc'}</span>
              </div>
            )}
            {user && totalDue > 0 && (
              <div className={styles.statItem}>
                <span className={styles.statValue + ' ' + styles.statDue}>{totalDue}</span>
                <span className={styles.statLabel}>{isEn ? 'Due Today' : 'Cần ôn'}</span>
              </div>
            )}
            <div className={styles.statItem}>
              <span className={styles.statValue}>3</span>
              <span className={styles.statLabel}>{isEn ? 'Levels' : 'Trình độ'}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>🏆</span>
              <span className={styles.statLabel}>Goethe Institut</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VocabularyHomePage;
