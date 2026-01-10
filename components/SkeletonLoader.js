import React from 'react';

// ========== RETRO SKELETON BASE COMPONENT ==========
const RetroSkeletonBox = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px', 
  marginBottom = '0',
  variant = 'default', // 'default' | 'accent' | 'neon'
  delay = 0,
  style = {}
}) => {
  const variantStyles = {
    default: {
      background: 'linear-gradient(90deg, var(--retro-cream, #FFF8E7) 0%, rgba(255, 107, 107, 0.15) 50%, var(--retro-cream, #FFF8E7) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e)',
    },
    accent: {
      background: 'linear-gradient(90deg, var(--retro-cyan, #4ECDC4) 0%, var(--retro-yellow, #FFE66D) 50%, var(--retro-cyan, #4ECDC4) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e)',
    },
    neon: {
      background: 'linear-gradient(90deg, var(--retro-pink, #FF8ED4) 0%, var(--retro-purple, #A855F7) 50%, var(--retro-pink, #FF8ED4) 100%)',
      border: '2px solid var(--retro-border, #1a1a2e)',
      boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e), 0 0 10px rgba(168, 85, 247, 0.3)',
    },
    subtle: {
      background: 'linear-gradient(90deg, rgba(255, 248, 231, 0.5) 0%, rgba(255, 248, 231, 0.8) 50%, rgba(255, 248, 231, 0.5) 100%)',
      border: '2px solid rgba(26, 26, 46, 0.3)',
      boxShadow: '2px 2px 0 rgba(26, 26, 46, 0.2)',
    }
  };

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        marginBottom,
        backgroundSize: '200% 100%',
        animation: `retroLoading 1.2s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
        transition: 'transform 0.2s ease',
        ...variantStyles[variant],
        ...style
      }}
    />
  );
};

// Legacy SkeletonBox for backward compatibility
const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px', marginBottom = '0' }) => (
  <RetroSkeletonBox width={width} height={height} borderRadius={borderRadius} marginBottom={marginBottom} />
);

// ========== RETRO CARD SKELETON ==========
export const SkeletonCard = () => (
  <div
    style={{
      background: 'var(--retro-cream, #FFF8E7)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '3px solid var(--retro-border, #1a1a2e)',
      boxShadow: '6px 6px 0 var(--retro-shadow, #1a1a2e)',
      position: 'relative',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
  >
    {/* Rainbow top border */}
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'linear-gradient(90deg, var(--retro-coral, #FF6B6B), var(--retro-yellow, #FFE66D), var(--retro-cyan, #4ECDC4), var(--retro-pink, #FF8ED4))',
      zIndex: 1
    }} />
    
    {/* 16:9 aspect ratio thumbnail */}
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <RetroSkeletonBox width="100%" height="100%" borderRadius="0" variant="accent" />
      </div>
    </div>
    
    <div style={{ padding: '14px' }}>
      <RetroSkeletonBox width="85%" height="18px" marginBottom="8px" delay={100} />
      <RetroSkeletonBox width="60%" height="14px" marginBottom="12px" delay={150} variant="subtle" />
      <div style={{ display: 'flex', gap: '8px' }}>
        <RetroSkeletonBox width="50%" height="36px" borderRadius="20px" delay={200} variant="accent" />
        <RetroSkeletonBox width="50%" height="36px" borderRadius="20px" delay={250} variant="neon" />
      </div>
    </div>
  </div>
);

// ========== RETRO GRID SKELETON ==========
export const SkeletonGrid = ({ count = 6 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 'var(--spacing-lg, 24px)',
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// ========== RETRO STATS SKELETON ==========
export const SkeletonStats = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 'var(--spacing-lg, 24px)',
      marginBottom: 'var(--spacing-xl, 32px)',
    }}
  >
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        style={{
          background: 'var(--retro-cream, #FFF8E7)',
          padding: '20px',
          borderRadius: '12px',
          border: '3px solid var(--retro-border, #1a1a2e)',
          boxShadow: '4px 4px 0 var(--retro-shadow, #1a1a2e)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Accent top stripe */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: i % 2 === 0 ? 'var(--retro-cyan, #4ECDC4)' : 'var(--retro-coral, #FF6B6B)'
        }} />
        <RetroSkeletonBox width="50%" height="16px" marginBottom="12px" delay={i * 100} variant="subtle" />
        <RetroSkeletonBox width="70%" height="28px" delay={i * 100 + 50} variant="accent" />
      </div>
    ))}
  </div>
);

// ========== RETRO TABLE SKELETON ==========
export const SkeletonTable = ({ rows = 5 }) => (
  <div
    style={{
      background: 'var(--retro-cream, #FFF8E7)',
      borderRadius: '16px',
      border: '3px solid var(--retro-border, #1a1a2e)',
      boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)',
      overflow: 'hidden',
    }}
  >
    <div style={{ 
      padding: '16px 20px', 
      borderBottom: '3px solid var(--retro-border, #1a1a2e)',
      background: 'linear-gradient(90deg, var(--retro-coral, #FF6B6B), var(--retro-yellow, #FFE66D), var(--retro-cyan, #4ECDC4))'
    }}>
      <RetroSkeletonBox width="30%" height="20px" variant="subtle" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        style={{
          padding: '14px 20px',
          borderBottom: i < rows - 1 ? '2px solid rgba(26, 26, 46, 0.2)' : 'none',
          display: 'flex',
          gap: '20px',
        }}
      >
        <RetroSkeletonBox width="40%" height="16px" delay={i * 50} />
        <RetroSkeletonBox width="20%" height="16px" delay={i * 50 + 25} variant="subtle" />
        <RetroSkeletonBox width="30%" height="16px" delay={i * 50 + 50} variant="accent" />
      </div>
    ))}
  </div>
);

// ========== PROFILE PAGE SKELETONS ==========
export const ProfileSidebarSkeleton = () => (
  <div
    style={{
      background: 'var(--retro-cream, #FFF8E7)',
      borderRadius: '16px',
      padding: '24px',
      border: '3px solid var(--retro-border, #1a1a2e)',
      boxShadow: '6px 6px 0 var(--retro-shadow, #1a1a2e)',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    {/* Rainbow top border */}
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '5px',
      background: 'linear-gradient(90deg, var(--retro-coral, #FF6B6B), var(--retro-yellow, #FFE66D), var(--retro-cyan, #4ECDC4), var(--retro-pink, #FF8ED4))'
    }} />
    
    {/* Avatar */}
    <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '8px' }}>
      <div
        style={{
          width: '100px',
          height: '100px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          border: '4px solid var(--retro-border, #1a1a2e)',
          boxShadow: '4px 4px 0 var(--retro-shadow, #1a1a2e)',
          background: 'linear-gradient(135deg, var(--retro-cyan, #4ECDC4), var(--retro-pink, #FF8ED4))',
          backgroundSize: '200% 200%',
          animation: 'retroLoading 1.2s ease-in-out infinite',
        }}
      />
      <RetroSkeletonBox width="60%" height="22px" marginBottom="8px" style={{ margin: '0 auto 8px' }} variant="accent" />
      <RetroSkeletonBox width="40%" height="14px" style={{ margin: '0 auto' }} variant="subtle" />
    </div>

    {/* Stats */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: 'rgba(78, 205, 196, 0.1)',
            padding: '14px',
            borderRadius: '10px',
            border: '2px solid var(--retro-border, #1a1a2e)',
            boxShadow: '3px 3px 0 var(--retro-shadow, #1a1a2e)',
          }}
        >
          <RetroSkeletonBox width="50%" height="12px" marginBottom="8px" delay={i * 100} variant="subtle" />
          <RetroSkeletonBox width="70%" height="24px" delay={i * 100 + 50} variant="accent" />
        </div>
      ))}
    </div>
  </div>
);

export const ProfileLessonCardSkeleton = () => (
  <div
    style={{
      background: 'var(--retro-cream, #FFF8E7)',
      border: '3px solid var(--retro-border, #1a1a2e)',
      borderRadius: '14px',
      padding: '16px',
      boxShadow: '4px 4px 0 var(--retro-shadow, #1a1a2e)',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    {/* Accent stripe */}
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'var(--retro-cyan, #4ECDC4)'
    }} />
    
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', marginTop: '4px' }}>
      <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
        <RetroSkeletonBox width="28px" height="28px" borderRadius="6px" variant="neon" />
        <div style={{ flex: 1 }}>
          <RetroSkeletonBox width="75%" height="16px" marginBottom="6px" delay={50} />
          <RetroSkeletonBox width="50px" height="20px" borderRadius="10px" delay={100} variant="accent" />
        </div>
      </div>
      <RetroSkeletonBox width="55px" height="26px" borderRadius="13px" delay={150} variant="neon" />
    </div>

    {/* Progress bar */}
    <RetroSkeletonBox width="100%" height="8px" marginBottom="14px" borderRadius="4px" delay={200} variant="accent" />

    {/* Mode progress */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr', 
      gap: '10px', 
      padding: '12px 0', 
      borderTop: '2px solid rgba(26, 26, 46, 0.2)', 
      borderBottom: '2px solid rgba(26, 26, 46, 0.2)', 
      marginBottom: '12px' 
    }}>
      <RetroSkeletonBox width="100%" height="14px" delay={250} variant="subtle" />
      <RetroSkeletonBox width="100%" height="14px" delay={300} variant="subtle" />
    </div>

    {/* Buttons */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      <RetroSkeletonBox width="100%" height="38px" borderRadius="19px" delay={350} variant="accent" />
      <RetroSkeletonBox width="100%" height="38px" borderRadius="19px" delay={400} variant="neon" />
    </div>
  </div>
);

export const ProfilePageSkeleton = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 992;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
      gap: isMobile ? '24px' : '32px'
    }}>
      <ProfileSidebarSkeleton />
      <div>
        <div
          style={{
            background: 'var(--retro-cream, #FFF8E7)',
            borderRadius: '16px',
            padding: isMobile ? '20px 16px' : '24px',
            border: '3px solid var(--retro-border, #1a1a2e)',
            boxShadow: '6px 6px 0 var(--retro-shadow, #1a1a2e)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Rainbow top border */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: 'linear-gradient(90deg, var(--retro-coral, #FF6B6B), var(--retro-yellow, #FFE66D), var(--retro-cyan, #4ECDC4), var(--retro-pink, #FF8ED4))'
          }} />
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '0',
            marginBottom: '24px',
            marginTop: '8px'
          }}>
            <RetroSkeletonBox width={isMobile ? '150px' : '180px'} height="24px" variant="accent" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <RetroSkeletonBox width="90px" height="32px" borderRadius="16px" delay={100} variant="neon" />
              <RetroSkeletonBox width="90px" height="32px" borderRadius="16px" delay={150} />
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: isMobile ? '14px' : '16px'
          }}>
            {[1, 2, 3, 4].map((i) => (
              <ProfileLessonCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== SETTINGS PAGE SKELETONS ==========
export const SettingsCardSkeleton = () => (
  <div
    style={{
      background: 'var(--retro-cream, #FFF8E7)',
      borderRadius: '16px',
      padding: '24px',
      border: '3px solid var(--retro-border, #1a1a2e)',
      boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    {/* Accent top stripe */}
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'var(--retro-purple, #A855F7)'
    }} />
    
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', marginTop: '4px' }}>
      <RetroSkeletonBox width="44px" height="44px" borderRadius="12px" variant="neon" />
      <RetroSkeletonBox width="140px" height="20px" variant="accent" />
    </div>

    {/* Content */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <RetroSkeletonBox width="90px" height="12px" marginBottom="8px" variant="subtle" />
        <RetroSkeletonBox width="100%" height="44px" borderRadius="10px" delay={100} />
      </div>
      <div>
        <RetroSkeletonBox width="110px" height="12px" marginBottom="8px" delay={150} variant="subtle" />
        <RetroSkeletonBox width="100%" height="44px" borderRadius="10px" delay={200} />
      </div>
      <RetroSkeletonBox width="70%" height="12px" delay={250} variant="subtle" />
    </div>
  </div>
);

export const SettingsPageSkeleton = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
        <RetroSkeletonBox width={isMobile ? '160px' : '200px'} height={isMobile ? '28px' : '32px'} marginBottom="10px" variant="accent" />
        <RetroSkeletonBox width={isMobile ? '90%' : '350px'} height="16px" variant="subtle" />
      </div>

      {/* Settings Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '24px'
      }}>
        {[1, 2, 3, 4].map((i) => (
          <SettingsCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

// ========== VOCABULARY PAGE SKELETONS ==========
export const VocabularyCardSkeleton = () => (
  <div
    style={{
      background: 'var(--retro-cream, #FFF8E7)',
      border: '3px solid var(--retro-border, #1a1a2e)',
      borderRadius: '14px',
      padding: '16px',
      boxShadow: '4px 4px 0 var(--retro-shadow, #1a1a2e)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <RetroSkeletonBox width="55%" height="18px" marginBottom="8px" variant="accent" />
        <RetroSkeletonBox width="35%" height="14px" variant="subtle" />
      </div>
      <RetroSkeletonBox width="36px" height="36px" borderRadius="8px" variant="neon" />
    </div>
  </div>
);

export const VocabularyPageSkeleton = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <RetroSkeletonBox width="44px" height="44px" borderRadius="12px" variant="neon" />
          <RetroSkeletonBox width={isMobile ? '140px' : '180px'} height={isMobile ? '28px' : '32px'} variant="accent" />
        </div>
        <RetroSkeletonBox width={isMobile ? '90%' : '300px'} height="16px" style={{ margin: '0 auto' }} variant="subtle" />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <RetroSkeletonBox width={isMobile ? '100px' : '120px'} height="40px" borderRadius="20px" variant="accent" />
        <RetroSkeletonBox width={isMobile ? '70px' : '90px'} height="18px" variant="subtle" />
      </div>

      {/* Vocabulary Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <VocabularyCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

// ========== ADMIN DASHBOARD SKELETONS ==========
export const AdminTableRowSkeleton = ({ columns = 4 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} style={{ padding: '12px 14px' }}>
        <RetroSkeletonBox
          width={i === 0 ? '18px' : i === columns - 1 ? '120px' : '80%'}
          height="16px"
          delay={i * 30}
          variant={i === columns - 1 ? 'accent' : 'default'}
        />
      </td>
    ))}
  </tr>
);

export const AdminTableSkeleton = ({ rows = 10, columns = 4 }) => (
  <div style={{
    background: 'var(--retro-cream, #FFF8E7)',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '3px solid var(--retro-border, #1a1a2e)',
    boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)',
    marginBottom: '16px'
  }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ 
        background: 'linear-gradient(90deg, var(--retro-cyan, #4ECDC4), var(--retro-yellow, #FFE66D))',
        borderBottom: '3px solid var(--retro-border, #1a1a2e)'
      }}>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} style={{ padding: '14px', textAlign: 'left' }}>
              <RetroSkeletonBox width="70%" height="14px" variant="subtle" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <AdminTableRowSkeleton key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);

export const AdminStatCardSkeleton = () => (
  <div style={{
    background: 'var(--retro-cream, #FFF8E7)',
    padding: '14px 18px',
    borderRadius: '12px',
    boxShadow: '4px 4px 0 var(--retro-shadow, #1a1a2e)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '3px solid var(--retro-border, #1a1a2e)'
  }}>
    <RetroSkeletonBox width="40px" height="40px" borderRadius="10px" variant="neon" />
    <div style={{ flex: 1 }}>
      <RetroSkeletonBox width="55px" height="22px" marginBottom="6px" variant="accent" />
      <RetroSkeletonBox width="75px" height="14px" variant="subtle" />
    </div>
  </div>
);

export const AdminStatsOverviewSkeleton = ({ count = 3 }) => (
  <div style={{
    display: 'flex',
    gap: '14px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  }}>
    {Array.from({ length: count }).map((_, i) => (
      <AdminStatCardSkeleton key={i} />
    ))}
  </div>
);

export const AdminFileItemSkeleton = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '2px solid rgba(26, 26, 46, 0.15)'
  }}>
    <RetroSkeletonBox width="65%" height="16px" />
    <RetroSkeletonBox width="36px" height="36px" borderRadius="8px" variant="accent" />
  </div>
);

export const AdminFilesListSkeleton = ({ count = 5 }) => (
  <div style={{
    background: 'var(--retro-cream, #FFF8E7)',
    borderRadius: '14px',
    border: '3px solid var(--retro-border, #1a1a2e)',
    overflow: 'hidden',
    boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)'
  }}>
    {Array.from({ length: count }).map((_, i) => (
      <AdminFileItemSkeleton key={i} />
    ))}
  </div>
);

export const AdminDashboardPageSkeleton = () => (
  <div>
    {/* Breadcrumb */}
    <div style={{ marginBottom: '14px' }}>
      <RetroSkeletonBox width="150px" height="14px" variant="subtle" />
    </div>

    {/* Page Header */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '18px',
      borderBottom: '3px solid var(--retro-border, #1a1a2e)'
    }}>
      <RetroSkeletonBox width="250px" height="30px" variant="accent" />
      <RetroSkeletonBox width="110px" height="44px" borderRadius="22px" variant="neon" />
    </div>

    {/* Stats */}
    <AdminStatsOverviewSkeleton count={3} />

    {/* Search */}
    <div style={{ marginBottom: '18px' }}>
      <RetroSkeletonBox width="100%" height="48px" borderRadius="24px" />
    </div>

    {/* Table */}
    <AdminTableSkeleton rows={10} columns={4} />

    {/* Pagination */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 18px',
      background: 'var(--retro-cream, #FFF8E7)',
      borderRadius: '12px',
      border: '3px solid var(--retro-border, #1a1a2e)',
      boxShadow: '4px 4px 0 var(--retro-shadow, #1a1a2e)'
    }}>
      <RetroSkeletonBox width="100px" height="40px" borderRadius="20px" variant="accent" />
      <RetroSkeletonBox width="180px" height="16px" variant="subtle" />
      <RetroSkeletonBox width="100px" height="40px" borderRadius="20px" variant="accent" />
    </div>
  </div>
);

export const AdminFilesPageSkeleton = () => (
  <div>
    {/* Page Header */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '18px',
      borderBottom: '3px solid var(--retro-border, #1a1a2e)'
    }}>
      <div>
        <RetroSkeletonBox width="220px" height="28px" marginBottom="8px" variant="accent" />
        <RetroSkeletonBox width="300px" height="16px" variant="subtle" />
      </div>
      <RetroSkeletonBox width="140px" height="44px" borderRadius="22px" variant="neon" />
    </div>

    {/* Stats */}
    <AdminStatsOverviewSkeleton count={4} />

    {/* Cleanup Section */}
    <div style={{ marginBottom: '32px' }}>
      <div style={{ marginBottom: '16px' }}>
        <RetroSkeletonBox width="250px" height="24px" variant="accent" />
      </div>
      <div style={{
        background: 'linear-gradient(135deg, var(--retro-yellow, #FFE66D), var(--retro-coral, #FF6B6B))',
        padding: '24px',
        borderRadius: '16px',
        border: '3px solid var(--retro-border, #1a1a2e)',
        boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)'
      }}>
        <RetroSkeletonBox width="100%" height="60px" marginBottom="16px" variant="subtle" />
        <div style={{ display: 'flex', gap: '14px' }}>
          <RetroSkeletonBox width="180px" height="44px" borderRadius="22px" />
          <RetroSkeletonBox width="150px" height="44px" borderRadius="22px" />
        </div>
      </div>
    </div>

    {/* Files Lists */}
    <div style={{ marginBottom: '32px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <RetroSkeletonBox width="200px" height="24px" variant="accent" />
        <RetroSkeletonBox width="100px" height="40px" borderRadius="20px" variant="neon" />
      </div>
      <AdminFilesListSkeleton count={5} />
    </div>

    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <RetroSkeletonBox width="180px" height="24px" variant="accent" />
        <RetroSkeletonBox width="100px" height="40px" borderRadius="20px" variant="neon" />
      </div>
      <AdminFilesListSkeleton count={3} />
    </div>
  </div>
);

export const AdminPageItemSkeleton = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    borderRadius: '10px',
    marginBottom: '10px',
    background: 'rgba(78, 205, 196, 0.1)',
    border: '2px solid rgba(26, 26, 46, 0.2)'
  }}>
    <RetroSkeletonBox width="44px" height="44px" borderRadius="10px" variant="accent" />
    <div style={{ flex: 1 }}>
      <RetroSkeletonBox width="120px" height="16px" marginBottom="6px" />
      <RetroSkeletonBox width="80px" height="12px" variant="subtle" />
    </div>
  </div>
);

export const AdminFormInputSkeleton = () => (
  <div style={{ marginBottom: '24px' }}>
    <RetroSkeletonBox width="100px" height="14px" marginBottom="10px" variant="subtle" />
    <RetroSkeletonBox width="100%" height="48px" borderRadius="12px" />
  </div>
);

export const AdminPagesEditorSkeleton = () => (
  <div>
    {/* Breadcrumb */}
    <div style={{ marginBottom: '14px' }}>
      <RetroSkeletonBox width="180px" height="14px" variant="subtle" />
    </div>

    {/* Page Header */}
    <div style={{ marginBottom: '24px', paddingBottom: '18px', borderBottom: '3px solid var(--retro-border, #1a1a2e)' }}>
      <RetroSkeletonBox width="280px" height="28px" marginBottom="8px" variant="accent" />
      <RetroSkeletonBox width="400px" height="16px" variant="subtle" />
    </div>

    {/* Layout */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '24px'
    }}>
      {/* Sidebar */}
      <div style={{
        background: 'var(--retro-cream, #FFF8E7)',
        borderRadius: '16px',
        padding: '20px',
        border: '3px solid var(--retro-border, #1a1a2e)',
        boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)',
        height: 'fit-content'
      }}>
        <RetroSkeletonBox width="150px" height="16px" marginBottom="18px" variant="accent" />
        {Array.from({ length: 4 }).map((_, i) => (
          <AdminPageItemSkeleton key={i} />
        ))}
      </div>

      {/* Editor */}
      <div style={{
        background: 'var(--retro-cream, #FFF8E7)',
        borderRadius: '16px',
        padding: '24px',
        border: '3px solid var(--retro-border, #1a1a2e)',
        boxShadow: '5px 5px 0 var(--retro-shadow, #1a1a2e)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '18px',
          borderBottom: '3px solid var(--retro-border, #1a1a2e)'
        }}>
          <RetroSkeletonBox width="200px" height="24px" variant="accent" />
          <div style={{ display: 'flex', gap: '14px' }}>
            <RetroSkeletonBox width="100px" height="44px" borderRadius="22px" />
            <RetroSkeletonBox width="120px" height="44px" borderRadius="22px" variant="neon" />
          </div>
        </div>

        <AdminFormInputSkeleton />
        <AdminFormInputSkeleton />

        <div style={{ marginBottom: '24px' }}>
          <RetroSkeletonBox width="250px" height="14px" marginBottom="10px" variant="subtle" />
          <RetroSkeletonBox width="100%" height="300px" borderRadius="14px" />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '14px',
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '3px solid var(--retro-border, #1a1a2e)'
        }}>
          <RetroSkeletonBox width="180px" height="52px" borderRadius="26px" variant="neon" />
        </div>
      </div>
    </div>
  </div>
);

// Add CSS animation to global styles
if (typeof document !== 'undefined') {
  const styleId = 'retro-skeleton-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes retroLoading {
        0% { 
          background-position: 200% 0;
          transform: scale(1);
        }
        50% {
          transform: scale(1.01);
        }
        100% { 
          background-position: -200% 0;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

export { RetroSkeletonBox };
export default SkeletonBox;
