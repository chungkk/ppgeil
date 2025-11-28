import { useMemo } from 'react';

/**
 * Calculate word timings for karaoke highlight
 * Estimates word timing based on character length within sentence duration
 */
export const calculateWordTimings = (text, segmentStart, segmentEnd) => {
  if (!text || segmentStart === undefined || segmentEnd === undefined) {
    return [];
  }

  const words = text.split(/\s+/);
  const segmentDuration = segmentEnd - segmentStart;
  
  // Calculate total character weight (longer words take more time)
  const wordWeights = words.map(word => {
    const cleanWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    // Minimum weight of 1 for punctuation-only tokens
    return Math.max(cleanWord.length, 1);
  });
  
  const totalWeight = wordWeights.reduce((sum, w) => sum + w, 0);
  
  // Calculate timing for each word
  let currentTime = segmentStart;
  const wordTimings = words.map((word, index) => {
    const wordDuration = (wordWeights[index] / totalWeight) * segmentDuration;
    const timing = {
      word,
      index,
      start: currentTime,
      end: currentTime + wordDuration,
    };
    currentTime += wordDuration;
    return timing;
  });

  return wordTimings;
};

/**
 * Get the index of the currently active word based on playback time
 */
export const getActiveWordIndex = (wordTimings, currentTime) => {
  if (!wordTimings || wordTimings.length === 0) return -1;
  
  for (let i = 0; i < wordTimings.length; i++) {
    if (currentTime >= wordTimings[i].start && currentTime < wordTimings[i].end) {
      return i;
    }
  }
  
  // If past all words, return last index
  if (currentTime >= wordTimings[wordTimings.length - 1]?.end) {
    return wordTimings.length - 1;
  }
  
  return -1;
};

/**
 * Hook to manage karaoke highlight state
 */
export const useKaraokeHighlight = (segment, currentTime, isPlaying, isActiveSentence) => {
  // Calculate word timings for current segment
  const wordTimings = useMemo(() => {
    if (!segment || !isActiveSentence) return [];
    return calculateWordTimings(segment.text, segment.start, segment.end);
  }, [segment?.text, segment?.start, segment?.end, isActiveSentence]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get active word index
  const activeWordIndex = useMemo(() => {
    if (!isPlaying || !isActiveSentence || wordTimings.length === 0) {
      return -1;
    }
    return getActiveWordIndex(wordTimings, currentTime);
  }, [wordTimings, currentTime, isPlaying, isActiveSentence]);

  // Calculate progress within current word (0-1)
  const wordProgress = useMemo(() => {
    if (activeWordIndex < 0 || !wordTimings[activeWordIndex]) return 0;
    
    const word = wordTimings[activeWordIndex];
    const wordDuration = word.end - word.start;
    if (wordDuration <= 0) return 0;
    
    return Math.min(1, Math.max(0, (currentTime - word.start) / wordDuration));
  }, [wordTimings, activeWordIndex, currentTime]);

  return {
    wordTimings,
    activeWordIndex,
    wordProgress,
  };
};

export default useKaraokeHighlight;
