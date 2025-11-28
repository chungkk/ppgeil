/**
 * Dictation Utility Functions
 * Shared logic for dictation page
 */

// Map difficulty level to hidePercentage
export const DIFFICULTY_TO_PERCENTAGE = {
  'a1': 10,
  'a2': 30,
  'b1': 30,
  'b2': 60,
  'c1': 100,
  'c2': 100,
  'c1c2': 100
};

export const PERCENTAGE_TO_DIFFICULTY = {
  10: 'a1',
  30: 'b1',
  60: 'b2',
  100: 'c1'
};

/**
 * Calculate similarity between two sentences (word-level comparison)
 */
export const calculateSimilarity = (userInput, correctSentence) => {
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
 * Seeded random number generator for deterministic word selection
 */
export const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Format time in MM:SS format
 */
export const formatTime = (seconds) => {
  if (!isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Format study time to HH:MM:SS
 */
export const formatStudyTime = (totalSeconds) => {
  if (!isFinite(totalSeconds)) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Mask text by percentage - used for transcript display
 */
export const maskTextByPercentage = (text, sentenceIdx, hidePercent, sentenceWordsCompleted = {}, revealedWords = {}) => {
  const words = text.split(/\s+/);

  if (hidePercent === 100) {
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

  const validWordIndices = [];
  words.forEach((word, idx) => {
    const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
    if (pureWord.length >= 1) {
      validWordIndices.push(idx);
    }
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
      if (shouldHide) {
        return word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, '*');
      }
      return word;
    }
    return word;
  });

  return processedWords.join(" ");
};

/**
 * Render completed sentence as word boxes (for C1+C2 mode)
 */
export const renderCompletedSentenceWithWordBoxes = (sentence) => {
  const words = sentence.split(/\s+/).filter(w => w.length > 0);
  
  return words.map((word, idx) => {
    const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
    const punctuation = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");
    
    if (pureWord.length === 0) return null;
    
    return `<span class="word-container">
      <span class="correct-word completed-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
      <span class="word-punctuation">${punctuation}</span>
    </span>`;
  }).filter(Boolean).join(' ');
};

/**
 * Generate processed text with inputs for fill-blanks mode
 */
export const processLevelUp = (
  sentence, 
  isCompleted, 
  sentenceWordsCompleted, 
  hidePercent, 
  currentSentenceIndex, 
  t
) => {
  const sentences = sentence.split(/\n+/);

  const processedSentences = sentences.map((sentence) => {
    const words = sentence.split(/\s+/);

    const validWordIndices = [];
    words.forEach((word, idx) => {
      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
      if (pureWord.length >= 1) {
        validWordIndices.push(idx);
      }
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
};

/**
 * Calculate progress percentage based on completed words
 */
export const calculateProgressPercentage = (transcriptData, completedWords) => {
  if (!transcriptData || transcriptData.length === 0) return 0;

  let totalWords = 0;
  let completedWordsCount = 0;

  transcriptData.forEach((segment, sentenceIndex) => {
    const words = segment.text.split(/\s+/);
    const validWords = words.filter(word => {
      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
      return pureWord.length >= 1;
    });

    totalWords += validWords.length;

    const sentenceWordsCompleted = completedWords[sentenceIndex] || {};
    const completedCount = Object.keys(sentenceWordsCompleted).filter(
      wordIdx => sentenceWordsCompleted[wordIdx]
    ).length;

    completedWordsCount += completedCount;
  });

  return totalWords > 0 ? Math.round((completedWordsCount / totalWords) * 100) : 0;
};
