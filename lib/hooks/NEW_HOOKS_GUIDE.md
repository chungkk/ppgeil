# New Dictation Hooks Guide

## Overview

7 hooks mới đã được tạo để tách logic từ file `[lessonId].js` (4000+ dòng):

## 1. useVocabularyPopup

Quản lý popup từ vựng và translation.

```jsx
import { useVocabularyPopup } from '@/lib/hooks';

const vocab = useVocabularyPopup({
  user,
  lessonId,
  transcriptData,
  currentSentenceIndex,
  isYouTube,
  youtubePlayerRef,
  audioRef
});

// Sử dụng
vocab.handleWordClickForPopup('word', element);
vocab.saveVocabulary({ word: 'hallo', translation: 'xin chào' });

// State
vocab.showVocabPopup       // boolean
vocab.selectedWord         // string
vocab.popupPosition        // { top, left }
vocab.showTooltip          // mobile tooltip
vocab.tooltipWord
vocab.tooltipTranslation
vocab.showSuggestionPopup  // hint suggestion popup
```

## 2. useWordProcessing

Xử lý fill-in-blanks logic.

```jsx
import { useWordProcessing } from '@/lib/hooks';

const wordProc = useWordProcessing({
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
  t
});

// Window functions (expose cho innerHTML)
window.checkWord = wordProc.checkWord;
window.showHint = (btn, word, idx) => wordProc.showHint(btn, word, idx, vocab.openSuggestionPopup);
window.handleInputFocus = wordProc.handleInputFocus;
window.handleInputBlur = wordProc.handleInputBlur;

// Generate HTML
const html = wordProc.processLevelUp(sentence.text, isCompleted, sentenceWordsCompleted, hidePercentage);

// Mask text cho transcript
const maskedText = wordProc.maskTextByPercentage(text, idx, hidePercent, completedWords, revealedWords);
```

## 3. useFullSentenceMode

Xử lý C1+C2 full sentence mode.

```jsx
import { useFullSentenceMode } from '@/lib/hooks';

const fullSentence = useFullSentenceMode({
  transcriptData,
  completedSentences,
  setCompletedSentences,
  completedWords,
  setCompletedWords,
  saveProgress,
  updatePoints,
  wordPointsProcessed: wordProc.wordPointsProcessed,
  setWordPointsProcessed: wordProc.setWordPointsProcessed
});

// Trong textarea
<textarea
  value={fullSentence.fullSentenceInputs[sentenceIndex] || ''}
  onChange={(e) => {
    fullSentence.handleFullSentenceInputChange(sentenceIndex, e.target.value);
    fullSentence.calculatePartialReveals(sentenceIndex, e.target.value, sentence.text);
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      fullSentence.handleFullSentenceSubmit(sentenceIndex);
    }
  }}
/>

// Word hint boxes
fullSentence.revealedHintWords[sentenceIndex]?.[wordIndex]
fullSentence.wordComparisonResults[sentenceIndex]?.[wordIndex] // 'correct' | 'incorrect'
fullSentence.partialRevealedChars[sentenceIndex]?.[wordIndex]  // số ký tự đã reveal
```

## 4. useLeaderboard

Tracking thống kê cho leaderboard.

```jsx
import { useLeaderboard } from '@/lib/hooks';

// Tự động track khi mount
useLeaderboard({
  user,
  currentSentenceIndex,
  transcriptData
});

// Tự động:
// - Track sentences đã xem
// - Update monthly stats mỗi 5 phút
// - Save stats khi unmount/close tab
```

## 5. useMobileGestures

Xử lý swipe gestures trên mobile.

```jsx
import { useMobileGestures } from '@/lib/hooks';

const isProgrammaticScrollRef = useRef(false);

const gestures = useMobileGestures({
  goToNextSentence,
  goToPreviousSentence,
  isProgrammaticScrollRef
});

// Trong slide
<div
  onTouchStart={gestures.handleTouchStart}
  onTouchMove={gestures.handleTouchMove}
  onTouchEnd={gestures.handleTouchEnd}
>
  {/* content */}
</div>
```

## 6. useKeyboardShortcuts

Xử lý phím tắt.

```jsx
import { useKeyboardShortcuts } from '@/lib/hooks';

const keyboard = useKeyboardShortcuts({
  isYouTube,
  youtubePlayerRef,
  audioRef,
  duration,
  handleSeek,
  handlePlayPause,
  goToPreviousSentence,
  goToNextSentence
});

// Expose for innerHTML inputs
window.disableArrowKeys = keyboard.disableArrowKeys;

// Phím tắt tự động:
// Space     = Play/Pause (khi không focus input)
// ←/→       = Seek ±2s
// ↑/↓       = Previous/Next sentence
```

## 7. usePointsAnimation

Quản lý điểm và animation.

```jsx
import { usePointsAnimation } from '@/lib/hooks';

const points = usePointsAnimation();

// Update điểm
await points.updatePoints(user, 1, 'Correct word: hallo', inputElement);
await points.updatePoints(user, -0.5, 'Wrong attempt', inputElement);

// Render animations
{points.pointsAnimations.map(anim => (
  <PointsAnimation
    key={anim.id}
    points={anim.points}
    startPosition={anim.startPosition}
    endPosition={anim.endPosition}
  />
))}
```

---

## Refactored Component Structure

```jsx
const DictationPage = () => {
  // === CORE STATE ===
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [completedSentences, setCompletedSentences] = useState([]);
  const [completedWords, setCompletedWords] = useState({});
  const [dictationMode, setDictationMode] = useState('fill-blanks');
  const [hidePercentage, setHidePercentage] = useState(30);
  const [processedText, setProcessedText] = useState('');

  // === HOOKS ===
  const points = usePointsAnimation();
  
  const vocab = useVocabularyPopup({...});
  
  const wordProc = useWordProcessing({
    updatePoints: (pts, reason, el) => points.updatePoints(user, pts, reason, el),
    ...
  });
  
  const fullSentence = useFullSentenceMode({
    updatePoints: (pts, reason, el) => points.updatePoints(user, pts, reason, el),
    wordPointsProcessed: wordProc.wordPointsProcessed,
    ...
  });
  
  useLeaderboard({...});
  
  const gestures = useMobileGestures({...});
  
  const keyboard = useKeyboardShortcuts({...});

  // === WINDOW FUNCTIONS ===
  useEffect(() => {
    window.checkWord = wordProc.checkWord;
    window.showHint = (...args) => wordProc.showHint(...args, vocab.openSuggestionPopup);
    window.handleWordClickForPopup = vocab.handleWordClickForPopup;
    window.handleInputFocus = wordProc.handleInputFocus;
    window.handleInputBlur = wordProc.handleInputBlur;
    window.disableArrowKeys = keyboard.disableArrowKeys;
  }, [wordProc, vocab, keyboard]);

  // === RENDER ===
  return (
    <div className={styles.page}>
      {/* Video Section */}
      <DictationVideoSection {...player} />
      
      {/* Dictation Area */}
      {dictationMode === 'fill-blanks' ? (
        <FillBlanksMode
          processedText={processedText}
          {...gestures}
        />
      ) : (
        <FullSentenceMode
          {...fullSentence}
          {...gestures}
        />
      )}
      
      {/* Transcript Panel */}
      <TranscriptPanel
        maskTextByPercentage={wordProc.maskTextByPercentage}
        revealedHintWords={fullSentence.revealedHintWords}
        {...}
      />
      
      {/* Popups */}
      {vocab.showVocabPopup && <DictionaryPopup {...vocab} />}
      {vocab.showTooltip && <WordTooltip {...vocab} />}
      {vocab.showSuggestionPopup && <WordSuggestionPopup {...vocab} />}
      
      {/* Points Animations */}
      {points.pointsAnimations.map(anim => (
        <PointsAnimation key={anim.id} {...anim} />
      ))}
    </div>
  );
};
```

## Lợi ích

| Trước | Sau |
|-------|-----|
| 4000+ dòng trong 1 file | ~800 dòng main + 7 hooks |
| Khó maintain | Dễ debug, tìm lỗi |
| Không test được | Unit test từng hook |
| Copy-paste để reuse | Import hook |
| Slow render | Optimized dependencies |

## File Structure

```
lib/hooks/
├── index.js                  # Export all hooks
├── useVocabularyPopup.js     # 250 lines
├── useWordProcessing.js      # 450 lines
├── useFullSentenceMode.js    # 280 lines
├── useLeaderboard.js         # 80 lines
├── useMobileGestures.js      # 60 lines
├── useKeyboardShortcuts.js   # 80 lines
├── usePointsAnimation.js     # 100 lines
├── useDictationPlayer.js     # (existing)
├── useDictationProgress.js   # (existing)
├── useSentenceNavigation.js  # (existing)
└── useStudyTimer.js          # (existing)
```
