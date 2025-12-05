import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import SEO from '../../../components/SEO';
import { getAllTopics, getTotalWordCount, topicIcons } from '../../../lib/data/goetheTopicVocabulary';
import styles from '../../../styles/VocabTopics.module.css';

// Group topics by category
const topicCategories = {
  basic: {
    name_en: 'Basic & Grammar',
    name_vi: 'Cơ bản & Ngữ pháp',
    icon: '📝',
    topics: ['adjectives', 'verbs', 'numbers', 'colors', 'time']
  },
  people: {
    name_en: 'People & Relationships',
    name_vi: 'Con người & Quan hệ',
    icon: '👥',
    topics: ['family', 'character', 'feelings', 'professions']
  },
  daily: {
    name_en: 'Daily Life',
    name_vi: 'Đời sống hàng ngày',
    icon: '🏠',
    topics: ['house', 'food', 'clothes', 'daily_routine', 'shopping']
  },
  health: {
    name_en: 'Health & Body',
    name_vi: 'Sức khỏe & Cơ thể',
    icon: '💪',
    topics: ['body', 'health', 'sports']
  },
  world: {
    name_en: 'World & Nature',
    name_vi: 'Thế giới & Thiên nhiên',
    icon: '🌍',
    topics: ['animals', 'nature', 'weather']
  },
  travel: {
    name_en: 'Travel & Places',
    name_vi: 'Du lịch & Địa điểm',
    icon: '✈️',
    topics: ['transport', 'travel', 'restaurant']
  },
  work: {
    name_en: 'Work & Education',
    name_vi: 'Công việc & Giáo dục',
    icon: '💼',
    topics: ['business', 'school', 'technology', 'hobbies']
  }
};

const VocabularyTopicsPage = () => {
  const { currentLanguage } = useLanguage();
  const isEn = currentLanguage === 'en';
  
  const allTopics = getAllTopics();
  const totalWords = getTotalWordCount();

  // Get topic data by id
  const getTopicData = (topicId) => {
    return allTopics.find(t => t.id === topicId);
  };

  return (
    <>
      <SEO
        title={isEn ? 'Learn German by Topic' : 'Học tiếng Đức theo chủ đề'}
        description={isEn ? 'Learn German vocabulary organized by topic' : 'Học từ vựng tiếng Đức theo chủ đề'}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/vocabulary" className={styles.backLink}>
            ← {isEn ? 'Back to Vocabulary' : 'Quay lại'}
          </Link>
          <h1 className={styles.title}>
            {isEn ? 'Learn by Topic' : 'Học theo chủ đề'}
          </h1>
          <p className={styles.subtitle}>
            {allTopics.length} {isEn ? 'topics' : 'chủ đề'} • {totalWords} {isEn ? 'words' : 'từ vựng'}
          </p>
        </div>

        {/* Categories */}
        <div className={styles.categoriesWrapper}>
          {Object.entries(topicCategories).map(([catId, category]) => (
            <div key={catId} className={styles.category}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryIcon}>{category.icon}</span>
                <h2 className={styles.categoryTitle}>
                  {isEn ? category.name_en : category.name_vi}
                </h2>
              </div>
              
              <div className={styles.topicsGrid}>
                {category.topics.map((topicId) => {
                  const topic = getTopicData(topicId);
                  if (!topic) return null;
                  
                  return (
                    <Link 
                      key={topic.id}
                      href={`/vocabulary/topics/${topic.id}`}
                      className={styles.topicCard}
                    >
                      <span className={styles.topicIcon}>
                        {topicIcons[topic.id] || '📚'}
                      </span>
                      <div className={styles.topicInfo}>
                        <h3 className={styles.topicName}>{topic.name}</h3>
                        <p className={styles.topicNameLocal}>
                          {isEn ? topic.name_en : topic.name_vi}
                        </p>
                      </div>
                      <span className={styles.wordCount}>
                        {topic.wordCount}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default VocabularyTopicsPage;
