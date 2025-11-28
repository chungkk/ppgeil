import React from 'react';
import layoutStyles from '../../styles/dictationPage.module.css';
import videoStyles from '../../styles/dictation/dictationVideo.module.css';
import inputStyles from '../../styles/dictation/dictationInput.module.css';
import mobileStyles from '../../styles/dictation/dictationMobile.module.css';

// Merge all styles
const styles = { ...layoutStyles, ...videoStyles, ...inputStyles, ...mobileStyles };

/**
 * DictationSkeleton - Optimized loading skeleton for dictation page
 * 
 * Features:
 * - Staggered animations for visual hierarchy
 * - Content-aware sizing (matches actual content layout)
 * - Smooth shimmer effect with CSS variables
 * - Separate mobile/desktop layouts
 */

const SkeletonPulse = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '8px', 
  delay = 0,
  variant = 'default', // 'default' | 'video' | 'button' | 'text'
  style = {} 
}) => {
  const variantStyles = {
    default: {
      background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)',
    },
    video: {
      background: 'linear-gradient(90deg, #1a1a2e 0%, #252542 50%, #1a1a2e 100%)',
    },
    button: {
      background: 'linear-gradient(90deg, rgba(102,126,234,0.1) 0%, rgba(102,126,234,0.2) 50%, rgba(102,126,234,0.1) 100%)',
    },
    text: {
      background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
    }
  };

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundSize: '200% 100%',
        animation: `skeletonLoading 1.5s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
        ...variantStyles[variant],
        ...style
      }}
    />
  );
};

const DictationSkeleton = ({ isMobile = false }) => {
  if (isMobile) {
    return (
      <div className={styles.page}>
        <style jsx global>{`
          @keyframes skeletonLoading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @media (max-width: 768px) {
            .header, footer { display: none !important; }
          }
        `}</style>

        <div className={styles.pageContainer}>
          <div className={styles.mainContent}>
            {/* Mobile Video Section - Appears first */}
            <div className={styles.leftSection} style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <div className={styles.videoWrapper}>
                <div className={styles.videoContainer}>
                  <div className={styles.videoPlayerWrapper}>
                    <SkeletonPulse width="100%" height="100%" borderRadius="0" variant="video" />
                    {/* Play button overlay skeleton */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 2
                    }}>
                      <SkeletonPulse width="60px" height="60px" borderRadius="50%" variant="button" delay={200} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Dictation Section - Appears with delay */}
            <div className={styles.middleSection} style={{ animation: 'fadeInUp 0.4s ease-out 0.1s both' }}>
              {/* Header Skeleton */}
              <div className={styles.dictationHeader} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}>
                <SkeletonPulse width="100px" height="20px" delay={150} variant="text" />
                <SkeletonPulse width="70px" height="28px" borderRadius="6px" delay={200} variant="button" />
              </div>

              {/* Slide Skeleton - Content-aware word boxes */}
              <div className={styles.dictationContainer}>
                <div style={{ 
                  padding: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Word boxes skeleton - simulating real word lengths */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', maxWidth: '100%' }}>
                    {[45, 70, 55, 90, 40, 65, 50, 80].map((width, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <SkeletonPulse width="18px" height="18px" borderRadius="50%" delay={250 + i * 30} variant="button" />
                        <SkeletonPulse width={`${width}px`} height="44px" borderRadius="10px" delay={300 + i * 30} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', maxWidth: '100%' }}>
                    {[60, 85, 45, 75, 55].map((width, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <SkeletonPulse width="18px" height="18px" borderRadius="50%" delay={500 + i * 30} variant="button" />
                        <SkeletonPulse width={`${width}px`} height="44px" borderRadius="10px" delay={550 + i * 30} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Controls Skeleton - Glass effect */}
        <div className={styles.mobileBottomControls} style={{ animation: 'fadeInUp 0.4s ease-out 0.2s both' }}>
          <SkeletonPulse width="100%" height="44px" borderRadius="14px" delay={400} variant="button" style={{ flex: 1 }} />
          <SkeletonPulse width="100%" height="44px" borderRadius="14px" delay={450} variant="button" style={{ flex: 1 }} />
          <SkeletonPulse width="100%" height="44px" borderRadius="14px" delay={500} variant="button" style={{ flex: 1 }} />
          <SkeletonPulse width="100%" height="44px" borderRadius="14px" delay={550} variant="button" style={{ flex: 1 }} />
        </div>
      </div>
    );
  }

  // Desktop skeleton
  return (
    <div className={styles.page}>
      <style jsx global>{`
        @keyframes skeletonLoading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className={styles.pageContainer}>
        <div className={styles.mainContent}>
          {/* Left Column - Video Skeleton */}
          <div className={styles.leftSection} style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            {/* Video Header */}
            <div className={styles.videoHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SkeletonPulse width="60px" height="20px" variant="text" />
                <SkeletonPulse width="90px" height="28px" borderRadius="8px" delay={100} />
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <SkeletonPulse width="100px" height="24px" borderRadius="12px" delay={150} />
                <SkeletonPulse width="70px" height="32px" borderRadius="20px" delay={200} variant="button" />
              </div>
            </div>

            <div className={styles.videoWrapper}>
              <div className={styles.videoContainer}>
                <div className={styles.videoPlayerWrapper}>
                  <SkeletonPulse width="100%" height="100%" borderRadius="0" variant="video" />
                  {/* Play button overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2
                  }}>
                    <SkeletonPulse width="56px" height="56px" borderRadius="50%" variant="button" delay={300} />
                  </div>
                  {/* Timer overlay */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    <SkeletonPulse width="80px" height="24px" borderRadius="4px" delay={350} />
                  </div>
                </div>
              </div>

              {/* Video Controls */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '8px', 
                padding: '16px',
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border-color)'
              }}>
                <SkeletonPulse width="40px" height="40px" borderRadius="50%" delay={400} variant="button" />
                <SkeletonPulse width="40px" height="40px" borderRadius="50%" delay={450} variant="button" />
                <SkeletonPulse width="56px" height="56px" borderRadius="50%" delay={500} variant="button" />
                <SkeletonPulse width="40px" height="40px" borderRadius="50%" delay={550} variant="button" />
              </div>

              <div className={styles.videoTitleBox}>
                <SkeletonPulse width="75%" height="20px" delay={600} variant="text" />
              </div>
            </div>
          </div>

          {/* Middle Column - Dictation Skeleton */}
          <div className={styles.middleSection} style={{ animation: 'fadeInUp 0.4s ease-out 0.1s both' }}>
            {/* Dictation Header */}
            <div className={styles.dictationHeader}>
              <SkeletonPulse width="120px" height="18px" delay={200} variant="text" />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <SkeletonPulse width="70px" height="28px" borderRadius="6px" delay={250} variant="button" />
              </div>
            </div>

            <div className={styles.dictationContainer}>
              {/* Word input area skeleton - Content-aware layout */}
              <div style={{ 
                padding: '24px',
                display: 'flex', 
                flexDirection: 'column',
                gap: '16px',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1
              }}>
                {/* First row of words */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                  {[55, 80, 45, 95, 60, 70, 50].map((width, i) => (
                    <div key={`r1-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <SkeletonPulse width="20px" height="20px" borderRadius="50%" delay={300 + i * 40} variant="button" />
                      <SkeletonPulse width={`${width}px`} height="42px" borderRadius="10px" delay={350 + i * 40} />
                    </div>
                  ))}
                </div>
                {/* Second row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                  {[65, 85, 50, 75, 90].map((width, i) => (
                    <div key={`r2-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <SkeletonPulse width="20px" height="20px" borderRadius="50%" delay={600 + i * 40} variant="button" />
                      <SkeletonPulse width={`${width}px`} height="42px" borderRadius="10px" delay={650 + i * 40} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons skeleton */}
              <div className={styles.dictationActions} style={{ display: 'flex', gap: '12px', padding: '16px' }}>
                <SkeletonPulse width="100%" height="48px" borderRadius="24px" delay={800} variant="button" style={{ flex: 1 }} />
                <SkeletonPulse width="100%" height="48px" borderRadius="24px" delay={850} variant="button" style={{ flex: 1 }} />
              </div>
            </div>
          </div>

          {/* Right Column - Transcript Skeleton */}
          <div className={styles.rightSection} style={{ animation: 'fadeInUp 0.5s ease-out 0.2s both' }}>
            <div className={styles.transcriptHeader}>
              <SkeletonPulse width="90px" height="18px" delay={400} variant="text" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SkeletonPulse width="100px" height="6px" borderRadius="3px" delay={450} variant="button" />
                <SkeletonPulse width="35px" height="14px" delay={500} variant="text" />
              </div>
            </div>

            <div className={styles.transcriptSection}>
              <div className={styles.transcriptList}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={styles.transcriptItem} 
                    style={{ 
                      opacity: 1 - i * 0.12,
                      animation: `fadeInUp 0.3s ease-out ${0.3 + i * 0.08}s both`
                    }}
                  >
                    <div className={styles.transcriptItemNumber}>
                      <SkeletonPulse width="22px" height="14px" delay={550 + i * 50} variant="text" />
                    </div>
                    <div className={styles.transcriptItemText} style={{ paddingLeft: '28px' }}>
                      <SkeletonPulse width={`${95 - i * 8}%`} height="14px" delay={600 + i * 50} variant="text" style={{ marginBottom: '6px' }} />
                      <SkeletonPulse width={`${75 - i * 5}%`} height="12px" delay={650 + i * 50} variant="text" />
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

export default DictationSkeleton;
