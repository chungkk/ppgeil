import { useState, useCallback, useEffect } from 'react';
import { hapticEvents } from '../haptics';

/**
 * Calculate similarity between two sentences (word-level comparison)
 */
const calculateSimilarity = (userInput, correctSentence) => {
  const normalize = (str) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:"""''„]/g, '')
      .replace(/\s+/g, ' ');
  };

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

  const similarity = (correctCount / correctWords.length) * 100;
  return Math.round(similarity);
};

/**
 * Hook for managing full sentence mode (C1+C2 difficulty)
 * Handles sentence submission, comparison, and scoring
 */
const useFullSentenceMode = ({
  transcriptData,
  completedSentences,
  setCompletedSentences,
  completedWords,
  setCompletedWords,
  saveProgress,
  updatePoints,
  wordPointsProcessed,
  setWordPointsProcessed
}) => {
  // Full sentence input states
  const [fullSentenceInputs, setFullSentenceInputs] = useState({});
  const [sentenceResults, setSentenceResults] = useState({});
  const [revealedHintWords, setRevealedHintWords] = useState({});
  const [wordComparisonResults, setWordComparisonResults] = useState({});
  const [partialRevealedChars, setPartialRevealedChars] = useState({});
  const [checkedSentences, setCheckedSentences] = useState([]);

  // Handle full sentence input change
  const handleFullSentenceInputChange = useCallback((sentenceIndex, value) => {
    setFullSentenceInputs(prev => ({
      ...prev,
      [sentenceIndex]: value
    }));
  }, []);

  // Handle full sentence submission
  const handleFullSentenceSubmit = useCallback((sentenceIndex) => {
    const userInput = fullSentenceInputs[sentenceIndex] || '';
    const correctSentence = transcriptData[sentenceIndex]?.text || '';

    if (!userInput.trim()) return;

    const similarity = calculateSimilarity(userInput, correctSentence);
    const isCorrect = similarity >= 80;

    const normalize = (str) => str.toLowerCase().trim().replace(/[.,!?;:"""''„]/g, '').replace(/\s+/g, ' ');
    const userWords = normalize(userInput).split(' ').filter(w => w.length > 0);
    const correctWords = normalize(correctSentence).split(' ').filter(w => w.length > 0);

    // Build word comparison results
    const wordComparison = {};
    correctWords.forEach((correctWord, idx) => {
      const userWord = userWords[idx] || '';
      wordComparison[idx] = userWord === correctWord ? 'correct' : 'incorrect';
    });

    setSentenceResults(prev => ({
      ...prev,
      [sentenceIndex]: { similarity, isCorrect }
    }));

    setWordComparisonResults(prev => ({
      ...prev,
      [sentenceIndex]: wordComparison
    }));

    // Auto-reveal all hint words
    const revealAllWords = {};
    correctWords.forEach((_, idx) => {
      revealAllWords[idx] = true;
    });
    setRevealedHintWords(prev => ({
      ...prev,
      [sentenceIndex]: revealAllWords
    }));

    setPartialRevealedChars(prev => ({
      ...prev,
      [sentenceIndex]: {}
    }));

    if (!checkedSentences.includes(sentenceIndex)) {
      setCheckedSentences(prev => [...prev, sentenceIndex]);
    }

    if (isCorrect) {
      hapticEvents.wordCorrect();

      if (!completedSentences.includes(sentenceIndex)) {
        const updatedCompleted = [...completedSentences, sentenceIndex];
        setCompletedSentences(updatedCompleted);
        
        const sentenceWords = correctSentence.split(/\s+/).filter(w => {
          const pureWord = w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
          return pureWord.length >= 1;
        });
        
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
  }, [fullSentenceInputs, transcriptData, completedSentences, completedWords, checkedSentences, saveProgress, setCompletedSentences, setCompletedWords]);

  // Handle points for full-sentence mode when word comparison results change
  useEffect(() => {
    if (!transcriptData.length) return;
    
    Object.keys(wordComparisonResults).forEach(sentenceIdx => {
      const sentenceIndex = parseInt(sentenceIdx);
      const comparisonResults = wordComparisonResults[sentenceIndex];
      const sentence = transcriptData[sentenceIndex];
      
      if (!sentence || !comparisonResults) return;
      
      const allWordsProcessed = Object.keys(comparisonResults).every(wordIdx => 
        wordPointsProcessed[sentenceIndex]?.[parseInt(wordIdx)]
      );
      
      if (allWordsProcessed) return;
      
      let correctCount = 0;
      let incorrectCount = 0;
      
      Object.keys(comparisonResults).forEach(wordIdxStr => {
        const wordIdx = parseInt(wordIdxStr);
        if (comparisonResults[wordIdx] === 'correct') {
          correctCount++;
        } else {
          incorrectCount++;
        }
      });
      
      setTimeout(() => {
        const totalPoints = (correctCount * 1) + (incorrectCount * -0.5);
        
        if (totalPoints !== 0) {
          const reason = `Full-sentence: ${correctCount} correct, ${incorrectCount} incorrect (total: ${totalPoints > 0 ? '+' : ''}${totalPoints})`;
          updatePoints(totalPoints, reason, null);
        }
        
        const updatedProcessed = {};
        Object.keys(comparisonResults).forEach(wordIdxStr => {
          const wordIdx = parseInt(wordIdxStr);
          updatedProcessed[wordIdx] = comparisonResults[wordIdx];
        });
        
        setWordPointsProcessed(prev => ({
          ...prev,
          [sentenceIndex]: {
            ...(prev[sentenceIndex] || {}),
            ...updatedProcessed
          }
        }));
      }, 50);
    });
  }, [wordComparisonResults, transcriptData, wordPointsProcessed, updatePoints, setWordPointsProcessed]);

  // Toggle reveal hint word
  const toggleRevealHintWord = useCallback((sentenceIndex, wordIndex) => {
    setRevealedHintWords(prev => {
      const updated = { ...prev };
      if (!updated[sentenceIndex]) {
        updated[sentenceIndex] = {};
      }

      if (updated[sentenceIndex][wordIndex]) {
        const newSentenceState = { ...updated[sentenceIndex] };
        delete newSentenceState[wordIndex];
        updated[sentenceIndex] = newSentenceState;
      } else {
        updated[sentenceIndex] = {
          ...updated[sentenceIndex],
          [wordIndex]: true
        };
        hapticEvents.buttonPress();
      }

      return updated;
    });
  }, []);

  // Calculate partial reveals based on user input - reveals characters as typed
  const calculatePartialReveals = useCallback((sentenceIndex, userInput, correctSentence) => {
    const normalize = (str) => str.toLowerCase().trim().replace(/[.,!?;:"""''„]/g, '');
    const userWords = normalize(userInput).split(/\s+/).filter(w => w.length > 0);
    const correctWords = correctSentence.split(/\s+/).filter(w => w.length > 0).map(w => {
      return w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
    });

    const partialReveals = {};
    const fullyRevealedWords = {};
    const usedUserWordIndices = new Set();

    // For each correct word, find the best matching user word
    correctWords.forEach((correctWord, wordIdx) => {
      const normalizedCorrect = normalize(correctWord);
      let bestMatch = { charCount: 0, userWordIdx: -1 };

      // Check all user words to find the best partial/full match
      userWords.forEach((userWord, userIdx) => {
        if (usedUserWordIndices.has(userIdx)) return;
        
        const normalizedUser = normalize(userWord);
        
        // Exact match - full reveal
        if (normalizedUser === normalizedCorrect) {
          if (correctWord.length > bestMatch.charCount) {
            bestMatch = { charCount: correctWord.length, userWordIdx: userIdx, isExact: true };
          }
          return;
        }
        
        // Partial match - count matching characters from start
        let matchingChars = 0;
        for (let i = 0; i < Math.min(normalizedCorrect.length, normalizedUser.length); i++) {
          if (normalizedCorrect[i] === normalizedUser[i]) {
            matchingChars++;
          } else {
            break;
          }
        }
        
        if (matchingChars > bestMatch.charCount) {
          bestMatch = { charCount: matchingChars, userWordIdx: userIdx, isExact: false };
        }
      });

      if (bestMatch.charCount > 0) {
        partialReveals[wordIdx] = bestMatch.charCount;
        if (bestMatch.userWordIdx >= 0) {
          usedUserWordIndices.add(bestMatch.userWordIdx);
        }
        if (bestMatch.isExact) {
          fullyRevealedWords[wordIdx] = true;
        }
      }
    });

    // Update revealed hint words for fully matched words
    if (Object.keys(fullyRevealedWords).length > 0) {
      setRevealedHintWords(prev => {
        const updated = { ...prev };
        if (!updated[sentenceIndex]) {
          updated[sentenceIndex] = {};
        }
        Object.keys(fullyRevealedWords).forEach(idx => {
          updated[sentenceIndex][idx] = true;
        });
        return updated;
      });
      
      setWordComparisonResults(prev => {
        const updated = { ...prev };
        if (!updated[sentenceIndex]) {
          updated[sentenceIndex] = {};
        }
        Object.keys(fullyRevealedWords).forEach(idx => {
          updated[sentenceIndex][idx] = 'correct';
        });
        return updated;
      });
    }

    setPartialRevealedChars(prev => ({
      ...prev,
      [sentenceIndex]: partialReveals
    }));
  }, []);

  // Reset state for a sentence
  const resetSentenceState = useCallback((sentenceIndex) => {
    setFullSentenceInputs(prev => {
      const updated = { ...prev };
      delete updated[sentenceIndex];
      return updated;
    });
    setSentenceResults(prev => {
      const updated = { ...prev };
      delete updated[sentenceIndex];
      return updated;
    });
    setRevealedHintWords(prev => {
      const updated = { ...prev };
      delete updated[sentenceIndex];
      return updated;
    });
    setWordComparisonResults(prev => {
      const updated = { ...prev };
      delete updated[sentenceIndex];
      return updated;
    });
    setPartialRevealedChars(prev => {
      const updated = { ...prev };
      delete updated[sentenceIndex];
      return updated;
    });
  }, []);

  return {
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
    resetSentenceState
  };
};

export default useFullSentenceMode;
