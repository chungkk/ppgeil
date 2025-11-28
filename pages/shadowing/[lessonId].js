import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import { useShadowingLogic } from '../../lib/hooks/useShadowingLogic';
import ShadowingSkeleton from '../../components/shadowing/ShadowingSkeleton';
import { ErrorState } from '../../components/shadowing/ShadowingStates';
import ErrorBoundary from '../../components/ErrorBoundary';
import styles from '../../styles/shadowingPage.module.css';

// Code splitting for heavy components
const ShadowingDesktop = dynamic(
  () => import('../../components/shadowing/ShadowingDesktop'),
  {
    loading: () => <ShadowingSkeleton isMobile={false} />,
    ssr: true // Enable SSR for better SEO
  }
);

const ShadowingMobile = dynamic(
  () => import('../../components/shadowing/ShadowingMobile'),
  {
    loading: () => <ShadowingSkeleton isMobile={true} />,
    ssr: true
  }
);

const ShadowingPageContent = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [isMobileForSkeleton, setIsMobileForSkeleton] = useState(false);
  
  // Check mobile for skeleton before hook is ready
  useEffect(() => {
    const checkMobile = () => setIsMobileForSkeleton(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const shadowingLogic = useShadowingLogic();
  
  const {
    lessonId,
    lesson,
    loading,
    transcriptData,
    currentTime,
    duration,
    isPlaying,
    currentSentenceIndex,
    autoStop,
    setAutoStop,
    showIPA,
    setShowIPA,
    showTranslation,
    setShowTranslation,
    playbackSpeed,
    setPlaybackSpeed,
    showVocabPopup,
    setShowVocabPopup,
    selectedWord,
    popupPosition,
    popupArrowPosition,
    clickedWordElement,
    setClickedWordElement,
    showWordLoading,
    loadingPosition,
    showTooltip,
    setShowTooltip,
    tooltipWord,
    tooltipTranslation,
    tooltipPosition,
    isMobile,
    isClientReady,
    recordingStates,
    sentenceProgressData,
    studyTime,
    isYouTube,
    user,
    audioRef,
    youtubePlayerRef,
    playerContainerRef,
    activeTranscriptItemRef,
    transcriptListRef,
    handleSentenceClick,
    goToPreviousSentence,
    goToNextSentence,
    handleWordClickForPopup,
    handleVoiceTranscript,
    handleAudioRecorded,
    handleRecordingStateChange,
    playRecordedAudio,
    handleSeek,
    handlePlayPause,
    handleProgressClick,
    formatTime,
    formatStudyTime,
    saveVocabulary,
    // Bookmarks
    bookmarkCount,
    showOnlyBookmarked,
    setShowOnlyBookmarked,
    toggleBookmark,
    isBookmarked,
    filteredTranscriptData,
  } = shadowingLogic;

  const handleBackToHome = () => {
    router.push('/');
  };

  if (loading || !isClientReady) {
    return <ShadowingSkeleton isMobile={isMobileForSkeleton} />;
  }

  if (!lesson) {
    return (
      <ErrorState 
        errorType="notFound"
        lessonId={lessonId}
        onBack={handleBackToHome}
      />
    );
  }

  // Common props for both Desktop and Mobile
  const commonProps = {
    lesson,
    lessonId,
    transcriptData,
    currentTime,
    duration,
    isPlaying,
    currentSentenceIndex,
    autoStop,
    setAutoStop,
    showIPA,
    showTranslation,
    setShowTranslation,
    recordingStates,
    sentenceProgressData,
    studyTime,
    isYouTube,
    audioRef,
    youtubePlayerRef,
    playerContainerRef,
    activeTranscriptItemRef,
    transcriptListRef,
    handleSentenceClick,
    goToPreviousSentence,
    goToNextSentence,
    handleWordClickForPopup,
    handleVoiceTranscript,
    handleAudioRecorded,
    handleRecordingStateChange,
    playRecordedAudio,
    handlePlayPause,
    formatTime,
    // Bookmarks
    bookmarkCount,
    showOnlyBookmarked,
    setShowOnlyBookmarked,
    toggleBookmark,
    isBookmarked,
    filteredTranscriptData,
  };

  // Render Mobile or Desktop based on isMobile state
  if (isMobile) {
    return (
      <ShadowingMobile
        {...commonProps}
        playbackSpeed={playbackSpeed}
        setPlaybackSpeed={setPlaybackSpeed}
        showTooltip={showTooltip}
        setShowTooltip={setShowTooltip}
        tooltipTranslation={tooltipTranslation}
        tooltipPosition={tooltipPosition}
      />
    );
  }

  return (
    <ShadowingDesktop
      {...commonProps}
      playbackSpeed={playbackSpeed}
      setPlaybackSpeed={setPlaybackSpeed}
      showVocabPopup={showVocabPopup}
      setShowVocabPopup={setShowVocabPopup}
      selectedWord={selectedWord}
      popupPosition={popupPosition}
      popupArrowPosition={popupArrowPosition}
      clickedWordElement={clickedWordElement}
      setClickedWordElement={setClickedWordElement}
      showWordLoading={showWordLoading}
      loadingPosition={loadingPosition}
      playRecordedAudio={playRecordedAudio}
      handleSeek={handleSeek}
      formatStudyTime={formatStudyTime}
    />
  );
};

const ShadowingPage = () => {
  return (
    <ErrorBoundary>
      <ShadowingPageContent />
    </ErrorBoundary>
  );
};

export default ShadowingPage;
