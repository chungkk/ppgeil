import { useCallback } from 'react';
import { useRecordingState } from './voice/useRecordingState';
import { useAudioPlayback } from './voice/useAudioPlayback';

/**
 * Custom hook to manage voice recording states and playback
 * Composed from smaller, single-responsibility hooks:
 * - useRecordingState: Manages recording states for multiple sentences
 * - useAudioPlayback: Handles audio blob playback
 * 
 * @returns {Object}
 */
export const useVoiceRecording = () => {
  // 1. Recording state management
  const {
    recordingStates,
    getRecordingState,
    getRecordedBlob,
    setComparisonResult,
    handleAudioRecorded,
    handleRecordingStateChange,
    setIsPlaying,
    resetAllPlayingStates,
    clearRecordingState: clearState,
    clearAllRecordingStates: clearAllStates,
    setRecordingStatesFromProgress,
  } = useRecordingState();

  // 2. Audio playback with callbacks to update state
  const { playAudioBlob, stopPlayback } = useAudioPlayback({
    onPlayStart: (sentenceIndex) => setIsPlaying(sentenceIndex, true),
    onPlayEnd: (sentenceIndex) => setIsPlaying(sentenceIndex, false),
    onPlayError: (sentenceIndex) => setIsPlaying(sentenceIndex, false),
  });

  // Play/stop recorded audio for a sentence
  const playRecordedAudio = useCallback((sentenceIndex) => {
    const blob = recordingStates[sentenceIndex]?.recordedBlob;
    if (!blob) return;

    const didPlay = playAudioBlob(blob, sentenceIndex);
    if (!didPlay) {
      // Was already playing, stopped now - reset all playing states
      resetAllPlayingStates();
    }
  }, [recordingStates, playAudioBlob, resetAllPlayingStates]);

  // Clear recording state for a sentence (also stop playback)
  const clearRecordingState = useCallback((sentenceIndex) => {
    stopPlayback();
    clearState(sentenceIndex);
  }, [stopPlayback, clearState]);

  // Clear all recording states (also stop playback)
  const clearAllRecordingStates = useCallback(() => {
    stopPlayback();
    clearAllStates();
  }, [stopPlayback, clearAllStates]);

  return {
    // State
    recordingStates,
    
    // Handlers
    handleAudioRecorded,
    handleRecordingStateChange,
    playRecordedAudio,
    setComparisonResult,
    
    // Utilities
    getRecordingState,
    getRecordedBlob,
    clearRecordingState,
    clearAllRecordingStates,
    setRecordingStatesFromProgress
  };
};

export default useVoiceRecording;
