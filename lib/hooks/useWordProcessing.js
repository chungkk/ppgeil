import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { hapticEvents } from '../haptics';

/**
 * Seeded random number generator for deterministic word selection
 */
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Hook for managing word processing in fill-blanks mode
 * Handles word checking, hints, completion tracking, and points
 * 
 * IMPORTANT: This hook exposes functions to window object for dynamic HTML event handlers.
 * The dynamic HTML is generated with onclick/oninput attributes that call window.* functions.
 */
const useWordProcessing = ({
  transcriptData,
  currentSentenceIndex,
  hidePercentage,
  completedSentences,
  setCompletedSentences,
  completedWords,
  setCompletedWords,
  saveProgress,
  updatePoints,
  user,
  t,
  // Optional callbacks for popup integration
  onWordClickForPopup,
  onShowSuggestionPopup,
  showPointsAnimation
}) => {
  // Saved words state
  const [savedWords, setSavedWords] = useState([]);
  
  // Click tracking for double-click hint
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedInput, setLastClickedInput] = useState(null);
  
  // Points tracking - track which words have been scored
  const [wordPointsProcessed, setWordPointsProcessed] = useState({});
  
  // Consecutive sentence completion counter
  const [consecutiveSentences, setConsecutiveSentences] = useState(0);

  // Save word function
  const saveWord = useCallback((word) => {
    setSavedWords(prev => {
      if (!prev.includes(word)) {
        return [...prev, word];
      }
      return prev;
    });
  }, []);

  // Save individual word completion
  const saveWordCompletion = useCallback((wordIndex, correctWord) => {
    setCompletedWords(prevWords => {
      const updatedWords = { ...prevWords };
      
      if (!updatedWords[currentSentenceIndex]) {
        updatedWords[currentSentenceIndex] = {};
      }
      
      updatedWords[currentSentenceIndex][wordIndex] = correctWord;
      
      console.log(`Word saved: sentence ${currentSentenceIndex}, word ${wordIndex}: ${correctWord}`, updatedWords);
      
      saveProgress(completedSentences, updatedWords);
      
      return updatedWords;
    });
  }, [currentSentenceIndex, completedSentences, saveProgress, setCompletedWords]);

  // Check if current sentence is completed
  const checkSentenceCompletion = useCallback(() => {
    setTimeout(() => {
      if (completedSentences.includes(currentSentenceIndex)) {
        return;
      }

      const sentence = transcriptData[currentSentenceIndex];
      if (!sentence) return;

      const words = sentence.text.split(/\s+/);
      
      const validWordIndices = [];
      words.forEach((word, idx) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          validWordIndices.push(idx);
        }
      });

      const totalValidWords = validWordIndices.length;
      const wordsToHideCount = Math.ceil((totalValidWords * hidePercentage) / 100);

      const sentenceContainer = document.querySelector(`[data-sentence-index="${currentSentenceIndex}"]`);
      let completedWordsCount = 0;
      
      if (sentenceContainer) {
        const correctWordSpans = sentenceContainer.querySelectorAll('.correct-word:not(.revealed-word):not(.completed-word)');
        completedWordsCount = correctWordSpans.length;
      } else {
        completedWordsCount = Object.keys(completedWords[currentSentenceIndex] || {}).length;
      }

      console.log(`Checking sentence ${currentSentenceIndex}:`, {
        totalValidWords,
        wordsToHideCount,
        completedWordsCount
      });

      if (completedWordsCount >= wordsToHideCount && wordsToHideCount > 0) {
        const updatedCompleted = [...completedSentences, currentSentenceIndex];
        setCompletedSentences(updatedCompleted);
        saveProgress(updatedCompleted, completedWords);
        console.log(`✅ Sentence ${currentSentenceIndex} completed!`);

        setTimeout(() => {
          if (updatedCompleted.length === transcriptData.length) {
            console.log('🎉 All sentences completed!');
            hapticEvents.lessonComplete();
          }
        }, 400);
      }
    }, 50);
  }, [completedSentences, currentSentenceIndex, completedWords, saveProgress, transcriptData, hidePercentage, setCompletedSentences]);

  // Update input background based on correctness
  const updateInputBackground = useCallback((input, correctWord) => {
    const trimmedValue = input.value.trim();
    if (trimmedValue.toLowerCase() === correctWord.substring(0, trimmedValue.length).toLowerCase()) {
      input.style.setProperty('background', '#10b981', 'important');
      input.style.setProperty('border-color', '#10b981', 'important');
    } else {
      input.style.setProperty('background', '#ef4444', 'important');
      input.style.setProperty('border-color', '#ef4444', 'important');
    }
  }, []);

  // Find next input element
  const findNextInput = useCallback((currentInput) => {
    const allInputs = document.querySelectorAll(".word-input");
    const currentIndex = Array.from(allInputs).indexOf(currentInput);
    return allInputs[currentIndex + 1];
  }, []);

  // Check word function
  const checkWord = useCallback((input, correctWord, wordIndex) => {
    const sanitizedCorrectWord = correctWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    const sanitizedInputValue = input.value.trim();
    
    if (sanitizedInputValue.toLowerCase() === sanitizedCorrectWord.toLowerCase()) {
      hapticEvents.wordCorrect();
      saveWord(correctWord);
      saveWordCompletion(wordIndex, correctWord);
      
      // Award points for correct word
      if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
        updatePoints(1, `Correct word: ${correctWord}`, input);
        setWordPointsProcessed(prev => ({
          ...prev,
          [currentSentenceIndex]: {
            ...(prev[currentSentenceIndex] || {}),
            [wordIndex]: 'correct'
          }
        }));
      }
      
      const wordSpan = document.createElement("span");
      wordSpan.className = "correct-word";
      wordSpan.innerText = correctWord;
      wordSpan.onclick = function() {
        saveWord(correctWord);
      };
      
      // Find next input BEFORE replacing current input
      const nextInput = findNextInput(input);
      
      input.parentNode.replaceWith(wordSpan);
      checkSentenceCompletion();
      
      // Focus immediately without timeout to keep keyboard open on mobile
      if (nextInput) {
        nextInput.focus();
      }
    } else {
      updateInputBackground(input, sanitizedCorrectWord);

      if (sanitizedInputValue.length === sanitizedCorrectWord.length) {
        if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
          hapticEvents.wordIncorrect();
          updatePoints(-0.5, `Incorrect word attempt: ${sanitizedInputValue}`, input);
          setWordPointsProcessed(prev => ({
            ...prev,
            [currentSentenceIndex]: {
              ...(prev[currentSentenceIndex] || {}),
              [wordIndex]: 'incorrect'
            }
          }));
          setConsecutiveSentences(0);
        }
      }
    }
  }, [saveWord, updateInputBackground, checkSentenceCompletion, saveWordCompletion, currentSentenceIndex, wordPointsProcessed, updatePoints, findNextInput]);

  // Handle input click (double-click for hint)
  const handleInputClick = useCallback((input, correctWord) => {
    const currentTime = new Date().getTime();
    
    if (lastClickedInput !== input || currentTime - lastClickTime > 1000) {
      setClickCount(0);
    }
    
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    setLastClickTime(currentTime);
    setLastClickedInput(input);
    
    if (newClickCount === 2) {
      saveWord(correctWord);
      input.focus();
      setClickCount(0);
    }
    
    if (newClickCount === 1) {
      input.focus();
    }
  }, [clickCount, lastClickTime, lastClickedInput, saveWord]);

  // Handle input focus
  const handleInputFocus = useCallback((input, correctWord) => {
    if (input.value === '') {
      input.placeholder = '*'.repeat(correctWord.length);
      input.style.removeProperty('background');
      input.style.removeProperty('border-color');
    }

    setTimeout(() => {
      const isMobileView = window.innerWidth <= 768;
      
      if (isMobileView) {
        const slide = input.closest('.dictationSlide');
        const inputArea = input.closest('.dictationInputArea');
        
        if (slide && inputArea) {
          const inputRect = input.getBoundingClientRect();
          const slideRect = slide.getBoundingClientRect();
          const inputAreaRect = inputArea.getBoundingClientRect();
          
          const inputTop = inputRect.top - slideRect.top;
          const slideHeight = slideRect.height;
          const isInLowerHalf = inputTop > slideHeight / 2;
          
          if (isInLowerHalf) {
            const scrollTop = inputArea.scrollTop + (inputRect.top - inputAreaRect.top) - 80;
            inputArea.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
          }
        }
      } else {
        input.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }, 300);
  }, []);

  // Handle input blur
  const handleInputBlur = useCallback((input, correctWord) => {
    if (input.value === '') {
      input.placeholder = '*'.repeat(correctWord.length);
    }
  }, []);

  // Show hint for a word
  const showHint = useCallback((button, correctWord, wordIndex, openSuggestionPopup) => {
    hapticEvents.wordHintUsed();
    
    if (!user) {
      // If user not logged in, reveal directly
      const container = button.parentElement;
      const input = container.querySelector('.word-input');

      if (input) {
        saveWordCompletion(wordIndex, correctWord);

        if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
          updatePoints(1, `Correct word from hint: ${correctWord}`, button);
          setWordPointsProcessed(prev => ({
            ...prev,
            [currentSentenceIndex]: {
              ...(prev[currentSentenceIndex] || {}),
              [wordIndex]: 'correct'
            }
          }));
        }

        const wordSpan = document.createElement("span");
        wordSpan.className = "correct-word hint-revealed";
        wordSpan.innerText = correctWord;
        wordSpan.onclick = function() {
          if (window.saveWord) window.saveWord(correctWord);
        };

        const punctuation = container.querySelector('.word-punctuation');
        container.innerHTML = '';
        container.appendChild(wordSpan);
        if (punctuation) container.appendChild(punctuation);

        saveWord(correctWord);
        checkSentenceCompletion();
      }
      return;
    }

    // For logged-in users, open suggestion popup
    const rect = button.getBoundingClientRect();
    const isMobileView = window.innerWidth <= 768;
    const popupWidth = isMobileView ? 300 : 280;
    const popupHeight = isMobileView ? 50 : 250;

    let top = rect.top + (rect.height / 2);
    let left;

    const spaceOnRight = window.innerWidth - rect.right;
    const spaceOnLeft = rect.left;

    if (spaceOnRight >= popupWidth + 10) {
      left = rect.right + 5;
    } else if (spaceOnLeft >= popupWidth + 10) {
      left = rect.left - popupWidth - 5;
    } else if (spaceOnRight > spaceOnLeft) {
      left = rect.right + 5;
    } else {
      left = rect.left - popupWidth - 5;
    }

    if (left < 10) left = 10;
    if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }
    if (!isMobileView) {
      if (top + popupHeight > window.innerHeight - 10) {
        top = Math.max(10, window.innerHeight - popupHeight - 10);
      }
      if (top < 10) top = 10;
    }

    openSuggestionPopup(correctWord, wordIndex, { top, left });
  }, [user, saveWord, saveWordCompletion, checkSentenceCompletion, wordPointsProcessed, currentSentenceIndex, updatePoints]);

  // Handle correct suggestion from popup
  const handleCorrectSuggestion = useCallback((correctWord, wordIndex) => {
    const button = document.querySelector(`button[onclick*="showHint"][onclick*="${correctWord}"][onclick*="${wordIndex}"]`);
    if (button) {
      const container = button.parentElement;
      const input = container.querySelector('.word-input');
      
      if (input) {
        saveWordCompletion(wordIndex, correctWord);
        
        if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
          updatePoints(1, `Correct word from hint: ${correctWord}`, button);
          setWordPointsProcessed(prev => ({
            ...prev,
            [currentSentenceIndex]: {
              ...(prev[currentSentenceIndex] || {}),
              [wordIndex]: 'correct'
            }
          }));
        }
        
        const wordSpan = document.createElement("span");
        wordSpan.className = "correct-word hint-revealed";
        wordSpan.innerText = correctWord;
        wordSpan.onclick = function() {
          if (window.saveWord) window.saveWord(correctWord);
        };
        
        const punctuation = container.querySelector('.word-punctuation');
        container.innerHTML = '';
        container.appendChild(wordSpan);
        if (punctuation) container.appendChild(punctuation);
        
        saveWord(correctWord);
        checkSentenceCompletion();
      }
    }
  }, [saveWord, checkSentenceCompletion, saveWordCompletion, wordPointsProcessed, currentSentenceIndex, updatePoints]);

  // Handle wrong suggestion
  const handleWrongSuggestion = useCallback((correctWord, wordIndex, selectedWord, showPointsAnimation) => {
    const wrongButton = document.querySelector('.optionButton.wrongShake') ||
                       document.querySelector('.optionButtonMobile.wrongShake');
    if (wrongButton && showPointsAnimation) {
      showPointsAnimation(-0.5, wrongButton);
    }

    updatePoints(-0.5, `Wrong suggestion selected: ${selectedWord}, correct: ${correctWord}`);
    setConsecutiveSentences(0);
  }, [updatePoints]);

  // Mask text by percentage
  const maskTextByPercentage = useCallback((text, sentenceIdx, hidePercent, sentenceWordsCompleted = {}, revealedWords = {}) => {
    if (hidePercent === 100) {
      const words = text.split(/\s+/);
      const processedWords = words.map((word, wordIndex) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          if (sentenceWordsCompleted[wordIndex]) return word;
          if (revealedWords[wordIndex]) return word;
          return word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, '*');
        }
        return word;
      });
      return processedWords.join(" ");
    }

    const words = text.split(/\s+/);
    const validWordIndices = [];
    words.forEach((word, idx) => {
      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
      if (pureWord.length >= 1) validWordIndices.push(idx);
    });

    const totalValidWords = validWordIndices.length;
    const wordsToHideCount = Math.ceil((totalValidWords * hidePercent) / 100);

    const hiddenWordIndices = new Set();
    const shuffled = [...validWordIndices].sort((a, b) => {
      const seedA = seededRandom(sentenceIdx * 1000 + a);
      const seedB = seededRandom(sentenceIdx * 1000 + b);
      return seedA - seedB;
    });
    for (let i = 0; i < wordsToHideCount; i++) {
      hiddenWordIndices.add(shuffled[i]);
    }

    const processedWords = words.map((word, wordIndex) => {
      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
      if (pureWord.length >= 1) {
        if (sentenceWordsCompleted[wordIndex]) return word;
        if (revealedWords[wordIndex]) return word;
        const shouldHide = hiddenWordIndices.has(wordIndex);
        if (shouldHide) return word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, '*');
        return word;
      }
      return word;
    });

    return processedWords.join(" ");
  }, []);

  // Process level up - generate HTML for dictation input area
  // Uses window.* globals for onclick/oninput handlers (required for dynamic HTML)
  const processLevelUp = useCallback((sentence, isCompleted, sentenceWordsCompleted, hidePercent) => {
    const sentences = sentence.split(/\n+/);

    const processedSentences = sentences.map((sent) => {
      const words = sent.split(/\s+/);

      const validWordIndices = [];
      words.forEach((word, idx) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) validWordIndices.push(idx);
      });

      const totalValidWords = validWordIndices.length;
      const wordsToHideCount = Math.ceil((totalValidWords * hidePercent) / 100);

      const hiddenWordIndices = new Set();
      if (hidePercent < 100) {
        const shuffled = [...validWordIndices].sort((a, b) => {
          const seedA = seededRandom(currentSentenceIndex * 1000 + a);
          const seedB = seededRandom(currentSentenceIndex * 1000 + b);
          return seedA - seedB;
        });
        for (let i = 0; i < wordsToHideCount; i++) {
          hiddenWordIndices.add(shuffled[i]);
        }
      } else {
        validWordIndices.forEach(idx => hiddenWordIndices.add(idx));
      }

      const processedWords = words.map((word, wordIndex) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          const nonAlphaNumeric = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");
          const isWordCompleted = sentenceWordsCompleted && sentenceWordsCompleted[wordIndex];

          if (isCompleted) {
            return `<span class="word-container completed">
              <span class="correct-word completed-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }

          if (isWordCompleted) {
            return `<span class="word-container">
              <span class="correct-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }

          const shouldHide = hiddenWordIndices.has(wordIndex);

          if (shouldHide) {
            const dynamicSize = Math.max(Math.min(pureWord.length, 20), 3);
            const hintLabel = t ? t('lesson.ui.showHint') : 'Show hint';

            // Using window.* globals for onclick/oninput (required for dynamic HTML)
            return `<span class="word-container">
              <button
                class="hint-btn"
                onclick="window.showHint(this, '${pureWord}', ${wordIndex})"
                title="${hintLabel}"
                type="button"
              >
              </button>
               <input
                 type="text"
                 class="word-input"
                 id="word-${wordIndex}"
                 name="word-${wordIndex}"
                 data-word-id="word-${wordIndex}"
                 data-word-length="${pureWord.length}"
                 oninput="window.checkWord?.(this, '${pureWord}', ${wordIndex})"
                 onclick="window.handleInputClick?.(this, '${pureWord}')"
                 onkeydown="window.disableArrowKeys?.(event)"
                 onfocus="window.handleInputFocus?.(this, '${pureWord}')"
                 onblur="window.handleInputBlur?.(this, '${pureWord}')"
                 maxlength="${pureWord.length}"
                 size="${dynamicSize}"
                 placeholder="${'*'.repeat(pureWord.length)}"
                 autocomplete="off"
                 style="width: ${dynamicSize}ch;"
               />
             <span class="word-punctuation">${nonAlphaNumeric}</span>
           </span>`;
          } else {
            return `<span class="word-container">
              <span class="correct-word revealed-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }
        }
        return `<span>${word}</span>`;
      });

      return processedWords.join(" ");
    });

    return processedSentences.join(" ");
  }, [currentSentenceIndex, t]);

  // Render completed sentence with word boxes (for C1+C2 mode)
  const renderCompletedSentenceWithWordBoxes = useCallback((sentence) => {
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    
    return words.map((word, idx) => {
      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
      const punctuation = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");
      
      if (pureWord.length === 0) return null;
      
      // Using data-* attributes for event delegation
      return `<span class="word-container">
        <span class="correct-word completed-word" data-action="word-click" data-word="${pureWord}">${pureWord}</span>
        <span class="word-punctuation">${punctuation}</span>
      </span>`;
    }).filter(Boolean).join(' ');
  }, []);

  // Expose functions to window object for dynamic HTML event handlers
  // This is required because the HTML is generated as strings with onclick/oninput attributes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Core word processing functions
    window.checkWord = checkWord;
    window.handleInputClick = handleInputClick;
    window.handleInputFocus = handleInputFocus;
    window.handleInputBlur = handleInputBlur;
    window.saveWord = saveWord;
    window.showHint = showHint;
    
    // Word click for popup (optional callback from parent)
    if (onWordClickForPopup) {
      window.handleWordClickForPopup = onWordClickForPopup;
    }
    
    // Points animation (optional callback from parent)
    if (showPointsAnimation) {
      window.showPointsAnimation = showPointsAnimation;
    }
    
    // Disable arrow keys in inputs
    window.disableArrowKeys = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    };

    // Cleanup on unmount
    return () => {
      window.checkWord = undefined;
      window.handleInputClick = undefined;
      window.handleInputFocus = undefined;
      window.handleInputBlur = undefined;
      window.saveWord = undefined;
      window.showHint = undefined;
      window.handleWordClickForPopup = undefined;
      window.showPointsAnimation = undefined;
      window.disableArrowKeys = undefined;
    };
  }, [checkWord, handleInputClick, handleInputFocus, handleInputBlur, saveWord, showHint, onWordClickForPopup, showPointsAnimation]);

  return {
    savedWords,
    wordPointsProcessed,
    setWordPointsProcessed,
    consecutiveSentences,
    setConsecutiveSentences,
    saveWord,
    saveWordCompletion,
    checkWord,
    handleInputClick,
    handleInputFocus,
    handleInputBlur,
    showHint,
    handleCorrectSuggestion,
    handleWrongSuggestion,
    checkSentenceCompletion,
    maskTextByPercentage,
    processLevelUp,
    renderCompletedSentenceWithWordBoxes
  };
};

export default useWordProcessing;
