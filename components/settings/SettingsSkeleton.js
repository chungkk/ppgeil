import React from 'react';
import styles from '../../styles/settings.module.css';
import profileStyles from '../../styles/profile.module.css';

/**
 * SettingsSkeleton - Retro style loading skeleton for settings page
 * 
 * Features:
 * - Neo-retro design with bold borders and box shadows
 * - Staggered animations for visual hierarchy
 * - Responsive layout for mobile/desktop
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
    accent: {
      background: 'linear-gradient(90deg, var(--retro-cyan, #4ECDC4) 0%, var(--retro-yellow, #FFE66D) 50%, var(--retro-cyan, #4ECDC4) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e)',
    },
    text: {
      background: 'linear-gradient(90deg, rgba(255, 248, 231, 0.3) 0%, rgba(255, 248, 231, 0.6) 50%, rgba(255, 248, 231, 0.3) 100%)',
      border: '2px solid rgba(26, 26, 46, 0.3)',
      boxShadow: '2px 2px 0 rgba(26, 26, 46, 0.15)',
    },
    neon: {
      background: 'linear-gradient(90deg, var(--retro-pink, #FF8ED4) 0%, var(--retro-purple, #A855F7) 50%, var(--retro-pink, #FF8ED4) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e), 0 0 12px rgba(168, 85, 247, 0.3)',
    },
    coral: {
      background: 'linear-gradient(90deg, var(--retro-coral, #FF6B6B) 0%, var(--retro-yellow, #FFE66D) 50%, var(--retro-coral, #FF6B6B) 100%)',
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
        animation: `retroSettingsLoading 1.2s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
        ...variantStyles[variant],
        ...style
      }}
    />
  );
};

// Settings Section Card Skeleton
const SettingsSectionSkeleton = ({ iconVariant = 'accent', delay = 0 }) => (
  <div
    style={{
      background: 'var(--retro-cream, #FFF8E7)',
      borderRadius: '16px',
      border: '3px solid var(--retro-border, #1a1a2e)',
      boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)',
      overflow: 'hidden',
      animation: `retroSettingsFadeIn 0.4s ease-out ${delay}ms both`
    }}
  >
    {/* Rainbow top border */}
    <div style={{
      height: '4px',
      background: 'linear-gradient(90deg, var(--retro-coral, #FF6B6B), var(--retro-yellow, #FFE66D), var(--retro-cyan, #4ECDC4), var(--retro-pink, #FF8ED4))'
    }} />
    
    {/* Header */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '14px', 
      padding: '18px 20px',
      borderBottom: '2px solid rgba(26, 26, 46, 0.15)'
    }}>
      <RetroSkeletonPulse width="48px" height="48px" borderRadius="12px" variant={iconVariant} delay={delay + 100} />
      <div style={{ flex: 1 }}>
        <RetroSkeletonPulse width="140px" height="20px" delay={delay + 150} variant="accent" style={{ marginBottom: '8px' }} />
        <RetroSkeletonPulse width="200px" height="14px" delay={delay + 200} variant="text" />
      </div>
    </div>

    {/* Content */}
    <div style={{ padding: '20px' }}>
      {/* Form field 1 */}
      <div style={{ marginBottom: '18px' }}>
        <RetroSkeletonPulse width="100px" height="14px" delay={delay + 250} variant="text" style={{ marginBottom: '10px' }} />
        <RetroSkeletonPulse width="100%" height="48px" borderRadius="12px" delay={delay + 300} />
      </div>
      
      {/* Form field 2 */}
      <div style={{ marginBottom: '18px' }}>
        <RetroSkeletonPulse width="120px" height="14px" delay={delay + 350} variant="text" style={{ marginBottom: '10px' }} />
        <RetroSkeletonPulse width="100%" height="48px" borderRadius="12px" delay={delay + 400} />
      </div>
      
      {/* Action button */}
      <RetroSkeletonPulse width="140px" height="44px" borderRadius="22px" delay={delay + 450} variant="neon" />
    </div>
  </div>
);

// Profile Card Skeleton
const ProfileCardSkeleton = ({ delay = 0 }) => (
  <div
    style={{
      background: 'var(--retro-cream, #FFF8E7)',
      borderRadius: '16px',
      border: '3px solid var(--retro-border, #1a1a2e)',
      boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)',
      overflow: 'hidden',
      animation: `retroSettingsFadeIn 0.4s ease-out ${delay}ms both`
    }}
  >
    {/* Rainbow top border */}
    <div style={{
      height: '4px',
      background: 'linear-gradient(90deg, var(--retro-cyan, #4ECDC4), var(--retro-pink, #FF8ED4), var(--retro-yellow, #FFE66D))'
    }} />
    
    {/* Header */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '14px', 
      padding: '18px 20px',
      borderBottom: '2px solid rgba(26, 26, 46, 0.15)'
    }}>
      <RetroSkeletonPulse width="48px" height="48px" borderRadius="12px" variant="neon" delay={delay + 100} />
      <div style={{ flex: 1 }}>
        <RetroSkeletonPulse width="160px" height="20px" delay={delay + 150} variant="accent" style={{ marginBottom: '8px' }} />
        <RetroSkeletonPulse width="220px" height="14px" delay={delay + 200} variant="text" />
      </div>
    </div>

    {/* Profile Card Content */}
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '18px',
        padding: '18px',
        background: 'rgba(78, 205, 196, 0.1)',
        borderRadius: '14px',
        border: '2px solid rgba(26, 26, 46, 0.2)'
      }}>
        {/* Avatar */}
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          border: '3px solid var(--retro-border, #1a1a2e)',
          boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e)',
          background: 'linear-gradient(135deg, var(--retro-cyan, #4ECDC4), var(--retro-pink, #FF8ED4))',
          backgroundSize: '200% 200%',
          animation: 'retroSettingsLoading 1.2s ease-in-out infinite'
        }} />
        
        {/* Info */}
        <div style={{ flex: 1 }}>
          <RetroSkeletonPulse width="130px" height="22px" delay={delay + 300} variant="accent" style={{ marginBottom: '8px' }} />
          <RetroSkeletonPulse width="180px" height="16px" delay={delay + 350} variant="text" />
        </div>
        
        {/* Badge */}
        <RetroSkeletonPulse width="80px" height="32px" borderRadius="16px" delay={delay + 400} variant="coral" />
      </div>
    </div>
  </div>
);

// Theme Selector Skeleton
const ThemeSelectorSkeleton = ({ delay = 0 }) => (
  <div
    style={{
      background: 'var(--retro-cream, #FFF8E7)',
      borderRadius: '16px',
      border: '3px solid var(--retro-border, #1a1a2e)',
      boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)',
      overflow: 'hidden',
      animation: `retroSettingsFadeIn 0.4s ease-out ${delay}ms both`
    }}
  >
    {/* Rainbow top border */}
    <div style={{
      height: '4px',
      background: 'linear-gradient(90deg, var(--retro-purple, #A855F7), var(--retro-pink, #FF8ED4), var(--retro-coral, #FF6B6B))'
    }} />
    
    {/* Header */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '14px', 
      padding: '18px 20px',
      borderBottom: '2px solid rgba(26, 26, 46, 0.15)'
    }}>
      <RetroSkeletonPulse width="48px" height="48px" borderRadius="12px" variant="coral" delay={delay + 100} />
      <div style={{ flex: 1 }}>
        <RetroSkeletonPulse width="120px" height="20px" delay={delay + 150} variant="accent" style={{ marginBottom: '8px' }} />
        <RetroSkeletonPulse width="180px" height="14px" delay={delay + 200} variant="text" />
      </div>
    </div>

    {/* Theme options */}
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '14px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '2px solid rgba(26, 26, 46, 0.2)',
              textAlign: 'center'
            }}
          >
            <RetroSkeletonPulse 
              width="50px" 
              height="50px" 
              borderRadius="50%" 
              delay={delay + 250 + i * 80} 
              variant={i === 1 ? 'accent' : i === 2 ? 'neon' : 'coral'}
              style={{ margin: '0 auto 12px' }}
            />
            <RetroSkeletonPulse width="70px" height="14px" delay={delay + 300 + i * 80} variant="text" style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SettingsSkeleton = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div className={profileStyles.profilePage}>
      <style jsx global>{`
        @keyframes retroSettingsLoading {
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
        @keyframes retroSettingsFadeIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className={profileStyles.profileContainer}>
        {/* Page Header */}
        <div style={{ 
          marginBottom: isMobile ? '24px' : '32px',
          animation: 'retroSettingsFadeIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <RetroSkeletonPulse width="44px" height="44px" borderRadius="12px" variant="neon" />
            <RetroSkeletonPulse width={isMobile ? '140px' : '180px'} height={isMobile ? '28px' : '32px'} variant="accent" />
          </div>
          <RetroSkeletonPulse width={isMobile ? '90%' : '380px'} height="18px" variant="text" style={{ marginLeft: '58px' }} />
        </div>

        {/* Settings Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '24px'
        }}>
          {/* Profile Card */}
          <ProfileCardSkeleton delay={100} />
          
          {/* Theme Selector */}
          <ThemeSelectorSkeleton delay={200} />
          
          {/* Password Section */}
          <SettingsSectionSkeleton iconVariant="coral" delay={300} />
          
          {/* Notifications Section */}
          <SettingsSectionSkeleton iconVariant="accent" delay={400} />
        </div>
      </div>
    </div>
  );
};

export default SettingsSkeleton;
