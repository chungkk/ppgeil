import React from 'react';
import styles from '../../styles/shadowingPage.module.css';

/**
 * ShadowingSkeleton - Retro style loading skeleton for shadowing page
 * 
 * Features:
 * - Neo-retro design with bold borders and box shadows
 * - Staggered animations for visual hierarchy
 * - Content-aware sizing for shadowing-specific layout
 * - Separate mobile/desktop layouts
 */

const RetroSkeletonPulse = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '8px', 
  delay = 0,
  variant = 'default',
  style = {} 
}) => {
  const variantStyles = {
    default: {
      background: 'linear-gradient(90deg, var(--retro-cream, #FFF8E7) 0%, rgba(255, 107, 107, 0.2) 50%, var(--retro-cream, #FFF8E7) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e)',
    },
    video: {
      background: 'linear-gradient(90deg, #2d3436 0%, #4a5156 50%, #2d3436 100%)',
      border: '3px solid var(--retro-border, #1a1a2e)',
      boxShadow: '4px 4px 0 var(--retro-shadow, #1a1a2e)',
    },
    button: {
      background: 'linear-gradient(90deg, var(--retro-cyan, #4ECDC4) 0%, var(--retro-yellow, #FFE66D) 50%, var(--retro-cyan, #4ECDC4) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e)',
    },
    text: {
      background: 'linear-gradient(90deg, rgba(255, 248, 231, 0.3) 0%, rgba(255, 248, 231, 0.6) 50%, rgba(255, 248, 231, 0.3) 100%)',
      border: '2px solid rgba(26, 26, 46, 0.3)',
      boxShadow: '2px 2px 0 rgba(26, 26, 46, 0.15)',
    },
    accent: {
      background: 'linear-gradient(90deg, var(--retro-coral, #FF6B6B) 0%, var(--retro-yellow, #FFE66D) 50%, var(--retro-coral, #FF6B6B) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e)',
    },
    neon: {
      background: 'linear-gradient(90deg, var(--retro-pink, #FF8ED4) 0%, var(--retro-purple, #A855F7) 50%, var(--retro-pink, #FF8ED4) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e), 0 0 12px rgba(168, 85, 247, 0.3)',
    },
    karaoke: {
      background: 'linear-gradient(90deg, var(--retro-yellow, #FFE66D) 0%, var(--retro-coral, #FF6B6B) 50%, var(--retro-yellow, #FFE66D) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e)',
    }
  };

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundSize: '200% 100%',
        animation: `retroShadowingLoading 1.2s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
        ...variantStyles[variant],
        ...style
      }}
    />
  );
};

const ShadowingSkeleton = ({ isMobile = false }) => {
  const globalStyles = `
    @keyframes retroShadowingLoading {
      0% { 
        background-position: 200% 0;
        transform: scale(1);
      }
      50% {
        transform: scale(1.005);
      }
      100% { 
        background-position: -200% 0;
        transform: scale(1);
      }
    }
    @keyframes retroShadowingFadeIn {
      from {
        opacity: 0;
        transform: translateY(15px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @media (max-width: 768px) {
      .header, footer { display: none !important; }
    }
  `;

  if (isMobile) {
    return (
      <div className={styles.page}>
        <style jsx global>{globalStyles}</style>

        <div className={styles.pageContainer}>
          <div className={styles.mainContent}>
            {/* Mobile Video Section */}
            <div className={styles.leftSection} style={{ animation: 'retroShadowingFadeIn 0.3s ease-out' }}>
              <div className={styles.videoWrapper}>
                <div className={styles.videoContainer} style={{
                  border: '3px solid var(--retro-border, #1a1a2e)',
                  borderRadius: '16px',
                  boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {/* Rainbow top border */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, var(--retro-yellow, #FFE66D), var(--retro-coral, #FF6B6B), var(--retro-pink, #FF8ED4), var(--retro-cyan, #4ECDC4))',
                    zIndex: 2
                  }} />
                  <div className={styles.videoPlayerWrapper}>
                    <RetroSkeletonPulse width="100%" height="100%" borderRadius="0" variant="video" />
                    {/* Play button overlay */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 2
                    }}>
                      <RetroSkeletonPulse width="64px" height="64px" borderRadius="50%" variant="karaoke" delay={200} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Shadowing Section - Karaoke text */}
            <div className={styles.middleSection} style={{ animation: 'retroShadowingFadeIn 0.4s ease-out 0.1s both' }}>
              {/* Header Skeleton */}
              <div className={styles.dictationHeader} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '14px 18px',
                background: 'var(--retro-cream, #FFF8E7)',
                borderBottom: '3px solid var(--retro-border, #1a1a2e)'
              }}>
                <RetroSkeletonPulse width="120px" height="22px" delay={150} variant="karaoke" />
                <RetroSkeletonPulse width="90px" height="32px" borderRadius="16px" delay={200} variant="neon" />
              </div>

              {/* Karaoke Text Area - Different from dictation */}
              <div className={styles.dictationContainer} style={{
                background: 'var(--retro-cream, #FFF8E7)',
                border: '3px solid var(--retro-border, #1a1a2e)',
                borderRadius: '16px',
                boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)'
              }}>
                <div style={{ 
                  padding: '24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Karaoke text lines skeleton */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                    <RetroSkeletonPulse width="90%" height="28px" borderRadius="14px" delay={250} variant="karaoke" />
                    <RetroSkeletonPulse width="75%" height="28px" borderRadius="14px" delay={300} variant="text" />
                  </div>
                  
                  {/* Recording indicator */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    marginTop: '16px'
                  }}>
                    <RetroSkeletonPulse width="20px" height="20px" borderRadius="50%" delay={400} variant="accent" />
                    <RetroSkeletonPulse width="100px" height="16px" delay={450} variant="text" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Controls Skeleton */}
        <div className={styles.mobileBottomControls} style={{ 
          animation: 'retroShadowingFadeIn 0.4s ease-out 0.2s both',
          background: 'var(--retro-cream, #FFF8E7)',
          borderTop: '3px solid var(--retro-border, #1a1a2e)',
          boxShadow: '0 -4px 0 var(--retro-shadow, #1a1a2e)'
        }}>
          <RetroSkeletonPulse width="100%" height="48px" borderRadius="24px" delay={400} variant="button" style={{ flex: 1 }} />
          <RetroSkeletonPulse width="100%" height="48px" borderRadius="24px" delay={450} variant="karaoke" style={{ flex: 1 }} />
          <RetroSkeletonPulse width="100%" height="48px" borderRadius="24px" delay={500} variant="neon" style={{ flex: 1 }} />
          <RetroSkeletonPulse width="100%" height="48px" borderRadius="24px" delay={550} variant="accent" style={{ flex: 1 }} />
        </div>
      </div>
    );
  }

  // Desktop skeleton
  return (
    <div className={styles.page}>
      <style jsx global>{globalStyles}</style>

      <div className={styles.pageContainer}>
        <div className={styles.mainContent}>
          {/* Left Column - Video Skeleton */}
          <div className={styles.leftSection} style={{ animation: 'retroShadowingFadeIn 0.3s ease-out' }}>
            {/* Video Header */}
            <div className={styles.videoHeader} style={{
              background: 'var(--retro-cream, #FFF8E7)',
              padding: '14px 18px',
              borderRadius: '14px 14px 0 0',
              border: '3px solid var(--retro-border, #1a1a2e)',
              borderBottom: 'none',
              boxShadow: '4px 0 0 var(--retro-shadow, #1a1a2e)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <RetroSkeletonPulse width="80px" height="22px" variant="karaoke" />
                <RetroSkeletonPulse width="110px" height="32px" borderRadius="16px" delay={100} variant="accent" />
              </div>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <RetroSkeletonPulse width="100px" height="26px" borderRadius="13px" delay={150} variant="text" />
                <RetroSkeletonPulse width="90px" height="36px" borderRadius="18px" delay={200} variant="neon" />
              </div>
            </div>

            <div className={styles.videoWrapper}>
              <div className={styles.videoContainer} style={{
                border: '3px solid var(--retro-border, #1a1a2e)',
                borderRadius: '0 0 16px 16px',
                boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div className={styles.videoPlayerWrapper}>
                  <RetroSkeletonPulse width="100%" height="100%" borderRadius="0" variant="video" />
                  {/* Play button overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2
                  }}>
                    <RetroSkeletonPulse width="64px" height="64px" borderRadius="50%" variant="karaoke" delay={300} />
                  </div>
                  {/* Speed indicator */}
                  <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                    <RetroSkeletonPulse width="70px" height="28px" borderRadius="14px" delay={350} variant="accent" />
                  </div>
                </div>
              </div>

              {/* Video Controls */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '10px', 
                padding: '18px',
                background: 'var(--retro-cream, #FFF8E7)',
                borderTop: '3px solid var(--retro-border, #1a1a2e)',
                borderRadius: '0 0 14px 14px'
              }}>
                <RetroSkeletonPulse width="44px" height="44px" borderRadius="50%" delay={400} variant="button" />
                <RetroSkeletonPulse width="44px" height="44px" borderRadius="50%" delay={450} variant="accent" />
                <RetroSkeletonPulse width="60px" height="60px" borderRadius="50%" delay={500} variant="karaoke" />
                <RetroSkeletonPulse width="44px" height="44px" borderRadius="50%" delay={550} variant="accent" />
                <RetroSkeletonPulse width="44px" height="44px" borderRadius="50%" delay={600} variant="neon" />
              </div>

              <div className={styles.videoTitleBox} style={{
                background: 'var(--retro-cream, #FFF8E7)',
                padding: '14px 18px',
                borderRadius: '14px',
                border: '3px solid var(--retro-border, #1a1a2e)',
                boxShadow: '4px 4px 0 var(--retro-shadow, #1a1a2e)',
                marginTop: '14px'
              }}>
                <RetroSkeletonPulse width="65%" height="20px" delay={650} variant="text" />
              </div>
            </div>
          </div>

          {/* Middle Column - Shadowing/Karaoke Skeleton */}
          <div className={styles.middleSection} style={{ animation: 'retroShadowingFadeIn 0.4s ease-out 0.1s both' }}>
            {/* Header */}
            <div className={styles.dictationHeader} style={{
              background: 'var(--retro-cream, #FFF8E7)',
              padding: '14px 18px',
              borderRadius: '14px 14px 0 0',
              border: '3px solid var(--retro-border, #1a1a2e)',
              borderBottom: 'none'
            }}>
              <RetroSkeletonPulse width="140px" height="20px" delay={200} variant="karaoke" />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <RetroSkeletonPulse width="36px" height="36px" borderRadius="50%" delay={250} variant="accent" />
                <RetroSkeletonPulse width="90px" height="32px" borderRadius="16px" delay={300} variant="neon" />
              </div>
            </div>

            <div className={styles.dictationContainer} style={{
              background: 'var(--retro-cream, #FFF8E7)',
              border: '3px solid var(--retro-border, #1a1a2e)',
              borderRadius: '0 0 16px 16px',
              boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)'
            }}>
              {/* Karaoke text area */}
              <div style={{ 
                padding: '32px',
                display: 'flex', 
                flexDirection: 'column',
                gap: '24px',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1
              }}>
                {/* Main karaoke text */}
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <RetroSkeletonPulse width="85%" height="36px" borderRadius="18px" delay={350} variant="karaoke" style={{ margin: '0 auto 16px' }} />
                  <RetroSkeletonPulse width="70%" height="28px" borderRadius="14px" delay={400} variant="text" style={{ margin: '0 auto' }} />
                </div>
                
                {/* Recording status */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  padding: '14px 24px',
                  background: 'rgba(78, 205, 196, 0.1)',
                  borderRadius: '30px',
                  border: '2px solid rgba(26, 26, 46, 0.2)'
                }}>
                  <RetroSkeletonPulse width="24px" height="24px" borderRadius="50%" delay={500} variant="accent" />
                  <RetroSkeletonPulse width="120px" height="18px" delay={550} variant="text" />
                </div>
              </div>

              {/* Action buttons */}
              <div className={styles.dictationActions} style={{ 
                display: 'flex', 
                gap: '14px', 
                padding: '18px',
                borderTop: '3px solid var(--retro-border, #1a1a2e)'
              }}>
                <RetroSkeletonPulse width="100%" height="52px" borderRadius="26px" delay={600} variant="button" style={{ flex: 1 }} />
                <RetroSkeletonPulse width="100%" height="52px" borderRadius="26px" delay={650} variant="karaoke" style={{ flex: 1 }} />
                <RetroSkeletonPulse width="100%" height="52px" borderRadius="26px" delay={700} variant="neon" style={{ flex: 1 }} />
              </div>
            </div>
          </div>

          {/* Right Column - Transcript Skeleton */}
          <div className={styles.rightSection} style={{ animation: 'retroShadowingFadeIn 0.5s ease-out 0.2s both' }}>
            <div className={styles.transcriptHeader} style={{
              background: 'var(--retro-cream, #FFF8E7)',
              padding: '14px 18px',
              borderRadius: '14px 14px 0 0',
              border: '3px solid var(--retro-border, #1a1a2e)',
              borderBottom: 'none'
            }}>
              <RetroSkeletonPulse width="100px" height="18px" delay={400} variant="text" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RetroSkeletonPulse width="100px" height="8px" borderRadius="4px" delay={450} variant="karaoke" />
                <RetroSkeletonPulse width="45px" height="16px" delay={500} variant="text" />
              </div>
            </div>

            <div className={styles.transcriptSection} style={{
              background: 'var(--retro-cream, #FFF8E7)',
              border: '3px solid var(--retro-border, #1a1a2e)',
              borderRadius: '0 0 16px 16px',
              boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)'
            }}>
              <div className={styles.transcriptList}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={styles.transcriptItem} 
                    style={{ 
                      opacity: 1 - i * 0.1,
                      animation: `retroShadowingFadeIn 0.3s ease-out ${0.3 + i * 0.08}s both`,
                      padding: '14px 18px',
                      borderBottom: i < 5 ? '2px solid rgba(26, 26, 46, 0.2)' : 'none'
                    }}
                  >
                    <div className={styles.transcriptItemNumber}>
                      <RetroSkeletonPulse width="28px" height="16px" delay={550 + i * 60} variant="karaoke" borderRadius="8px" />
                    </div>
                    <div className={styles.transcriptItemText} style={{ paddingLeft: '32px' }}>
                      <RetroSkeletonPulse width={`${90 - i * 6}%`} height="16px" delay={600 + i * 60} style={{ marginBottom: '8px' }} />
                      <RetroSkeletonPulse width={`${70 - i * 5}%`} height="14px" delay={650 + i * 60} variant="text" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShadowingSkeleton;
