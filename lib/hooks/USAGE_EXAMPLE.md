# Hướng dẫn sử dụng Dictation Hooks

## Các hooks đã tạo

### 1. `useDictationPlayer`
Quản lý player (YouTube + HTML5 Audio) thống nhất.

```jsx
import { useDictationPlayer } from '@/lib/hooks';

const MyComponent = () => {
  const {
    currentTime,
    duration,
    isPlaying,
    isYouTube,
    audioRef,
    youtubePlayerRef,
    handleSeek,
    handlePlayPause,
    handleReplayFromStart,
    handleSentenceClick,
    seekToSentence
  } = useDictationPlayer({
    lesson,
    transcriptData,
    currentSentenceIndex,
    autoStop: true,
    onSentenceChange: (index) => setCurrentSentenceIndex(index)
  });

  return (
    <>
      {/* Audio element for non-YouTube */}
      {!isYouTube && <audio ref={audioRef} src={lesson?.audioUrl} />}
      
      {/* YouTube player div */}
      {isYouTube && <div id="youtube-player" />}
      
      {/* Controls */}
      <button onClick={() => handleSeek('backward')}>⏪</button>
      <button onClick={handlePlayPause}>{isPlaying ? '⏸' : '▶'}</button>
      <button onClick={() => handleSeek('forward')}>⏩</button>
    </>
  );
};
```

### 2. `useDictationProgress`
Quản lý progress, points, và completed words.

```jsx
import { useDictationProgress } from '@/lib/hooks';

const MyComponent = () => {
  const {
    completedSentences,
    completedWords,
    progressLoaded,
    progressPercentage,
    updatePoints,
    saveWordCompletion,
    checkSentenceCompletion,
    // Full sentence mode
    fullSentenceInputs,
    handleFullSentenceInputChange,
    handleFullSentenceSubmit
  } = useDictationProgress({
    lessonId,
    transcriptData,
    currentSentenceIndex,
    hidePercentage,
    user,
    loadedProgress,
    t
  });

  return (
    <div>
      <p>Progress: {progressPercentage}%</p>
      <p>Completed: {completedSentences.length}/{transcriptData.length}</p>
    </div>
  );
};
```

### 3. `useSentenceNavigation`
Quản lý navigation giữa các câu.

```jsx
import { useSentenceNavigation } from '@/lib/hooks';

const MyComponent = () => {
  const {
    currentSentenceIndex,
    setCurrentSentenceIndex,
    goToPreviousSentence,
    goToNextSentence,
    canGoNext,
    canGoPrevious,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyDown
  } = useSentenceNavigation({
    transcriptData,
    completedSentences,
    onSentenceClick: handleSentenceClick,
    onSeek: handleSeek,
    onPlayPause: handlePlayPause,
    isYouTube,
    duration,
    audioRef,
    youtubePlayerRef
  });

  // Attach keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button onClick={goToPreviousSentence} disabled={!canGoPrevious}>⬆️</button>
      <span>Sentence {currentSentenceIndex + 1}</span>
      <button onClick={goToNextSentence} disabled={!canGoNext}>⬇️</button>
    </div>
  );
};
```

## Kết hợp tất cả hooks

```jsx
import { 
  useDictationPlayer, 
  useDictationProgress, 
  useSentenceNavigation,
  useStudyTimer 
} from '@/lib/hooks';

const DictationPage = ({ lesson, lessonId }) => {
  // Progress hook
  const progress = useDictationProgress({
    lessonId,
    transcriptData,
    currentSentenceIndex,
    hidePercentage,
    user,
    loadedProgress,
    t
  });

  // Player hook  
  const player = useDictationPlayer({
    lesson,
    transcriptData,
    currentSentenceIndex: progress.currentSentenceIndex,
    autoStop: true,
    onSentenceChange: progress.setCurrentSentenceIndex
  });

  // Navigation hook
  const navigation = useSentenceNavigation({
    transcriptData,
    completedSentences: progress.completedSentences,
    onSentenceClick: player.handleSentenceClick,
    onSeek: player.handleSeek,
    onPlayPause: player.handlePlayPause,
    ...player
  });

  // Timer hook
  const timer = useStudyTimer({
    isPlaying: player.isPlaying,
    user,
    lessonId,
    mode: 'dictation',
    progressLoaded: progress.progressLoaded,
    initialStudyTime: loadedStudyTime
  });

  return (
    <div>
      {/* Video/Audio */}
      <DictationVideoSection {...player} />
      
      {/* Dictation content */}
      <DictationContent 
        {...progress}
        {...navigation}
      />
      
      {/* Timer display */}
      <div>{timer.formatStudyTime(timer.studyTime)}</div>
    </div>
  );
};
```

## Lợi ích của refactor

1. **Giảm dòng code chính**: Từ ~4000 dòng xuống ~1500 dòng
2. **Tái sử dụng**: Hooks có thể dùng cho shadowing mode
3. **Test dễ hơn**: Có thể unit test từng hook riêng
4. **Maintain dễ hơn**: Logic tách biệt, dễ debug
5. **Performance**: Tối ưu re-render với proper dependencies
