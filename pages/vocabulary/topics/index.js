import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import SEO from '../../../components/SEO';
import { getAllTopics, getTotalWordCount, topicIcons } from '../../../lib/data/goetheTopicVocabulary';
import styles from '../../../styles/VocabTopics.module.css';

const VocabularyTopicsPage = () => {
  const { currentLanguage } = useLanguage();
  const isEn = currentLanguage === 'en';
  
  const topics = getAllTopics();
  const totalWords = getTotalWordCount();

  return (
    <>
      <SEO
        title={isEn ? 'Learn German by Topic' : 'Học tiếng Đức theo chủ đề'}
        description={isEn ? 'Learn German vocabulary organized by topic' : 'Học từ vựng tiếng Đức theo chủ đề'}
      />

      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/vocabulary" className={styles.backLink}>
            ← {isEn ? 'Back' : 'Quay lại'}
          </Link>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📂</span>
            {isEn ? 'Learn by Topic' : 'Học theo chủ đề'}
          </h1>
          <p className={styles.subtitle}>
            {topics.length} {isEn ? 'topics' : 'chủ đề'} • {totalWords} {isEn ? 'words' : 'từ vựng'}
          </p>
        </div>

        <div className={styles.topicsGrid}>
          {topics.map((topic) => (
            <Link 
              key={topic.id}
              href={`/vocabulary/topics/${topic.id}`}
              className={styles.topicCard}
            >
              <span className={styles.topicIcon}>
                {topicIcons[topic.id] || '📚'}
              </span>
              <div className={styles.topicInfo}>
                <h3 className={styles.topicName}>
                  {topic.name}
                </h3>
                <p className={styles.topicNameLocal}>
                  {isEn ? topic.name_en : topic.name_vi}
                </p>
                <span className={styles.wordCount}>
                  {topic.wordCount} {isEn ? 'words' : 'từ'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default VocabularyTopicsPage;
