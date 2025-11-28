import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { hapticEvents } from '../haptics';

/**
 * Custom hook for dictation progress tracking
 * Handles completed sentences, words, points, and progress saving
 */
export const useDictationProgress = ({
  lessonId,
  transcriptData,
  currentSentenceIndex,
  hidePercentage,
  user,
  loadedProgress,
  loadedStudyTime,
  t
}) => {
  // Progress state
  const [completedSentences, setCompletedSentences] = useState([]);
  const [completedWords, setCompletedWords] = useState({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  
  // Points tracking
  const [wordPointsProcessed, setWordPointsProcessed] = useState({});
  const [pointsAnimations, setPointsAnimations] = useState([]);
  const [consecutiveSentences, setConsecutiveSentences] = useState(0);
  
  // Full sentence mode states
  const [fullSentenceInputs, setFullSentenceInputs] = useState({});
  const [sentenceResults, setSentenceResults] = useState({});
  const [revealedHintWords, setRevealedHintWords] = useState({});
  const [wordComparisonResults, setWordComparisonResults] = useState({});
  const [partialRevealedChars, setPartialRevealedChars] = useState({});
  const [checkedSentences, setCheckedSentences] = useState([]);
  
  // Track if jumped to first incomplete
  const hasJumpedToIncomplete = useRef(false);

  // Load progress from SWR
  useEffect(() => {
    if (loadedProgress !== undefined) {
      const loadedSentences = loadedProgress.completedSentences || [];
      const loadedWords = loadedProgress.completedWords || {};

      // Normalize keys to numbers
      const normalizedWords = {};
      Object.keys(loadedWords).forEach(sentenceIdx => {
        const numIdx = parseInt(sentenceIdx);
        normalizedWords[numIdx] = {};
        Object.keys(loadedWords[sentenceIdx]).forEach(wordIdx => {
          const numWordIdx = parseInt(wordIdx);
          normalizedWords[numIdx][numWordIdx] = loadedWords[sentenceIdx][wordIdx];
        });
      });

      setCompletedSentences(loadedSentences);
      setCompletedWords(normalizedWords);
      setProgressLoaded(true);
    }
  }, [loadedProgress]);

  // Save progress to database
  const saveProgress = useCallback(async (updatedCompletedSentences, updatedCompletedWords) => {
    if (!lessonId) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const totalWords = transcriptData.reduce((sum, sentence) => {
        const words = sentence.text.split(/\s+/).filter(w => 
          w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1
        );
        return sum + words.length;
      }, 0);
      
      let correctWordsCount = 0;
      Object.keys(updatedCompletedWords).forEach(sentenceIdx => {
        correctWordsCount += Object.keys(updatedCompletedWords[sentenceIdx]).length;
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          mode: 'dictation',
          progress: {
            completedSentences: updatedCompletedSentences,
            completedWords: updatedCompletedWords,
            currentSentenceIndex,
            totalSentences: transcriptData.length,
            correctWords: correctWordsCount,
            totalWords
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Progress saved:', { 
          completedSentences: updatedCompletedSentences.length, 
          correctWordsCount, 
          totalWords
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error saving progress:', error);
      }
    }
  }, [lessonId, transcriptData, currentSentenceIndex]);

  // Save word completion
  const saveWordCompletion = useCallback((wordIndex, correctWord) => {
    setCompletedWords(prevWords => {
      const updatedWords = { ...prevWords };
      if (!updatedWords[currentSentenceIndex]) {
        updatedWords[currentSentenceIndex] = {};
      }
      updatedWords[currentSentenceIndex][wordIndex] = correctWord;
      saveProgress(completedSentences, updatedWords);
      return updatedWords;
    });
  }, [currentSentenceIndex, completedSentences, saveProgress]);

  // Show points animation
  const showPointsAnimation = useCallback((points, element) => {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const startPosition = {
      top: rect.top + rect.height / 2 - 10,
      left: rect.left + rect.width / 2
    };
    
    const headerBadge = document.querySelector('[title="Your total points"]');
    let endPosition = headerBadge 
      ? {
          top: headerBadge.getBoundingClientRect().top + headerBadge.getBoundingClientRect().height / 2,
          left: headerBadge.getBoundingClientRect().left + headerBadge.getBoundingClientRect().width / 2
        }
      : { top: startPosition.top - 100, left: startPosition.left };
    
    const animationId = Date.now() + Math.random();
    setPointsAnimations(prev => [...prev, { id: animationId, points, startPosition, endPosition }]);
    
    setTimeout(() => {
      setPointsAnimations(prev => prev.filter(a => a.id !== animationId));
    }, 1000);
  }, []);

  // Update points
  const updatePoints = useCallback(async (pointsChange, reason, element = null) => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('/api/user/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pointsChange, reason })
      });
      
      if (response.ok) {
        console.log(`✅ Points updated: ${pointsChange > 0 ? '+' : ''}${pointsChange} (${reason})`);
        if (element) showPointsAnimation(pointsChange, element);

        if (typeof window !== 'undefined') {
          if (pointsChange > 0 && window.showPointsPlusOne) {
            window.showPointsPlusOne(pointsChange);
          }
          if (pointsChange < 0 && window.showPointsMinus) {
            window.showPointsMinus(pointsChange);
          }
          setTimeout(() => window.refreshUserPoints?.(), 100);
          window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { pointsChange, reason } }));
        }
      }
    } catch (error) {
      console.error('Error updating points:', error);
    }
  }, [user, showPointsAnimation]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (!transcriptData || transcriptData.length === 0) return 0;

    let totalWords = 0;
    let completedWordsCount = 0;

    transcriptData.forEach((segment, sentenceIndex) => {
      const words = segment.text.split(/\s+/);
      const validWords = words.filter(word => 
        word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1
      );
      totalWords += validWords.length;

      const sentenceWordsCompleted = completedWords[sentenceIndex] || {};
      completedWordsCount += Object.keys(sentenceWordsCompleted).filter(
        wordIdx => sentenceWordsCompleted[wordIdx]
      ).length;
    });

    return totalWords > 0 ? Math.round((completedWordsCount / totalWords) * 100) : 0;
  }, [transcriptData, completedWords]);

  // Check sentence completion
  const checkSentenceCompletion = useCallback(() => {
    setTimeout(() => {
      if (completedSentences.includes(currentSentenceIndex)) return;

      const sentence = transcriptData[currentSentenceIndex];
      if (!sentence) return;

      const words = sentence.text.split(/\s+/);
      const validWordIndices = [];
      words.forEach((word, idx) => {
        if (word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1) {
          validWordIndices.push(idx);
        }
      });

      const totalValidWords = validWordIndices.length;
      const wordsToHideCount = Math.ceil((totalValidWords * hidePercentage) / 100);

      // Count from DOM
      const sentenceContainer = document.querySelector(`[data-sentence-index="${currentSentenceIndex}"]`);
      let completedWordsCount = 0;
      
      if (sentenceContainer) {
        const correctWordSpans = sentenceContainer.querySelectorAll('.correct-word:not(.revealed-word):not(.completed-word)');
        completedWordsCount = correctWordSpans.length;
      } else {
        completedWordsCount = Object.keys(completedWords[currentSentenceIndex] || {}).length;
      }

      if (completedWordsCount >= wordsToHideCount && wordsToHideCount > 0) {
        const updatedCompleted = [...completedSentences, currentSentenceIndex];
        setCompletedSentences(updatedCompleted);
        saveProgress(updatedCompleted, completedWords);
        
        setConsecutiveSentences(prev => prev + 1);

        setTimeout(() => {
          if (updatedCompleted.length === transcriptData.length) {
            hapticEvents.lessonComplete();
            if (t) {
              const { toast } = require('react-toastify');
              toast.success(t('lesson.completion.allCompleted'));
            }
          }
        }, 400);
      }
    }, 50);
  }, [completedSentences, currentSentenceIndex, completedWords, saveProgress, transcriptData, hidePercentage, t]);

  // Toggle reveal hint word (for full sentence mode)
  const toggleRevealHintWord = useCallback((sentenceIndex, wordIndex) => {
    setRevealedHintWords(prev => {
      const updated = { ...prev };
      if (!updated[sentenceIndex]) updated[sentenceIndex] = {};

      if (updated[sentenceIndex][wordIndex]) {
        const newState = { ...updated[sentenceIndex] };
        delete newState[wordIndex];
        updated[sentenceIndex] = newState;
      } else {
        updated[sentenceIndex] = { ...updated[sentenceIndex], [wordIndex]: true };
        hapticEvents.buttonPress();
      }
      return updated;
    });
  }, []);

  // Calculate partial reveals
  const calculatePartialReveals = useCallback((sentenceIndex, userInput, correctSentence) => {
    const normalize = (str) => str.toLowerCase().trim().replace(/[.,!?;:"""''„]/g, '');
    const userWords = normalize(userInput).split(/\s+/).filter(w => w.length > 0);
    const correctWords = correctSentence.split(/\s+/).filter(w => w.length > 0).map(w => 
      w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "")
    );

    const partialReveals = {};
    correctWords.forEach((correctWord, wordIdx) => {
      const userWord = userWords[wordIdx] || '';
      const normalizedCorrect = normalize(correctWord);
      const normalizedUser = normalize(userWord);

      let matchingChars = 0;
      for (let i = 0; i < Math.min(normalizedCorrect.length, normalizedUser.length); i++) {
        if (normalizedCorrect[i] === normalizedUser[i]) {
          matchingChars++;
        } else break;
      }

      if (matchingChars > 0) partialReveals[wordIdx] = matchingChars;
    });

    setPartialRevealedChars(prev => ({ ...prev, [sentenceIndex]: partialReveals }));
  }, []);

  // Handle full sentence input change
  const handleFullSentenceInputChange = useCallback((sentenceIndex, value) => {
    setFullSentenceInputs(prev => ({ ...prev, [sentenceIndex]: value }));
  }, []);

  // Calculate similarity for full sentence mode
  const calculateSimilarity = useCallback((userInput, correctSentence) => {
    const normalize = (str) => str.toLowerCase().trim()
      .replace(/[.,!?;:"""''„]/g, '')
      .replace(/\s+/g, ' ');

    const normalizedInput = normalize(userInput);
    const normalizedCorrect = normalize(correctSentence);

    const userWords = normalizedInput.split(' ').filter(w => w.length > 0);
    const correctWords = normalizedCorrect.split(' ').filter(w => w.length > 0);

    if (correctWords.length === 0) return 0;

    let correctCount = 0;
    const correctWordsCopy = [...correctWords];

    userWords.forEach(userWord => {
      const index = correctWordsCopy.indexOf(userWord);
      if (index !== -1) {
        correctCount++;
        correctWordsCopy.splice(index, 1);
      }
    });

    return Math.round((correctCount / correctWords.length) * 100);
  }, []);

  // Handle full sentence submit
  const handleFullSentenceSubmit = useCallback((sentenceIndex) => {
    const userInput = fullSentenceInputs[sentenceIndex] || '';
    const correctSentence = transcriptData[sentenceIndex]?.text || '';

    if (!userInput.trim()) return;

    const similarity = calculateSimilarity(userInput, correctSentence);
    const isCorrect = similarity >= 80;

    // Compare word by word
    const normalize = (str) => str.toLowerCase().trim().replace(/[.,!?;:"""''„]/g, '').replace(/\s+/g, ' ');
    const userWords = normalize(userInput).split(' ').filter(w => w.length > 0);
    const correctWords = normalize(correctSentence).split(' ').filter(w => w.length > 0);

    const wordComparison = {};
    correctWords.forEach((correctWord, idx) => {
      const userWord = userWords[idx] || '';
      wordComparison[idx] = userWord === correctWord ? 'correct' : 'incorrect';
    });

    setSentenceResults(prev => ({ ...prev, [sentenceIndex]: { similarity, isCorrect } }));
    setWordComparisonResults(prev => ({ ...prev, [sentenceIndex]: wordComparison }));

    // Reveal all words
    const revealAllWords = {};
    correctWords.forEach((_, idx) => { revealAllWords[idx] = true; });
    setRevealedHintWords(prev => ({ ...prev, [sentenceIndex]: revealAllWords }));
    setPartialRevealedChars(prev => ({ ...prev, [sentenceIndex]: {} }));

    if (!checkedSentences.includes(sentenceIndex)) {
      setCheckedSentences(prev => [...prev, sentenceIndex]);
    }

    if (isCorrect) {
      hapticEvents.wordCorrect();
      if (!completedSentences.includes(sentenceIndex)) {
        const updatedCompleted = [...completedSentences, sentenceIndex];
        setCompletedSentences(updatedCompleted);
        
        const sentenceWords = correctSentence.split(/\s+/).filter(w => 
          w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1
        );
        
        const updatedCompletedWords = { ...completedWords };
        updatedCompletedWords[sentenceIndex] = {};
        sentenceWords.forEach((word, idx) => {
          updatedCompletedWords[sentenceIndex][idx] = word;
        });
        setCompletedWords(updatedCompletedWords);
        saveProgress(updatedCompleted, updatedCompletedWords);
      }
    } else {
      hapticEvents.wordIncorrect();
    }
  }, [fullSentenceInputs, transcriptData, completedSentences, completedWords, checkedSentences, saveProgress, calculateSimilarity]);

  return {
    // Progress state
    completedSentences,
    setCompletedSentences,
    completedWords,
    setCompletedWords,
    progressLoaded,
    progressPercentage,
    
    // Points
    wordPointsProcessed,
    setWordPointsProcessed,
    pointsAnimations,
    consecutiveSentences,
    setConsecutiveSentences,
    updatePoints,
    showPointsAnimation,
    
    // Full sentence mode
    fullSentenceInputs,
    sentenceResults,
    revealedHintWords,
    wordComparisonResults,
    partialRevealedChars,
    checkedSentences,
    handleFullSentenceInputChange,
    handleFullSentenceSubmit,
    toggleRevealHintWord,
    calculatePartialReveals,
    
    // Actions
    saveProgress,
    saveWordCompletion,
    checkSentenceCompletion,
    hasJumpedToIncomplete
  };
};

export default useDictationProgress;
