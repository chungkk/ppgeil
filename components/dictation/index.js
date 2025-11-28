/**
 * Dictation Components Index
 * Export all dictation-related components for easy importing
 * 
 * CSS Architecture:
 * Each component imports from modular CSS files:
 * - layoutStyles: dictationPage.module.css (base layout)
 * - videoStyles: dictation/dictationVideo.module.css
 * - inputStyles: dictation/dictationInput.module.css
 * - transcriptStyles: dictation/dictationTranscript.module.css
 * - fullSentenceStyles: dictation/dictationFullSentence.module.css
 * - mobileStyles: dictation/dictationMobile.module.css
 * 
 * Pattern: const styles = { ...layoutStyles, ...componentStyles };
 * This allows component-specific styles to override layout styles.
 */

export { default as DictationHeader } from './DictationHeader';
export { default as DictationVideoSection } from './DictationVideoSection';
export { default as TranscriptPanel } from './TranscriptPanel';
export { default as MobileBottomControls } from './MobileBottomControls';
export { default as FullSentenceMode } from './FullSentenceMode';
export { default as FillBlanksMode } from './FillBlanksMode';
export { default as DictationSkeleton } from './DictationSkeleton';
