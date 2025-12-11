import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'react-toastify';
import { DictionaryAnalytics } from '../lib/analytics';
import { isFeatureEnabled, FEATURES } from '../lib/featureFlags';
import { speakText } from '../lib/textToSpeech';
import { translationCache } from '../lib/translationCache';
import styles from '../styles/DictionaryPopup.module.css';

const DICTIONARY_CACHE_KEY = 'dictionary_cache';
const CACHE_EXPIRY_DAYS = 7;

const dictionaryCache = {
  get(word, targetLang) {
    if (typeof window === 'undefined') return null;
    try {
      const cache = JSON.parse(localStorage.getItem(DICTIONARY_CACHE_KEY) || '{}');
      const key = `${word}_${targetLang}`.toLowerCase();
      const cached = cache[key];
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
      return null;
    } catch {
      return null;
    }
  },
  set(word, data, targetLang) {
    if (typeof window === 'undefined') return;
    try {
      const cache = JSON.parse(localStorage.getItem(DICTIONARY_CACHE_KEY) || '{}');
      const key = `${word}_${targetLang}`.toLowerCase();
      cache[key] = {
        data,
        expiry: Date.now() + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      };
      localStorage.setItem(DICTIONARY_CACHE_KEY, JSON.stringify(cache));
    } catch {}
  }
};

const DictionaryPopup = ({ word, onClose, position, arrowPosition, lessonId, context, sentenceTranslation, transcriptData, onSaveSuccess }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [wordData, setWordData] = useState(null);
  const [translation, setTranslation] = useState(''); // Quick translation from cache/translate API
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(true);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(true); // For explanation only
  const [explanation, setExplanation] = useState('');
  const [localExamples, setLocalExamples] = useState([]); // Examples from transcript (instant)
  const [activeTab, setActiveTab] = useState('explanation'); // 'explanation' or 'examples'
  const [isLoading, setIsLoading] = useState(true); // Keep for backward compatibility
  const [isMobile, setIsMobile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [useSkeletonLoading, setUseSkeletonLoading] = useState(true);
  
  const popupOpenTimeRef = useRef(Date.now());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // A/B Test: Skeleton vs Spinner (50/50 split)
  useEffect(() => {
    const useSkeleton = isFeatureEnabled(FEATURES.USE_SKELETON_LOADING, 50);
    setUseSkeletonLoading(useSkeleton);
  }, []);

  // Track popup opened
  useEffect(() => {
    if (word) {
      DictionaryAnalytics.popupOpened(word, {
        lesson_id: lessonId,
        has_context: !!context,
        device_type: isMobile ? 'mobile' : 'desktop',
        loading_variant: useSkeletonLoading ? 'skeleton' : 'spinner'
      });
    }
  }, [word, lessonId, context, isMobile, useSkeletonLoading]);

  // Handle Escape key to close popup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const timeSpent = Date.now() - popupOpenTimeRef.current;
        DictionaryAnalytics.popupClosed(word, timeSpent, {
          close_method: 'escape_key',
          device_type: isMobile ? 'mobile' : 'desktop'
        });
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [word, isMobile, onClose]);

  // Step 1: Fetch translation quickly (from cache or translate API)
  useEffect(() => {
    const fetchTranslation = async () => {
      if (!word) return;

      const targetLang = user?.nativeLanguage || 'vi';
      setIsLoadingTranslation(true);

      // Check translationCache first (instant)
      const cached = translationCache.get(word, 'de', targetLang);
      if (cached) {
        setTranslation(cached);
        setIsLoadingTranslation(false);
        return;
      }

      // Call translate API (fast, simple translation with context)
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: word,
            context: context || '',
            sentenceTranslation: sentenceTranslation || '',
            sourceLang: 'de',
            targetLang: targetLang
          })
        });

        const data = await response.json();
        if (data.success && data.translation) {
          setTranslation(data.translation);
          translationCache.set(word, data.translation, 'de', targetLang);
        }
      } catch (error) {
        console.error('Translation fetch error:', error);
      } finally {
        setIsLoadingTranslation(false);
      }
    };

    fetchTranslation();
  }, [word, user, context, sentenceTranslation]);

  // Step 2: Fetch explanation only (examples loaded on demand)
  useEffect(() => {
    const fetchExplanation = async () => {
      if (!word) return;

      const targetLang = user?.nativeLanguage || 'vi';

      // Check dictionary cache first
      const cached = dictionaryCache.get(word, targetLang);
      if (cached) {
        setWordData(cached);
        setExplanation(cached.explanation || '');
        // Don't load examples yet - wait for tab click
        setIsLoadingExplanation(false);
        setIsLoading(false);
        DictionaryAnalytics.cacheHit(word, true);
        return;
      }

      setIsLoadingExplanation(true);
      setIsLoading(true);
      
      try {
        const response = await fetch('/api/dictionary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: word,
            sourceLang: 'de',
            targetLang: targetLang,
            includeExamples: false // Only get explanation first
          })
        });

        const data = await response.json();
        if (data.success) {
          setWordData(data.data);
          setExplanation(data.data?.explanation || '');
          // Also update translation if dictionary has better one
          if (data.data?.translation) {
            setTranslation(data.data.translation);
          }
          dictionaryCache.set(word, data.data, targetLang);
          
          if (data.fromCache) {
            DictionaryAnalytics.cacheHit(word, false);
          } else {
            DictionaryAnalytics.cacheMiss(word);
          }
        }
      } catch (error) {
        console.error('Dictionary fetch error:', error);
        DictionaryAnalytics.error(word, 'fetch_failed', error.message);
      } finally {
        setIsLoadingExplanation(false);
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [word, user]);

  // Find examples from transcript data (instant, no API call)
  useEffect(() => {
    if (!word || !transcriptData || transcriptData.length === 0) {
      setLocalExamples([]);
      return;
    }

    const wordLower = word.toLowerCase();
    const foundExamples = [];

    transcriptData.forEach(sentence => {
      if (sentence.text && sentence.text.toLowerCase().includes(wordLower)) {
        // Highlight the word in the sentence
        const highlightedText = sentence.text.replace(
          new RegExp(`(${word})`, 'gi'),
          '<strong>$1</strong>'
        );
        foundExamples.push({
          de: sentence.text,
          highlighted: highlightedText,
          translation: sentence.translation || '' // If translation exists in transcript
        });
      }
    });

    // Limit to 5 examples max
    setLocalExamples(foundExamples.slice(0, 5));
  }, [word, transcriptData]);

  // Simple tab switch (no API call needed for examples)
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  // Check if word is already saved in vocabulary
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!word || !user) return;
      
      try {
        const response = await fetchWithAuth(`/api/vocabulary?word=${encodeURIComponent(word)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            setIsSaved(true);
          }
        }
      } catch (error) {
        // Silently fail - not critical
        console.error('Check saved status error:', error);
      }
    };

    checkSavedStatus();
  }, [word, user]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      const timeSpent = Date.now() - popupOpenTimeRef.current;
      DictionaryAnalytics.popupClosed(word, timeSpent, {
        close_method: 'overlay_click',
        device_type: isMobile ? 'mobile' : 'desktop'
      });
      onClose();
    }
  };

  // Touch gesture handlers for swipe to close
  const minSwipeDistance = 50; // minimum distance for swipe in pixels

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
    if (touchStart) {
      const distance = e.targetTouches[0].clientY - touchStart;
      // Only allow downward swipe
      if (distance > 0) {
        setSwipeDistance(distance);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchEnd - touchStart;
    const isDownSwipe = distance > minSwipeDistance;
    
    if (isDownSwipe) {
      const timeSpent = Date.now() - popupOpenTimeRef.current;
      DictionaryAnalytics.swipedToClose(word, distance);
      DictionaryAnalytics.popupClosed(word, timeSpent, {
        close_method: 'swipe',
        swipe_distance: distance,
        device_type: 'mobile'
      });
      onClose();
    }
    
    // Reset states
    setSwipeDistance(0);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleSaveWord = async () => {
    if (!user) {
      toast.warning('🔐 ' + t('dictionaryPopup.loginRequired'));
      return;
    }

    if (!translation) {
      toast.info('⏳ ' + t('dictionaryPopup.searchingMeaning'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetchWithAuth('/api/vocabulary', {
        method: 'POST',
        body: JSON.stringify({
          word: word,
          translation: translation,
          context: context || '',
          lessonId: lessonId || null
        })
      });

      if (res.ok) {
        toast.success('🎉 ' + t('dictionaryPopup.addedSuccess'));
        setIsSaved(true);
        setShowConfetti(true);
        
        // Track word saved
        DictionaryAnalytics.wordSaved(word, wordData.translation, {
          lesson_id: lessonId,
          has_context: !!context,
          device_type: isMobile ? 'mobile' : 'desktop'
        });
        
        // Notify parent to refresh vocabulary list
        if (onSaveSuccess) {
          onSaveSuccess();
        }
        
        // Hide confetti after animation completes
        setTimeout(() => {
          setShowConfetti(false);
        }, 1000);
      } else {
        const data = await res.json();
        toast.error('😅 ' + t('dictionaryPopup.addedError') + ' ' + data.message);
      }
    } catch (error) {
      console.error('Save vocabulary error:', error);
      toast.error('😢 ' + t('dictionaryPopup.generalError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className={`${styles.overlay} ${isMobile ? styles.mobileOverlay : ''}`} 
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className={`${styles.popupContainer} ${isMobile ? styles.mobilePopup : ''}`}
        data-arrow-position={arrowPosition || 'right'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dictionary-popup-title"
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        style={position ? {
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: isMobile 
            ? `translate(-50%, ${swipeDistance}px)` 
            : 'none',
          opacity: swipeDistance > 0 ? Math.max(0.3, 1 - swipeDistance / 200) : 1,
          transition: swipeDistance > 0 ? 'none' : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-out',
        } : {}}
      >
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.wordTitleRow}>
              <div className={styles.wordTitle} id="dictionary-popup-title">{word}</div>
              <button
                className={styles.speakButton}
                onClick={() => speakText(word)}
                title={t('dictionaryPopup.pronounce') || 'Phát âm'}
                aria-label={t('dictionaryPopup.pronounce') || 'Phát âm'}
              >
                🔊
              </button>
            </div>
            {isLoadingTranslation ? (
              <div className={styles.loadingText}>
                {t('dictionaryPopup.searching') || 'Đang tra từ...'}
              </div>
            ) : translation ? (
              <div className={styles.wordTranslation}>
                {translation}
              </div>
            ) : null}
          </div>
          <div className={styles.headerButtons}>
            {user && translation && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={handleSaveWord}
                  className={`${styles.saveButton} ${isSaved ? styles.saved : ''}`}
                  disabled={isSaving}
                  title={isSaved ? t('dictionaryPopup.alreadySaved') : t('dictionaryPopup.saveToTreasure')}
                >
                  {isSaving ? '💫' : isSaved ? '🎉 ' + t('dictionaryPopup.saved') : '⭐ ' + t('dictionaryPopup.save')}
                </button>
                {showConfetti && (
                  <div className={styles.confettiContainer}>
                    <div className={styles.confetti} style={{ top: '10px', left: '50%' }}></div>
                    <div className={styles.confetti} style={{ top: '10px', left: '60%' }}></div>
                    <div className={styles.confetti} style={{ top: '10px', left: '40%' }}></div>
                    <div className={styles.confetti} style={{ top: '10px', left: '55%' }}></div>
                    <div className={styles.confetti} style={{ top: '10px', left: '45%' }}></div>
                  </div>
                )}
              </div>
            )}
            <button 
              onClick={() => {
                const timeSpent = Date.now() - popupOpenTimeRef.current;
                DictionaryAnalytics.popupClosed(word, timeSpent, {
                  close_method: 'close_button',
                  device_type: isMobile ? 'mobile' : 'desktop'
                });
                onClose();
              }} 
              className={styles.closeButton}
              aria-label={t('common.close') || 'Đóng'}
              title={t('common.close') || 'Đóng'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'explanation' ? styles.tabActive : ''}`}
            onClick={() => handleTabClick('explanation')}
          >
            📖 {t('dictionaryPopup.explanation') || 'Giải thích'}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'examples' ? styles.tabActive : ''}`}
            onClick={() => handleTabClick('examples')}
          >
            📝 {t('dictionaryPopup.examples') || 'Ví dụ'}
          </button>
        </div>

        <div className={styles.content}>
          {/* Explanation Tab */}
          {activeTab === 'explanation' && (
            <>
              {isLoadingExplanation ? (
                <div className={styles.loadingState}>
                  <div className={styles.skeleton}>
                    <div className={styles.skeletonLine}></div>
                    <div className={styles.skeletonLine}></div>
                    <div className={styles.skeletonLine}></div>
                  </div>
                </div>
              ) : explanation ? (
                <div className={styles.sectionContent}>
                  {explanation}
                </div>
              ) : (
                <div className={styles.noData}>
                  {t('dictionaryPopup.noExplanation') || 'Chưa có giải thích'}
                </div>
              )}
            </>
          )}

          {/* Examples Tab - From transcript (instant, no API) */}
          {activeTab === 'examples' && (
            <>
              {localExamples.length > 0 ? (
                <div className={styles.examples}>
                  {localExamples.map((example, index) => (
                    <div key={index} className={styles.example}>
                      <div 
                        className={styles.exampleGerman}
                        dangerouslySetInnerHTML={{ __html: example.highlighted }}
                      />
                      {example.translation && (
                        <div className={styles.exampleTranslation}>{example.translation}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noData}>
                  {t('dictionaryPopup.noExamplesInLesson') || 'Không tìm thấy từ này trong bài học'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionaryPopup;
