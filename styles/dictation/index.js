/**
 * Dictation Styles Index
 * 
 * Component-level CSS modules for the dictation page.
 * Import individual modules as needed to optimize bundle size.
 * 
 * Usage:
 * import { videoStyles, inputStyles } from '@/styles/dictation';
 * 
 * Or import specific module:
 * import videoStyles from '@/styles/dictation/dictationVideo.module.css';
 */

// Video Section
export { default as videoStyles } from './dictationVideo.module.css';

// Input Area (word inputs, hint buttons, etc.)
export { default as inputStyles } from './dictationInput.module.css';

// Transcript Panel
export { default as transcriptStyles } from './dictationTranscript.module.css';

// Full Sentence Mode
export { default as fullSentenceStyles } from './dictationFullSentence.module.css';

// Mobile Controls & Slides
export { default as mobileStyles } from './dictationMobile.module.css';

/**
 * CSS Architecture:
 * 
 * Original file: dictationPage.module.css (4300+ lines)
 * 
 * Refactored into:
 * - dictationVideo.module.css (~250 lines) - Video player, controls, timer
 * - dictationInput.module.css (~350 lines) - Word inputs, hint buttons, correct/completed words
 * - dictationTranscript.module.css (~200 lines) - Transcript panel, progress bar
 * - dictationFullSentence.module.css (~400 lines) - Full sentence mode, hint word boxes
 * - dictationMobile.module.css (~300 lines) - Mobile controls, slides, swipe animations
 * 
 * Total: ~1500 lines (reduced from 4300+)
 * 
 * Note: The original dictationPage.module.css is still required for:
 * - Layout styles (page, pageContainer, mainContent, sections)
 * - Light theme styles
 * - Complex responsive media queries
 * - Animation keyframes
 * 
 * Migration Guide:
 * 1. Keep using dictationPage.module.css for layout
 * 2. Import component-specific styles where needed:
 *    - DictationVideoSection → videoStyles
 *    - FillBlanksMode → inputStyles
 *    - FullSentenceMode → fullSentenceStyles
 *    - TranscriptPanel → transcriptStyles
 *    - MobileBottomControls → mobileStyles
 * 
 * Example:
 * ```jsx
 * import styles from '@/styles/dictationPage.module.css';
 * import { inputStyles, fullSentenceStyles } from '@/styles/dictation';
 * 
 * // Use styles.page for layout
 * // Use inputStyles.dictationInputArea for input area
 * // Use fullSentenceStyles.fullSentenceMode for full sentence
 * ```
 */
