import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import nomenVerbVerbindungenData, { getTodaysPhrase } from '../lib/data/nomenVerbVerbindungen';
import phraseExplanationsCache from '../lib/data/phraseExplanations.json';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/DailyPhrase.module.css';

const DailyPhrasePage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [currentPhrase, setCurrentPhrase] = useState(null);
  const [phraseExplanation, setPhraseExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);

  // Get phrase for specific day offset
  const getPhraseForOffset = useCallback((offset) => {
    const now = new Date();
    now.setDate(now.getDate() + offset);
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = dayOfYear % nomenVerbVerbindungenData.length;
    return nomenVerbVerbindungenData[index];
  }, []);

  // Update current phrase when offset changes
  useEffect(() => {
    const phrase = dayOffset === 0 ? getTodaysPhrase() : getPhraseForOffset(dayOffset);
    setCurrentPhrase(phrase);
    setPhraseExplanation(null);
  }, [dayOffset, getPhraseForOffset]);

  // Fetch detailed explanation
  const fetchPhraseExplanation = useCallback(async () => {
    if (!currentPhrase || phraseExplanation || loadingExplanation) return;
    
    const targetLang = user?.nativeLanguage || 'vi';
    
    // Check cache first
    const cachedExplanation = phraseExplanationsCache[currentPhrase.phrase]?.[targetLang];
    if (cachedExplanation) {
      setPhraseExplanation(cachedExplanation);
      return;
    }
    
    // Fallback to OpenAI API
    setLoadingExplanation(true);
    try {
      const response = await fetch('/api/explain-phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: currentPhrase.phrase,
          meaning: currentPhrase.meaning,
          example: currentPhrase.example,
          targetLang,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPhraseExplanation(data.explanation);
      }
    } catch (error) {
      console.error('Failed to fetch phrase explanation:', error);
    } finally {
      setLoadingExplanation(false);
    }
  }, [currentPhrase, phraseExplanation, loadingExplanation, user?.nativeLanguage]);

  // Auto-fetch explanation on mount and when phrase changes
  useEffect(() => {
    if (currentPhrase) {
      fetchPhraseExplanation();
    }
  }, [currentPhrase, fetchPhraseExplanation]);

  // Navigation handlers
  const handlePrevious = () => {
    setDayOffset(prev => prev - 1);
  };

  const handleNext = () => {
    if (dayOffset < 0) {
      setDayOffset(prev => prev + 1);
    }
  };

  const handleToday = () => {
    setDayOffset(0);
  };

  if (!currentPhrase) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Đang tải...</div>
      </div>
    );
  }

  const isToday = dayOffset === 0;
  const displayDate = new Date();
  displayDate.setDate(displayDate.getDate() + dayOffset);

  return (
    <>
      <SEO
        title={`${currentPhrase.phrase} - Daily German Phrase`}
        description={`Learn German Nomen-Verb-Verbindung: ${currentPhrase.phrase} (${currentPhrase.meaning})`}
        ogImage="/images/daily-phrase-og.jpg"
      />
      
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Header */}
          <header className={styles.header}>
            <button 
              className={styles.backButton}
              onClick={() => router.back()}
              aria-label="Go back"
            >
              ← {t('dailyPhrase.back')}
            </button>
            <h1 className={styles.title}>
              <span className={styles.titleIcon}>📚</span>
              {t('dailyPhrase.title')}
            </h1>
          </header>

          {/* Date Navigation */}
          <div className={styles.dateNav}>
            <button 
              className={styles.navButton}
              onClick={handlePrevious}
              aria-label="Previous day"
            >
              {t('dailyPhrase.previousDay')}
            </button>
            
            <div className={styles.dateDisplay}>
              <div className={styles.dateText}>
                {displayDate.toLocaleDateString(router.locale || 'de-DE', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              {!isToday && (
                <button 
                  className={styles.todayButton}
                  onClick={handleToday}
                >
                  {t('dailyPhrase.today')}
                </button>
              )}
            </div>
            
            <button 
              className={`${styles.navButton} ${isToday ? styles.disabled : ''}`}
              onClick={handleNext}
              disabled={isToday}
              aria-label="Next day"
            >
              {t('dailyPhrase.nextDay')}
            </button>
          </div>

          {/* Main Phrase Card */}
          <div className={styles.phraseCard}>
            <div className={styles.phraseHeader}>
              <div className={styles.phraseIcon}>📖</div>
              <div className={styles.phraseMain}>
                <h2 className={styles.phraseText}>{currentPhrase.phrase}</h2>
                <p className={styles.phraseMeaning}>= {currentPhrase.meaning}</p>
              </div>
            </div>

            {/* Translations */}
            <div className={styles.translations}>
              <div className={styles.translation}>
                <span className={styles.flag}>🇬🇧</span>
                <span className={styles.translationText}>{currentPhrase.en}</span>
              </div>
              <div className={styles.translation}>
                <span className={styles.flag}>🇻🇳</span>
                <span className={styles.translationText}>{currentPhrase.vi}</span>
              </div>
            </div>

            {/* Example */}
            <div className={styles.example}>
              <div className={styles.exampleLabel}>{t('dailyPhrase.example')}</div>
              <div className={styles.exampleText}>&ldquo;{currentPhrase.example}&rdquo;</div>
            </div>
          </div>

          {/* Detailed Explanation */}
          <div className={styles.explanationCard}>
            <h3 className={styles.explanationTitle}>
              <span className={styles.explanationIcon}>💡</span>
              {t('dailyPhrase.detailedExplanation')}
            </h3>
            
            {loadingExplanation && (
              <div className={styles.loadingExplanation}>
                <div className={styles.spinner}></div>
                <span>{t('dailyPhrase.loadingExplanation')}</span>
              </div>
            )}
            
            {phraseExplanation && !loadingExplanation && (
              <div className={styles.explanationContent}>
                {phraseExplanation.split('\n').map((line, index) => {
                  if (line.startsWith('**') && line.includes(':**')) {
                    const [title, content] = line.split(':**');
                    return (
                      <div key={index} className={styles.explanationSection}>
                        <span className={styles.sectionTitle}>
                          {title.replace(/\*\*/g, '')}:
                        </span>
                        <span className={styles.sectionContent}>{content}</span>
                      </div>
                    );
                  }
                  if (line.trim().match(/^\d+\./)) {
                    return (
                      <div key={index} className={styles.explanationExample}>
                        {line}
                      </div>
                    );
                  }
                  if (line.trim()) {
                    return (
                      <div key={index} className={styles.explanationLine}>
                        {line}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
            
            {!phraseExplanation && !loadingExplanation && (
              <div className={styles.noExplanation}>
                <p>{t('dailyPhrase.noExplanation')}</p>
                <button 
                  className={styles.loadButton}
                  onClick={fetchPhraseExplanation}
                >
                  {t('dailyPhrase.loadExplanation')}
                </button>
              </div>
            )}
          </div>


        </div>
      </div>
    </>
  );
};

export default DailyPhrasePage;
