// Hooks Index - Export all custom hooks

// Dictation hooks
export { useDictationPlayer } from './useDictationPlayer';
export { useDictationProgress } from './useDictationProgress';
export { useSentenceNavigation } from './useSentenceNavigation';

// Dictation Feature hooks (NEW)
export { default as useVocabularyPopup } from './useVocabularyPopup';
export { default as useWordProcessing } from './useWordProcessing';
export { default as useFullSentenceMode } from './useFullSentenceMode';
export { default as useSuggestionPopup } from './useSuggestionPopup';
export { default as useLeaderboard } from './useLeaderboard';
export { default as useMobileGestures } from './useMobileGestures';
export { default as useKeyboardShortcuts } from './useKeyboardShortcuts';
export { default as usePointsAnimation } from './usePointsAnimation';
export { default as useWindowGlobals } from './useWindowGlobals';

// Study & Progress hooks
export { useStudyTimer } from './useStudyTimer';
export { useYouTubePlayer } from './useYouTubePlayer';

// Data hooks
export { useLessonData } from './useLessonData';
export { useLessons } from './useLessons';
export { useProgress } from './useProgress';

// Speech hooks
export { useSpeechRecognition } from './useSpeechRecognition';
