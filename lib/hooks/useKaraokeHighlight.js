import { useMemo } from 'react';

/**
 * Calculate word timings for karaoke highlight
 * Uses real word timings from Whisper if available, otherwise estimates based on character length
 * IMPROVED: Better fallback estimation and gap handling
 */
export const calculateWordTimings = (text, segmentStart, segmentEnd, realWordTimings = null) => {
  if (!text || segmentStart === undefined || segmentEnd === undefined) {
    return [];
  }

  const words = text.split(/\s+/).filter(w => w);

  // Nếu có wordTimings thật từ Whisper, dùng với smoothing
  if (realWordTimings && realWordTimings.length > 0) {
    // Smooth and validate timings
    return words.map((word, index) => {
      const realTiming = realWordTimings[index];

      if (realTiming) {
        // Ensure timings are within segment bounds
        const start = Math.max(segmentStart, Math.min(realTiming.start, segmentEnd));
        const end = Math.min(segmentEnd, Math.max(realTiming.end, start + 0.05)); // min 50ms per word

        return {
          word,
          index,
          start,
          end,
          confidence: realTiming.confidence || 1.0,
          hasRealTiming: true
        };
      }

      // Interpolate if this word doesn't have timing
      const prevTiming = index > 0 ? realWordTimings[index - 1] : null;
      const nextTiming = realWordTimings.find((t, i) => i > index && t);

      let interpolatedStart, interpolatedEnd;
      if (prevTiming && nextTiming) {
        // Interpolate between prev and next
        const gap = nextTiming.start - prevTiming.end;
        const wordsInGap = realWordTimings.slice(index).findIndex(t => t) + 1;
        const wordDuration = gap / wordsInGap;
        interpolatedStart = prevTiming.end + (index - (realWordTimings.indexOf(prevTiming))) * wordDuration;
        interpolatedEnd = interpolatedStart + wordDuration;
      } else if (prevTiming) {
        interpolatedStart = prevTiming.end;
        interpolatedEnd = Math.min(segmentEnd, prevTiming.end + 0.3);
      } else {
        interpolatedStart = segmentStart;
        interpolatedEnd = Math.min(segmentEnd, segmentStart + 0.3);
      }

      return {
        word,
        index,
        start: interpolatedStart,
        end: interpolatedEnd,
        confidence: 0.5,
        hasRealTiming: false
      };
    });
  }

  // Fallback: Ước tính timing theo số ký tự (cải tiến)
  const segmentDuration = segmentEnd - segmentStart;

  // Calculate total character weight (longer words take more time)
  // Improved: Consider syllable patterns for German
  const wordWeights = words.map(word => {
    const cleanWord = word.replace(/[.,!?;:)([\]{}\"'`„"‚'»«›‹—–-]/g, '');
    // German words: estimate syllables (vowel clusters)
    const vowelGroups = cleanWord.match(/[aeiouäöüAEIOUÄÖÜ]+/g) || [];
    const syllableEstimate = Math.max(vowelGroups.length, 1);
    // Weight = syllables * 1.5 + extra for long words
    const weight = syllableEstimate * 1.5 + (cleanWord.length > 8 ? 1 : 0);
    return Math.max(weight, 1);
  });

  const totalWeight = wordWeights.reduce((sum, w) => sum + w, 0);

  // Calculate timing for each word with minimum duration
  const MIN_WORD_DURATION = 0.1; // 100ms minimum per word
  let currentTime = segmentStart;

  const wordTimings = words.map((word, index) => {
    let wordDuration = (wordWeights[index] / totalWeight) * segmentDuration;
    wordDuration = Math.max(wordDuration, MIN_WORD_DURATION);

    // Don't exceed segment end
    const end = Math.min(currentTime + wordDuration, segmentEnd);

    const timing = {
      word,
      index,
      start: currentTime,
      end: end,
      confidence: 0.6, // Lower confidence for estimated timings
      hasRealTiming: false
    };
    currentTime = end;
    return timing;
  });

  return wordTimings;
};

/**
 * Get the index of the currently active word based on playback time
 * IMPROVED: Added lookahead for smoother transitions
 */
export const getActiveWordIndex = (wordTimings, currentTime, lookaheadMs = 50) => {
  if (!wordTimings || wordTimings.length === 0) return -1;

  // Lookahead: start highlighting slightly before the word begins
  const lookahead = lookaheadMs / 1000;

  for (let i = 0; i < wordTimings.length; i++) {
    const wordStart = wordTimings[i].start - lookahead;
    const wordEnd = wordTimings[i].end;

    if (currentTime >= wordStart && currentTime < wordEnd) {
      return i;
    }
  }

  // Check if before first word
  if (currentTime < wordTimings[0]?.start - lookahead) {
    return -1;
  }

  // If past all words, return last index
  if (currentTime >= wordTimings[wordTimings.length - 1]?.end) {
    return wordTimings.length - 1;
  }

  // Find the closest word (for gaps between words)
  let closestIndex = -1;
  let minDistance = Infinity;
  for (let i = 0; i < wordTimings.length; i++) {
    const midpoint = (wordTimings[i].start + wordTimings[i].end) / 2;
    const distance = Math.abs(currentTime - midpoint);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
};

/**
 * Hook to manage karaoke highlight state
 * IMPROVED: Added confidence awareness and better edge case handling
 */
export const useKaraokeHighlight = (segment, currentTime, isPlaying, isActiveSentence) => {
  // Calculate word timings for current segment
  // Ưu tiên dùng wordTimings thật từ Whisper nếu có trong segment
  const wordTimings = useMemo(() => {
    if (!segment || !isActiveSentence) return [];
    return calculateWordTimings(segment.text, segment.start, segment.end, segment.wordTimings);
  }, [segment?.text, segment?.start, segment?.end, segment?.wordTimings, isActiveSentence]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get active word index with lookahead
  const activeWordIndex = useMemo(() => {
    if (!isPlaying || !isActiveSentence || wordTimings.length === 0) {
      return -1;
    }
    // Lookahead 50ms for smoother visual transition
    return getActiveWordIndex(wordTimings, currentTime, 50);
  }, [wordTimings, currentTime, isPlaying, isActiveSentence]);

  // Calculate progress within current word (0-1)
  const wordProgress = useMemo(() => {
    if (activeWordIndex < 0 || !wordTimings[activeWordIndex]) return 0;

    const word = wordTimings[activeWordIndex];
    const wordDuration = word.end - word.start;
    if (wordDuration <= 0) return 0;

    return Math.min(1, Math.max(0, (currentTime - word.start) / wordDuration));
  }, [wordTimings, activeWordIndex, currentTime]);

  // Get confidence of current word timing
  const currentWordConfidence = useMemo(() => {
    if (activeWordIndex < 0 || !wordTimings[activeWordIndex]) return 1;
    return wordTimings[activeWordIndex].confidence || 1;
  }, [wordTimings, activeWordIndex]);

  return {
    wordTimings,
    activeWordIndex,
    wordProgress,
    currentWordConfidence,
  };
};

export default useKaraokeHighlight;

