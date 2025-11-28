import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'react-toastify';
import { DictionaryAnalytics } from '../lib/analytics';
import { isFeatureEnabled, FEATURES } from '../lib/featureFlags';
import { speakText } from '../lib/textToSpeech';
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

const DictionaryPopup = ({ word, onClose, position, arrowPosition, lessonId, context }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [wordData, setWordData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const fetchWordData = async () => {
      if (!word) return;

      const targetLang = user?.nativeLanguage || 'vi';

      // Check cache first
      const cached = dictionaryCache.get(word, targetLang);
      if (cached) {
        setWordData(cached);
        setIsLoading(false);
        DictionaryAnalytics.cacheHit(word, true);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/dictionary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            word: word,
            sourceLang: 'de',
            targetLang: targetLang
          })
        });

        const data = await response.json();
        if (data.success) {
          setWordData(data.data);
          dictionaryCache.set(word, data.data, targetLang);
          
          // Track cache status
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
        setIsLoading(false);
      }
    };

    fetchWordData();
  }, [word, user]);

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

    if (!wordData?.translation) {
      toast.info('⏳ ' + t('dictionaryPopup.searchingMeaning'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetchWithAuth('/api/vocabulary', {
        method: 'POST',
        body: JSON.stringify({
          word: word,
          translation: wordData.translation,
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
            {isLoading ? (
              <div className={styles.loadingText}>
                {t('dictionaryPopup.searching') || 'Đang tra từ...'}
              </div>
            ) : wordData?.translation ? (
              <div className={styles.wordTranslation}>
                {wordData.translation}
              </div>
            ) : null}
          </div>
          <div className={styles.headerButtons}>
            {user && !isLoading && wordData && (
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

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loadingState}>
              {useSkeletonLoading ? (
                // A/B Test Variant: Skeleton Loading
                <div className={styles.skeleton}>
                  <div className={styles.skeletonLine}></div>
                  <div className={styles.skeletonLine}></div>
                  <div className={styles.skeletonLine}></div>
                  <div className={styles.skeletonLine}></div>
                  <div className={styles.skeletonLine}></div>
                </div>
              ) : (
                // A/B Test Control: Spinner Loading
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
                  <div className={styles.loadingSpinner}></div>
                  <div className={styles.loadingMessage}>
                    {t('dictionaryPopup.loading') || 'Đang tải nội dung...'}
                  </div>
                </div>
              )}
            </div>
          ) : wordData ? (
            <>
              {/* Explanation */}
              {wordData?.explanation && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>{t('dictionaryPopup.explanation')}</h4>
              <div className={styles.sectionContent}>
                {wordData.explanation}
              </div>
            </div>
          )}

          {/* Examples */}
          {wordData?.examples && wordData.examples.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>{t('dictionaryPopup.examples')}</h4>
              <div className={styles.examples}>
                {wordData.examples.map((example, index) => (
                  <div key={index} className={styles.example}>
                    <div className={styles.exampleGerman}>{example.de}</div>
                    <div className={styles.exampleTranslation}>{example.translation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          ) : (
            <div className={styles.noData}>
              {t('dictionaryPopup.noData') || 'Không tìm thấy dữ liệu'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionaryPopup;
