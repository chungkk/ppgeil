import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../context/LanguageContext';
import SEO from '../../../components/SEO';
import { getAllTopics, getTotalWordCount, topicIcons } from '../../../lib/data/goetheTopicVocabulary';
import styles from '../../../styles/VocabTopics.module.css';

// Grammar topic IDs - shown in /vocabulary/grammar instead
const GRAMMAR_TOPIC_IDS = ['verben_praeposition', 'nomen_verb', 'verbs', 'adjectives'];

// Group topics by category with translation keys (vocabulary only, no grammar)
const topicCategories = {
  basic: {
    key: 'basic',
    icon: '📝',
    topics: ['numbers', 'colors', 'time']
  },
  people: {
    key: 'people',
    icon: '👥',
    topics: ['family', 'character', 'feelings', 'professions']
  },
  daily: {
    key: 'daily',
    icon: '🏠',
    topics: ['house', 'food', 'clothes', 'daily_routine', 'shopping']
  },
  health: {
    key: 'health',
    icon: '💪',
    topics: ['body', 'health', 'sports']
  },
  world: {
    key: 'world',
    icon: '🌍',
    topics: ['animals', 'nature', 'weather']
  },
  travel: {
    key: 'travel',
    icon: '✈️',
    topics: ['transport', 'travel', 'restaurant']
  },
  work: {
    key: 'work',
    icon: '💼',
    topics: ['business', 'school', 'technology', 'hobbies']
  }
};

const VocabularyTopicsPage = () => {
  const { t } = useTranslation('common');
  const { currentLanguage } = useLanguage();
  const isDe = currentLanguage === 'de';
  const isEn = currentLanguage === 'en';
  
  const allTopics = getAllTopics().filter(t => !GRAMMAR_TOPIC_IDS.includes(t.id));
  const totalWords = allTopics.reduce((sum, t) => sum + t.wordCount, 0);

  // Get topic data by id
  const getTopicData = (topicId) => {
    return allTopics.find(t => t.id === topicId);
  };

  // Get topic name based on language
  const getTopicLocalName = (topic) => {
    if (isDe) return topic.name; // German name
    if (isEn) return topic.name_en || topic.name;
    return topic.name_vi || topic.name;
  };

  return (
    <>
      <SEO
        title={t('vocabPage.topics.title')}
        description={t('vocabPage.byTopic.desc')}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/vocabulary" className={styles.backLink}>
            ← {t('vocabPage.backToVocab')}
          </Link>
          <h1 className={styles.title}>
            {t('vocabPage.byTopic.title')}
          </h1>
          <p className={styles.subtitle}>
            {allTopics.length} {t('vocabPage.topics.subtitle')} • {totalWords} {t('vocabPage.byTopic.words')}
          </p>
        </div>

        {/* Categories */}
        <div className={styles.categoriesWrapper}>
          {Object.entries(topicCategories).map(([catId, category]) => (
            <div key={catId} className={styles.category}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryIcon}>{category.icon}</span>
                <h2 className={styles.categoryTitle}>
                  {t(`vocabPage.topics.${category.key}`)}
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
                          {getTopicLocalName(topic)}
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
