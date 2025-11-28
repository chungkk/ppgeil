import React from 'react';
import styles from '../../styles/shadowingPage.module.css';

const SkeletonPulse = ({ width = '100%', height = '20px', borderRadius = '8px', style = {}, delay = 0, variant = 'default' }) => {
  // Different variants for different skeleton types
  const variants = {
    default: {
      background: 'linear-gradient(110deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.03) 100%)',
      glideBackground: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
    },
    video: {
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.12) 50%, rgba(102, 126, 234, 0.08) 100%)',
      glideBackground: 'linear-gradient(90deg, transparent 0%, rgba(102, 126, 234, 0.15) 50%, transparent 100%)',
    },
    button: {
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.15) 100%)',
      glideBackground: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
    },
    text: {
      background: 'linear-gradient(110deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 100%)',
      glideBackground: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
    },
  };

  const selectedVariant = variants[variant] || variants.default;

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: selectedVariant.background,
        backgroundSize: '300% 100%',
        animation: `skeletonShimmer 2.5s ease-in-out infinite, skeletonPulse 2s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        background: selectedVariant.glideBackground,
        animation: `skeletonGlide 2.5s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
      }} />
    </div>
  );
};

const ShadowingSkeleton = ({ isMobile = false }) => {
  if (isMobile) {
    return (
      <div className={`${styles.page} dark-theme`}>
        <style jsx global>{`
          @keyframes skeletonShimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes skeletonGlide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes skeletonPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          @keyframes skeletonFadeIn {
            from {
              opacity: 0;
              transform: translateY(15px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes skeletonBounceIn {
            0% {
              opacity: 0;
              transform: scale(0.9) translateY(20px);
            }
            60% {
              opacity: 1;
              transform: scale(1.02) translateY(-2px);
            }
            100% {
              transform: scale(1) translateY(0);
            }
          }
          @media (max-width: 768px) {
            .header, footer { display: none !important; }
          }
        `}</style>

        <div className={`${styles.appContainer} ${styles.appContainerOffset}`}>
          <div className={styles.mainContainer}>
            {/* Video Section */}
            <div className={styles.leftSection}>
              <div className={styles.videoSection}>
                <div className={styles.videoContainer}>
                  <div className={styles.videoWrapper} style={{ animation: 'skeletonBounceIn 0.6s ease-out' }}>
                    <SkeletonPulse width="100%" height="100%" borderRadius="0" variant="video" />
                    {/* Fake play icon in center */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 1,
                    }}>
                      <SkeletonPulse width="64px" height="64px" borderRadius="50%" variant="button" delay={300} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcript Section */}
            <div className={styles.transcriptSection}>
              {/* Mobile Controls Bar */}
              <div className={styles.mobileControlsBar} style={{ animation: 'skeletonFadeIn 0.4s ease-out 0.2s both' }}>
                <SkeletonPulse width="80px" height="28px" borderRadius="6px" variant="button" delay={200} />
                <SkeletonPulse width="70px" height="28px" borderRadius="6px" variant="button" delay={250} />
                <SkeletonPulse width="60px" height="28px" borderRadius="6px" variant="button" delay={300} />
              </div>

              {/* Transcript List */}
              <div className={styles.transcriptList}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.transcriptItem}
                    style={{
                      animation: `skeletonFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${350 + i * 80}ms both`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <SkeletonPulse width="32px" height="32px" borderRadius="50%" variant="button" delay={350 + i * 80} />
                      <div style={{ flex: 1 }}>
                        {/* Main text */}
                        <SkeletonPulse
                          width={`${Math.max(70, 95 - i * 5)}%`}
                          height="16px"
                          variant="text"
                          style={{ marginBottom: '8px' }}
                          delay={350 + i * 80 + 30}
                        />
                        {/* Secondary text (IPA or translation) */}
                        <SkeletonPulse
                          width={`${Math.max(50, 75 - i * 4)}%`}
                          height="13px"
                          variant="text"
                          delay={350 + i * 80 + 60}
                        />
                      </div>
                      {/* Bookmark button skeleton */}
                      <SkeletonPulse width="28px" height="28px" borderRadius="6px" delay={350 + i * 80 + 40} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className={styles.startButtonContainer} style={{ animation: 'skeletonFadeIn 0.5s ease-out 0.4s both' }}>
          <SkeletonPulse width="48px" height="48px" borderRadius="12px" variant="button" delay={400} />
          <SkeletonPulse width="48px" height="48px" borderRadius="12px" variant="button" delay={450} />
          <SkeletonPulse width="180px" height="48px" borderRadius="8px" variant="button" style={{ flex: 1, maxWidth: '240px' }} delay={500} />
          <SkeletonPulse width="48px" height="48px" borderRadius="12px" variant="button" delay={550} />
        </div>
      </div>
    );
  }

  // Desktop Skeleton
  return (
    <div className={`${styles.page} dark-theme`}>
      <style jsx global>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes skeletonGlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes skeletonFadeIn {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes skeletonBounceIn {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          60% {
            opacity: 1;
            transform: scale(1.02) translateY(-2px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      <div className={`${styles.appContainer} ${styles.appContainerOffset}`}>
        <div className={styles.mainContainer}>
          {/* Left Section: Video + Controls */}
          <div className={styles.leftSection}>
            {/* Video Section */}
            <div className={styles.videoSection}>
              {/* Video Header */}
              <div className={styles.videoHeader} style={{ animation: 'skeletonFadeIn 0.4s ease-out 0.1s both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <SkeletonPulse width="60px" height="20px" variant="text" delay={100} />
                  <SkeletonPulse width="90px" height="32px" borderRadius="8px" delay={150} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <SkeletonPulse width="100px" height="28px" borderRadius="8px" variant="button" delay={200} />
                  <SkeletonPulse width="70px" height="32px" borderRadius="8px" variant="button" delay={250} />
                </div>
              </div>

              {/* Video Player */}
              <div className={styles.videoContainer}>
                <div className={styles.videoWrapper} style={{ animation: 'skeletonBounceIn 0.6s ease-out 0.2s both' }}>
                  <SkeletonPulse width="100%" height="100%" borderRadius="0" variant="video" />
                  {/* Fake play icon in center */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1,
                  }}>
                    <SkeletonPulse width="80px" height="80px" borderRadius="50%" variant="button" delay={500} />
                  </div>
                </div>
                <div className={styles.videoTimer} style={{ background: 'transparent', animation: 'skeletonFadeIn 0.3s ease-out 0.5s both' }}>
                  <SkeletonPulse width="80px" height="20px" borderRadius="4px" delay={500} />
                </div>
              </div>
            </div>

            {/* Video Controls */}
            <div className={styles.videoControlsSection}>
              {/* Top Row */}
              <div className={styles.videoControlsTopRow} style={{ animation: 'skeletonFadeIn 0.5s ease-out 0.4s both' }}>
                <div className={styles.videoControlButtons}>
                  <SkeletonPulse width="48px" height="48px" borderRadius="12px" variant="button" delay={400} />
                  <SkeletonPulse width="48px" height="48px" borderRadius="12px" variant="button" delay={450} />
                  <SkeletonPulse width="56px" height="56px" borderRadius="12px" variant="button" delay={500} />
                  <SkeletonPulse width="48px" height="48px" borderRadius="12px" variant="button" delay={550} />
                </div>
                <div className={styles.recordingControlsLarge}>
                  <SkeletonPulse width="180px" height="48px" borderRadius="12px" variant="button" delay={600} />
                </div>
              </div>

              {/* Current Sentence Display */}
              <div className={styles.currentSentenceDisplay} style={{ animation: 'skeletonFadeIn 0.5s ease-out 0.5s both' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {[80, 60, 100, 45, 90, 70, 55].map((width, i) => (
                    <SkeletonPulse key={i} width={`${width}px`} height="28px" borderRadius="4px" variant="text" delay={650 + i * 40} />
                  ))}
                </div>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                  <SkeletonPulse width="70%" height="18px" variant="text" delay={900} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Transcript */}
          <div className={styles.transcriptSection}>
            {/* Transcript Header */}
            <div className={styles.transcriptHeader} style={{ animation: 'skeletonFadeIn 0.4s ease-out 0.3s both' }}>
              <SkeletonPulse width="100px" height="20px" variant="text" delay={300} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SkeletonPulse width="120px" height="6px" borderRadius="3px" delay={350} />
                <SkeletonPulse width="40px" height="16px" variant="text" delay={400} />
              </div>
            </div>

            {/* Transcript List */}
            <div className={styles.transcriptList}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={styles.transcriptItem}
                  style={{
                    animation: `skeletonFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${450 + i * 70}ms both`
                  }}
                >
                  {/* Header */}
                  <div className={styles.transcriptItemHeader}>
                    <div className={styles.transcriptNumberWithControls}>
                      <SkeletonPulse width="32px" height="18px" variant="text" delay={450 + i * 70} />
                      <SkeletonPulse width="50px" height="28px" borderRadius="14px" delay={450 + i * 70 + 30} />
                    </div>
                    {/* Bookmark button skeleton */}
                    <SkeletonPulse width="28px" height="28px" borderRadius="6px" delay={450 + i * 70 + 40} />
                  </div>

                  {/* Content */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <SkeletonPulse width="24px" height="24px" borderRadius="50%" variant="button" delay={450 + i * 70 + 60} />
                    <div style={{ flex: 1 }}>
                      {/* Main text line 1 */}
                      <SkeletonPulse
                        width={`${Math.max(75, 95 - i * 3)}%`}
                        height="18px"
                        variant="text"
                        style={{ marginBottom: '8px' }}
                        delay={450 + i * 70 + 80}
                      />
                      {/* IPA line */}
                      <SkeletonPulse
                        width={`${Math.max(60, 70 - i * 2)}%`}
                        height="14px"
                        variant="text"
                        style={{ marginBottom: '6px' }}
                        delay={450 + i * 70 + 110}
                      />
                      {/* Translation line */}
                      <SkeletonPulse
                        width={`${Math.max(65, 80 - i * 2.5)}%`}
                        height="14px"
                        variant="text"
                        delay={450 + i * 70 + 140}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShadowingSkeleton;
