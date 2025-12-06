import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../context/LanguageContext';
import SEO from '../../../components/SEO';
import { getTopicById, topicIcons } from '../../../lib/data/goetheTopicVocabulary';
import styles from '../../../styles/VocabTopics.module.css';

// Grammar topic IDs
const GRAMMAR_TOPICS = [
  {
    id: 'verben_praeposition',
    icon: '🔗',
    color: '#10b981'
  },
  {
    id: 'nomen_verb',
    icon: '📎',
    color: '#ec4899'
  },
  {
    id: 'verbs',
    icon: '🏃',
    color: '#3b82f6'
  },
  {
    id: 'adjectives',
    icon: '📝',
    color: '#f59e0b'
  }
];

const GrammarPatternsPage = () => {
  const { t } = useTranslation('common');
  const { currentLanguage } = useLanguage();
  const isDe = currentLanguage === 'de';
  const isEn = currentLanguage === 'en';

  // Get topic data
  const grammarTopics = GRAMMAR_TOPICS.map(gt => {
    const topic = getTopicById(gt.id);
    return topic ? { ...topic, ...gt } : null;
  }).filter(Boolean);

  const totalWords = grammarTopics.reduce((sum, t) => sum + (t.words?.length || 0), 0);

  // Get topic name based on language
  const getTopicLocalName = (topic) => {
    if (isDe) return topic.name;
    if (isEn) return topic.name_en || topic.name;
    return topic.name_vi || topic.name;
  };

  return (
    <>
      <SEO
        title={t('vocabPage.grammar.title')}
        description={t('vocabPage.grammar.desc')}
      />

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/vocabulary" className={styles.backLink}>
            ← {t('vocabPage.backToVocab')}
          </Link>
          <h1 className={styles.title}>
            {t('vocabPage.grammar.title')}
          </h1>
          <p className={styles.subtitle}>
            {grammarTopics.length} {t('vocabPage.grammar.patterns')} • {totalWords} {t('vocabPage.grammar.phrases')}
          </p>
        </div>

        {/* Grammar Topics Grid */}
        <div className={styles.categoriesWrapper}>
          <div className={styles.category}>
            <div className={styles.topicsGrid}>
              {grammarTopics.map((topic) => (
                <Link 
                  key={topic.id}
                  href={`/vocabulary/grammar/${topic.id}`}
                  className={styles.topicCard}
                  style={{ '--topic-color': topic.color }}
                >
                  <span className={styles.topicIcon}>
                    {topic.icon || topicIcons[topic.id] || '📚'}
                  </span>
                  <div className={styles.topicInfo}>
                    <h3 className={styles.topicName}>{topic.name}</h3>
                    <p className={styles.topicNameLocal}>
                      {getTopicLocalName(topic)}
                    </p>
                  </div>
                  <span className={styles.wordCount}>
                    {topic.words?.length || topic.wordCount}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GrammarPatternsPage;
