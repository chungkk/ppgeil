import { useState, useCallback } from 'react';
import { hapticEvents } from '../haptics';

/**
 * Hook for managing word suggestion popup
 * Used in dictation mode to show 3-word choices for each hidden word
 */
const useSuggestionPopup = ({ transcriptData, onSetCurrentSentenceIndex }) => {
  // Suggestion popup states
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const [suggestionWord, setSuggestionWord] = useState('');
  const [suggestionWordIndex, setSuggestionWordIndex] = useState(null);
  const [suggestionContext, setSuggestionContext] = useState('');
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const [suggestionOptions, setSuggestionOptions] = useState(null);

  /**
   * Generate 3 word suggestions from transcript data (1 correct + 2 similar wrong words)
   * Uses local data for instant display without API calls
   * Prioritizes words that look similar to the correct word (harder to guess)
   */
  const generateLocalSuggestions = useCallback((correctWord) => {
    if (!transcriptData || transcriptData.length === 0) {
      return [correctWord];
    }

    const correctWordLower = correctWord.toLowerCase();
    const correctWordLength = correctWord.length;
    const firstChar = correctWordLower[0];
    const firstTwoChars = correctWordLower.substring(0, 2);
    
    // Calculate similarity score between two words (higher = more similar)
    const calculateSimilarity = (word) => {
      const wordLower = word.toLowerCase();
      let score = 0;
      
      // Same first letter: +30 points
      if (wordLower[0] === firstChar) score += 30;
      
      // Same first two letters: +20 points
      if (wordLower.substring(0, 2) === firstTwoChars) score += 20;
      
      // Similar length (±1): +15 points, (±2): +5 points
      const lengthDiff = Math.abs(word.length - correctWordLength);
      if (lengthDiff === 0) score += 15;
      else if (lengthDiff === 1) score += 10;
      else if (lengthDiff === 2) score += 5;
      
      // Same ending (last 2 chars): +15 points
      if (wordLower.slice(-2) === correctWordLower.slice(-2)) score += 15;
      
      // Count common characters
      const correctChars = new Set(correctWordLower.split(''));
      const wordChars = new Set(wordLower.split(''));
      let commonChars = 0;
      correctChars.forEach(char => {
        if (wordChars.has(char)) commonChars++;
      });
      score += commonChars * 2;
      
      // Add small random factor to vary results (0-10)
      score += Math.random() * 10;
      
      return score;
    };
    
    // Collect all unique words from transcript
    const allWords = new Set();
    transcriptData.forEach(sentence => {
      const words = sentence.text.split(/\s+/);
      words.forEach(word => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 2 && pureWord.toLowerCase() !== correctWordLower) {
          allWords.add(pureWord);
        }
      });
    });

    // Convert to array and calculate similarity scores
    let candidates = Array.from(allWords).map(word => ({
      word,
      score: calculateSimilarity(word)
    }));

    // Sort by similarity score (highest first = most similar)
    candidates.sort((a, b) => b.score - a.score);

    // Pick top 2 most similar words (but add some randomness from top 5)
    const topCandidates = candidates.slice(0, Math.min(5, candidates.length));
    
    // Shuffle top candidates slightly
    for (let i = topCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topCandidates[i], topCandidates[j]] = [topCandidates[j], topCandidates[i]];
    }
    
    const wrongWords = topCandidates.slice(0, 2).map(c => c.word);

    // Create options array with correct word and wrong words
    const options = [correctWord, ...wrongWords];

    // Shuffle options so correct word isn't always first
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return options;
  }, [transcriptData]);

  /**
   * Show word suggestion popup when clicking on hint word box
   */
  const showHintWordSuggestion = useCallback((sentenceIndex, wordIndex, correctWord, event) => {
    hapticEvents.buttonPress();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const isMobileView = window.innerWidth <= 768;
    
    // Popup size - horizontal layout with 3 buttons
    const popupWidth = isMobileView ? 240 : 280;
    const popupHeight = 50;
    const gap = 8;
    
    // Calculate word center position
    const wordCenterX = rect.left + (rect.width / 2);
    
    // Center popup horizontally on the word
    let left = wordCenterX - (popupWidth / 2);
    
    // Position popup above the word
    let top = rect.top - popupHeight - gap;
    
    // If not enough space above, show below
    if (top < 10) {
      top = rect.bottom + gap;
    }
    
    // Keep within horizontal screen bounds
    if (left < 10) left = 10;
    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }
    
    // Final bounds check
    if (top < 10) top = 10;
    if (top + popupHeight > window.innerHeight - 10) {
      top = window.innerHeight - popupHeight - 10;
    }
    
    // Generate options
    const localOptions = generateLocalSuggestions(correctWord);
    
    setSuggestionWord(correctWord);
    setSuggestionWordIndex(wordIndex);
    setSuggestionContext(transcriptData[sentenceIndex]?.text || '');
    setSuggestionPosition({ top, left });
    setSuggestionOptions(localOptions);
    
    // Update current sentence index in parent
    if (onSetCurrentSentenceIndex) {
      onSetCurrentSentenceIndex(sentenceIndex);
    }
    
    setShowSuggestionPopup(true);
  }, [transcriptData, generateLocalSuggestions, onSetCurrentSentenceIndex]);

  // Close popup
  const closeSuggestionPopup = useCallback(() => {
    setShowSuggestionPopup(false);
  }, []);

  return {
    // State
    showSuggestionPopup,
    suggestionWord,
    suggestionWordIndex,
    suggestionContext,
    suggestionPosition,
    suggestionOptions,
    
    // Actions
    showHintWordSuggestion,
    closeSuggestionPopup,
    generateLocalSuggestions
  };
};

export default useSuggestionPopup;
