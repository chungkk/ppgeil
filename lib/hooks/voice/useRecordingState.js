import { useState, useCallback } from 'react';

/**
 * Default recording state for a sentence
 */
export const DEFAULT_RECORDING_STATE = {
  isRecording: false,
  recordedBlob: null,
  comparisonResult: null,
  isPlaying: false,
  showComparison: false,
  isProcessing: false
};

/**
 * Hook to manage recording states for multiple sentences
 * @returns {Object}
 */
export const useRecordingState = () => {
  const [recordingStates, setRecordingStates] = useState({});

  // Get recording state for a specific sentence
  const getRecordingState = useCallback((sentenceIndex) => {
    return recordingStates[sentenceIndex] || DEFAULT_RECORDING_STATE;
  }, [recordingStates]);

  // Update a specific field for a sentence
  const updateState = useCallback((sentenceIndex, updates) => {
    setRecordingStates(prev => ({
      ...prev,
      [sentenceIndex]: {
        ...prev[sentenceIndex],
        ...updates
      }
    }));
  }, []);

  // Set comparison result for a sentence
  const setComparisonResult = useCallback((sentenceIndex, comparisonResult) => {
    updateState(sentenceIndex, {
      comparisonResult,
      showComparison: true
    });
  }, [updateState]);

  // Handle audio blob recorded
  const handleAudioRecorded = useCallback((sentenceIndex, audioBlob) => {
    updateState(sentenceIndex, { recordedBlob: audioBlob });
  }, [updateState]);

  // Handle recording state change (isRecording, isProcessing)
  const handleRecordingStateChange = useCallback((sentenceIndex, state) => {
    updateState(sentenceIndex, {
      isRecording: state.isRecording,
      isProcessing: state.isProcessing
    });
  }, [updateState]);

  // Set playing state for a sentence
  const setIsPlaying = useCallback((sentenceIndex, isPlaying) => {
    updateState(sentenceIndex, { isPlaying });
  }, [updateState]);

  // Reset all isPlaying states
  const resetAllPlayingStates = useCallback(() => {
    setRecordingStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(key => {
        if (newStates[key].isPlaying) {
          newStates[key] = { ...newStates[key], isPlaying: false };
        }
      });
      return newStates;
    });
  }, []);

  // Clear recording state for a sentence
  const clearRecordingState = useCallback((sentenceIndex) => {
    setRecordingStates(prev => {
      const newStates = { ...prev };
      delete newStates[sentenceIndex];
      return newStates;
    });
  }, []);

  // Clear all recording states
  const clearAllRecordingStates = useCallback(() => {
    setRecordingStates({});
  }, []);

  // Batch update recording states (for loading saved progress)
  const setRecordingStatesFromProgress = useCallback((progressData) => {
    if (!progressData || typeof progressData !== 'object') return;
    setRecordingStates(prev => ({ ...prev, ...progressData }));
  }, []);

  // Get recorded blob for saving
  const getRecordedBlob = useCallback((sentenceIndex) => {
    return recordingStates[sentenceIndex]?.recordedBlob || null;
  }, [recordingStates]);

  return {
    recordingStates,
    getRecordingState,
    getRecordedBlob,
    setComparisonResult,
    handleAudioRecorded,
    handleRecordingStateChange,
    setIsPlaying,
    resetAllPlayingStates,
    clearRecordingState,
    clearAllRecordingStates,
    setRecordingStatesFromProgress,
  };
};

export default useRecordingState;
