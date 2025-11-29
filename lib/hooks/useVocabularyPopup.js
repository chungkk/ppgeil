import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { speakText } from '../textToSpeech';
import { translationCache } from '../translationCache';

/**
 * Hook for managing vocabulary popup functionality
 * Handles word click, translation, and dictionary popup display
 */
const useVocabularyPopup = ({ 
  user, 
  lessonId, 
  transcriptData, 
  currentSentenceIndex,
  isYouTube,
  youtubePlayerRef,
  audioRef
}) => {
  const { t } = useTranslation();
  
  // Vocabulary popup states
  const [showVocabPopup, setShowVocabPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [popupArrowPosition, setPopupArrowPosition] = useState('right');
  const [clickedWordElement, setClickedWordElement] = useState(null);
  
  // Mobile tooltip states
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipWord, setTooltipWord] = useState('');
  const [tooltipTranslation, setTooltipTranslation] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  
  // Word suggestion popup states
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const [suggestionWord, setSuggestionWord] = useState('');
  const [suggestionWordIndex, setSuggestionWordIndex] = useState(null);
  const [suggestionContext, setSuggestionContext] = useState('');
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  
  // Debounce refs to prevent duplicate clicks/requests
  const lastClickedWordRef = useRef(null);
  const lastClickTimeRef = useRef(0);
  const pendingRequestRef = useRef(null);

  // Update popup position on scroll
  useEffect(() => {
    if (!showVocabPopup || !clickedWordElement) return;

    let rafId = null;
    let isUpdating = false;

    const updatePopupPosition = () => {
      if (!isUpdating) {
        isUpdating = true;
        rafId = requestAnimationFrame(() => {
          const rect = clickedWordElement.getBoundingClientRect();
          const popupWidth = 350;
          const popupHeight = 280;
          const gapFromWord = 30;

          const spaceAbove = rect.top;
          const spaceBelow = window.innerHeight - rect.bottom;

          let top, left, arrowPos;

          if (spaceAbove >= popupHeight + gapFromWord + 20) {
            top = rect.top - popupHeight - gapFromWord;
            arrowPos = 'bottom';
          } else {
            top = rect.bottom + gapFromWord;
            arrowPos = 'top';
          }

          left = rect.left + rect.width / 2 - popupWidth / 2;

          if (left < 20) left = 20;
          if (left + popupWidth > window.innerWidth - 20) {
            left = window.innerWidth - popupWidth - 20;
          }
          if (top < 20) top = 20;
          if (top + popupHeight > window.innerHeight - 20) {
            top = window.innerHeight - popupHeight - 20;
          }

          setPopupPosition({ top, left });
          setPopupArrowPosition(arrowPos);
          isUpdating = false;
        });
      }
    };

    window.addEventListener('scroll', updatePopupPosition, true);
    window.addEventListener('resize', updatePopupPosition);

    return () => {
      window.removeEventListener('scroll', updatePopupPosition, true);
      window.removeEventListener('resize', updatePopupPosition);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [showVocabPopup, clickedWordElement]);

  // Pause media when interacting with vocabulary
  const pauseMedia = useCallback(() => {
    if (typeof window !== 'undefined' && window.mainAudioRef?.current) {
      const audio = window.mainAudioRef.current;
      if (!audio.paused) audio.pause();
    }
    
    if (isYouTube && youtubePlayerRef?.current) {
      const player = youtubePlayerRef.current;
      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        if (player.pauseVideo) player.pauseVideo();
      }
    }
  }, [isYouTube, youtubePlayerRef]);

  // Handle word click for popup
  const handleWordClickForPopup = useCallback(async (word, eventOrElement) => {
    let element = eventOrElement;
    if (eventOrElement && eventOrElement.target) {
      element = eventOrElement.target;
    } else if (!eventOrElement || !(eventOrElement instanceof Element)) {
      console.error('Invalid event/element in handleWordClickForPopup');
      return;
    }

    const cleanedWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    if (!cleanedWord) return;

    // Debounce: prevent duplicate clicks on same word within 300ms
    const now = Date.now();
    if (
      cleanedWord === lastClickedWordRef.current && 
      now - lastClickTimeRef.current < 300
    ) {
      return;
    }
    lastClickedWordRef.current = cleanedWord;
    lastClickTimeRef.current = now;

    pauseMedia();

    // Speak the word
    speakText(cleanedWord);

    const rect = element.getBoundingClientRect();
    const isMobileView = window.innerWidth <= 768;

    if (isMobileView) {
      // Mobile: Show tooltip above word
      const tooltipHeight = 50;
      const tooltipWidth = 200;
      
      let top = rect.top - 10;
      let left = rect.left + rect.width / 2;

      if (top - tooltipHeight < 10) {
        top = rect.bottom + 10 + tooltipHeight;
      }

      const halfWidth = tooltipWidth / 2;
      if (left - halfWidth < 10) left = halfWidth + 10;
      if (left + halfWidth > window.innerWidth - 10) {
        left = window.innerWidth - halfWidth - 10;
      }

      setTooltipWord(cleanedWord);
      setTooltipPosition({ top, left });
      setTooltipTranslation(''); // Reset translation
      setShowTooltip(true);

      // Check cache first
      const targetLang = user?.nativeLanguage || 'vi';
      const cached = translationCache.get(cleanedWord, 'de', targetLang);
      if (cached) {
        setTooltipTranslation(cached);
        return;
      }

      // Cancel pending request if any
      if (pendingRequestRef.current) {
        pendingRequestRef.current.abort();
      }

      // Get current sentence context and translation
      const currentSentence = transcriptData[currentSentenceIndex];
      const context = currentSentence?.text || '';
      const sentenceTranslation = currentSentence?.translation || '';

      // Fetch translation with AbortController
      const abortController = new AbortController();
      pendingRequestRef.current = abortController;

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanedWord,
            context: context,
            sentenceTranslation: sentenceTranslation,
            sourceLang: 'de',
            targetLang: targetLang
          }),
          signal: abortController.signal
        });

        const data = await response.json();
        if (data.success && data.translation) {
          setTooltipTranslation(data.translation);
          translationCache.set(cleanedWord, data.translation, 'de', targetLang);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Translation error:', error);
          setTooltipTranslation('...');
        }
      } finally {
        pendingRequestRef.current = null;
      }
    } else {
      // Desktop: Show full popup
      const popupWidth = 350;
      const popupHeight = 280;
      const gapFromWord = 30;

      const spaceAbove = rect.top;
      let top, left, arrowPos;

      if (spaceAbove >= popupHeight + gapFromWord + 20) {
        top = rect.top - popupHeight - gapFromWord;
        arrowPos = 'bottom';
      } else {
        top = rect.bottom + gapFromWord;
        arrowPos = 'top';
      }

      left = rect.left + rect.width / 2 - popupWidth / 2;
      if (left < 20) left = 20;
      if (left + popupWidth > window.innerWidth - 20) {
        left = window.innerWidth - popupWidth - 20;
      }
      if (top < 20) top = 20;
      if (top + popupHeight > window.innerHeight - 20) {
        top = window.innerHeight - popupHeight - 20;
      }

      // Show popup immediately (loading state handled inside DictionaryPopup)
      setClickedWordElement(element);
      setSelectedWord(cleanedWord);
      setPopupPosition({ top, left });
      setPopupArrowPosition(arrowPos);
      setShowVocabPopup(true);
    }
  }, [pauseMedia, user, transcriptData, currentSentenceIndex]);

  // Save vocabulary to database
  const saveVocabulary = useCallback(async ({ word, translation, notes }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        toast.error(t('lesson.vocabulary.loginRequired'));
        return;
      }

      const context = transcriptData[currentSentenceIndex]?.text || '';

      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          word,
          translation: translation || notes || '',
          context,
          lessonId
        })
      });

      if (response.ok) {
        toast.success(t('lesson.vocabulary.success'));
      } else {
        const error = await response.json();
        toast.error(error.message || t('lesson.vocabulary.error'));
      }
    } catch (error) {
      console.error('Save vocabulary error:', error);
      toast.error(t('lesson.vocabulary.generalError'));
    }
  }, [lessonId, transcriptData, currentSentenceIndex, t]);

  // Close popups
  const closeVocabPopup = useCallback(() => {
    setShowVocabPopup(false);
    setClickedWordElement(null);
  }, []);

  const closeTooltip = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const closeSuggestionPopup = useCallback(() => {
    setShowSuggestionPopup(false);
  }, []);

  // Open suggestion popup for hint
  const openSuggestionPopup = useCallback((word, wordIndex, position) => {
    const context = transcriptData[currentSentenceIndex]?.text || '';
    setSuggestionWord(word);
    setSuggestionWordIndex(wordIndex);
    setSuggestionContext(context);
    setSuggestionPosition(position);
    setShowSuggestionPopup(true);
  }, [transcriptData, currentSentenceIndex]);

  // Get current sentence for context
  const currentSentence = transcriptData[currentSentenceIndex] || null;

  return {
    // Vocab popup
    showVocabPopup,
    selectedWord,
    popupPosition,
    popupArrowPosition,
    handleWordClickForPopup,
    saveVocabulary,
    closeVocabPopup,
    
    // Current sentence context
    currentSentence,
    
    // Mobile tooltip
    showTooltip,
    tooltipWord,
    tooltipTranslation,
    tooltipPosition,
    closeTooltip,
    
    // Suggestion popup
    showSuggestionPopup,
    suggestionWord,
    suggestionWordIndex,
    suggestionContext,
    suggestionPosition,
    openSuggestionPopup,
    closeSuggestionPopup
  };
};

export default useVocabularyPopup;
