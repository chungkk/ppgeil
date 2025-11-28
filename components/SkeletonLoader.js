import React from 'react';

const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px', marginBottom = '0' }) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      marginBottom,
      background: 'linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-hover) 50%, var(--bg-secondary) 100%)',
      backgroundSize: '200% 100%',
      animation: 'loading 1.5s ease-in-out infinite',
    }}
  />
);

export const SkeletonCard = () => (
  <div
    style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--border-radius)',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-md)',
    }}
  >
    {/* 16:9 aspect ratio thumbnail */}
    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: 'var(--bg-secondary)' }}>
      <SkeletonBox width="100%" height="100%" borderRadius="0" style={{ position: 'absolute', top: 0, left: 0 }} />
    </div>
    <div style={{ padding: '10px' }}>
      <SkeletonBox width="90%" height="16px" marginBottom="6px" />
      <SkeletonBox width="70%" height="16px" marginBottom="8px" />
      <div style={{ display: 'flex', gap: '6px' }}>
        <SkeletonBox width="50%" height="28px" borderRadius="var(--border-radius-small)" />
        <SkeletonBox width="50%" height="28px" borderRadius="var(--border-radius-small)" />
      </div>
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 6 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 'var(--spacing-lg)',
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonStats = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 'var(--spacing-lg)',
      marginBottom: 'var(--spacing-xl)',
    }}
  >
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        style={{
          background: 'var(--bg-secondary)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border-color)',
        }}
      >
        <SkeletonBox width="60%" height="18px" marginBottom="var(--spacing-sm)" />
        <SkeletonBox width="40%" height="32px" />
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div
    style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--border-radius)',
      border: '1px solid var(--border-color)',
      overflow: 'hidden',
    }}
  >
    <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)' }}>
      <SkeletonBox width="30%" height="20px" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        style={{
          padding: 'var(--spacing-md)',
          borderBottom: i < rows - 1 ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          gap: 'var(--spacing-lg)',
        }}
      >
        <SkeletonBox width="40%" height="18px" />
        <SkeletonBox width="20%" height="18px" />
        <SkeletonBox width="30%" height="18px" />
      </div>
    ))}
  </div>
);

// Profile Page Sidebar Skeleton
export const ProfileSidebarSkeleton = () => (
  <div
    style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid var(--border-color)',
    }}
  >
    {/* Avatar */}
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      <div
        style={{
          width: '120px',
          height: '120px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: 'linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-hover) 50%, var(--bg-secondary) 100%)',
          backgroundSize: '200% 100%',
          animation: 'loading 1.5s ease-in-out infinite',
        }}
      />
      <SkeletonBox width="70%" height="24px" marginBottom="8px" style={{ margin: '0 auto 8px' }} />
      <SkeletonBox width="50%" height="16px" style={{ margin: '0 auto' }} />
    </div>

    {/* Stats */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-secondary)',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}
        >
          <SkeletonBox width="60%" height="14px" marginBottom="8px" />
          <SkeletonBox width="40%" height="28px" />
        </div>
      ))}
    </div>
  </div>
);

// Profile Lesson Card Skeleton
export const ProfileLessonCardSkeleton = () => (
  <div
    style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '18px',
    }}
  >
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
      <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
        <SkeletonBox width="24px" height="24px" borderRadius="4px" />
        <div style={{ flex: 1 }}>
          <SkeletonBox width="80%" height="18px" marginBottom="6px" />
          <SkeletonBox width="40px" height="18px" borderRadius="4px" />
        </div>
      </div>
      <SkeletonBox width="50px" height="28px" />
    </div>

    {/* Progress bar */}
    <SkeletonBox width="100%" height="6px" marginBottom="14px" borderRadius="3px" />

    {/* Mode progress */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
      <SkeletonBox width="100%" height="16px" />
      <SkeletonBox width="100%" height="16px" />
    </div>

    {/* Buttons */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      <SkeletonBox width="100%" height="36px" borderRadius="8px" />
      <SkeletonBox width="100%" height="36px" borderRadius="8px" />
    </div>
  </div>
);

// Profile Page Skeleton (with sidebar and lesson cards)
export const ProfilePageSkeleton = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 992;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
      gap: isMobile ? '24px' : '32px'
    }}>
      {/* Sidebar */}
      <ProfileSidebarSkeleton />

      {/* Main content */}
      <div>
        {/* Section header */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            padding: isMobile ? '20px 16px' : '24px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '0',
            marginBottom: '20px'
          }}>
            <SkeletonBox width={isMobile ? '160px' : '180px'} height="24px" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <SkeletonBox width="100px" height="28px" borderRadius="16px" />
              <SkeletonBox width="100px" height="28px" borderRadius="16px" />
            </div>
          </div>

          {/* Lesson cards grid */}
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

// Settings Card Skeleton
export const SettingsCardSkeleton = () => (
  <div
    style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid var(--border-color)',
    }}
  >
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <SkeletonBox width="40px" height="40px" borderRadius="50%" />
      <SkeletonBox width="150px" height="22px" />
    </div>

    {/* Content */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <SkeletonBox width="100px" height="14px" marginBottom="8px" />
        <SkeletonBox width="100%" height="40px" borderRadius="6px" />
      </div>
      <div>
        <SkeletonBox width="120px" height="14px" marginBottom="8px" />
        <SkeletonBox width="100%" height="40px" borderRadius="6px" />
      </div>
      <SkeletonBox width="60%" height="12px" />
    </div>
  </div>
);

// Settings Page Skeleton
export const SettingsPageSkeleton = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? '24px' : '32px' }}>
        <SkeletonBox width={isMobile ? '160px' : '200px'} height={isMobile ? '28px' : '32px'} marginBottom="8px" />
        <SkeletonBox width={isMobile ? '90%' : '350px'} height="16px" />
      </div>

      {/* Settings Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        {[1, 2, 3, 4].map((i) => (
          <SettingsCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

// Vocabulary Card Skeleton
export const VocabularyCardSkeleton = () => (
  <div
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '16px',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <SkeletonBox width="60%" height="20px" marginBottom="6px" />
        <SkeletonBox width="40%" height="14px" />
      </div>
      <SkeletonBox width="32px" height="32px" borderRadius="4px" />
    </div>
  </div>
);

// Vocabulary Page Skeleton
export const VocabularyPageSkeleton = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <SkeletonBox width="40px" height="40px" borderRadius="50%" />
          <SkeletonBox width={isMobile ? '140px' : '180px'} height={isMobile ? '28px' : '32px'} />
        </div>
        <SkeletonBox width={isMobile ? '90%' : '300px'} height="16px" style={{ margin: '0 auto' }} />
      </div>

      {/* Mobile controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <SkeletonBox width={isMobile ? '100px' : '120px'} height="36px" borderRadius="8px" />
        <SkeletonBox width={isMobile ? '60px' : '80px'} height="20px" />
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

// Admin Table Row Skeleton
export const AdminTableRowSkeleton = ({ columns = 4 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} style={{ padding: '10px 12px' }}>
        <SkeletonBox
          width={i === 0 ? '15px' : i === columns - 1 ? '120px' : '80%'}
          height="16px"
        />
      </td>
    ))}
  </tr>
);

// Admin Table Skeleton
export const AdminTableSkeleton = ({ rows = 10, columns = 4 }) => (
  <div style={{
    background: 'white',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    marginBottom: '16px'
  }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} style={{ padding: '10px 12px', textAlign: 'left' }}>
              <SkeletonBox width="80%" height="12px" />
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

// Admin Stat Card Skeleton
export const AdminStatCardSkeleton = () => (
  <div style={{
    background: 'white',
    padding: '10px 16px',
    borderRadius: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid #e5e7eb'
  }}>
    <SkeletonBox width="32px" height="32px" borderRadius="6px" />
    <div style={{ flex: 1 }}>
      <SkeletonBox width="60px" height="20px" marginBottom="4px" />
      <SkeletonBox width="80px" height="14px" />
    </div>
  </div>
);

// Admin Stats Overview Skeleton
export const AdminStatsOverviewSkeleton = ({ count = 3 }) => (
  <div style={{
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  }}>
    {Array.from({ length: count }).map((_, i) => (
      <AdminStatCardSkeleton key={i} />
    ))}
  </div>
);

// Admin File Item Skeleton
export const AdminFileItemSkeleton = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #f3f4f6'
  }}>
    <SkeletonBox width="70%" height="16px" />
    <SkeletonBox width="32px" height="32px" borderRadius="6px" />
  </div>
);

// Admin Files List Skeleton
export const AdminFilesListSkeleton = ({ count = 5 }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }}>
    {Array.from({ length: count }).map((_, i) => (
      <AdminFileItemSkeleton key={i} />
    ))}
  </div>
);

// Admin Dashboard Page Skeleton
export const AdminDashboardPageSkeleton = () => (
  <div>
    {/* Breadcrumb */}
    <div style={{ marginBottom: '12px' }}>
      <SkeletonBox width="150px" height="14px" />
    </div>

    {/* Page Header */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '1px solid #e5e7eb'
    }}>
      <SkeletonBox width="250px" height="28px" />
      <SkeletonBox width="100px" height="40px" borderRadius="6px" />
    </div>

    {/* Stats */}
    <AdminStatsOverviewSkeleton count={3} />

    {/* Search */}
    <div style={{ marginBottom: '16px' }}>
      <SkeletonBox width="100%" height="44px" borderRadius="6px" />
    </div>

    {/* Table */}
    <AdminTableSkeleton rows={10} columns={4} />

    {/* Pagination */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 14px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <SkeletonBox width="100px" height="36px" borderRadius="6px" />
      <SkeletonBox width="200px" height="16px" />
      <SkeletonBox width="100px" height="36px" borderRadius="6px" />
    </div>
  </div>
);

// Admin Files Page Skeleton
export const AdminFilesPageSkeleton = () => (
  <div>
    {/* Page Header */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '1px solid #e5e7eb'
    }}>
      <div>
        <SkeletonBox width="220px" height="28px" marginBottom="6px" />
        <SkeletonBox width="300px" height="16px" />
      </div>
      <SkeletonBox width="130px" height="40px" borderRadius="6px" />
    </div>

    {/* Stats */}
    <AdminStatsOverviewSkeleton count={4} />

    {/* Cleanup Section */}
    <div style={{ marginBottom: '32px' }}>
      <div style={{ marginBottom: '16px' }}>
        <SkeletonBox width="250px" height="24px" />
      </div>
      <div style={{
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #fbbf24'
      }}>
        <SkeletonBox width="100%" height="60px" marginBottom="16px" />
        <div style={{ display: 'flex', gap: '12px' }}>
          <SkeletonBox width="180px" height="40px" borderRadius="6px" />
          <SkeletonBox width="150px" height="40px" borderRadius="6px" />
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
        <SkeletonBox width="200px" height="24px" />
        <SkeletonBox width="100px" height="36px" borderRadius="6px" />
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
        <SkeletonBox width="180px" height="24px" />
        <SkeletonBox width="100px" height="36px" borderRadius="6px" />
      </div>
      <AdminFilesListSkeleton count={3} />
    </div>
  </div>
);

// Admin Page Item Skeleton (for Pages editor)
export const AdminPageItemSkeleton = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '8px'
  }}>
    <SkeletonBox width="40px" height="40px" borderRadius="8px" />
    <div style={{ flex: 1 }}>
      <SkeletonBox width="120px" height="16px" marginBottom="4px" />
      <SkeletonBox width="80px" height="12px" />
    </div>
  </div>
);

// Admin Form Input Skeleton
export const AdminFormInputSkeleton = () => (
  <div style={{ marginBottom: '24px' }}>
    <SkeletonBox width="100px" height="16px" marginBottom="8px" />
    <SkeletonBox width="100%" height="44px" borderRadius="10px" />
  </div>
);

// Admin Pages Editor Skeleton
export const AdminPagesEditorSkeleton = () => (
  <div>
    {/* Breadcrumb */}
    <div style={{ marginBottom: '12px' }}>
      <SkeletonBox width="180px" height="14px" />
    </div>

    {/* Page Header */}
    <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
      <SkeletonBox width="280px" height="28px" marginBottom="6px" />
      <SkeletonBox width="400px" height="16px" />
    </div>

    {/* Layout */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '24px'
    }}>
      {/* Sidebar */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        height: 'fit-content'
      }}>
        <SkeletonBox width="150px" height="16px" marginBottom="16px" />
        {Array.from({ length: 4 }).map((_, i) => (
          <AdminPageItemSkeleton key={i} />
        ))}
      </div>

      {/* Editor */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <SkeletonBox width="200px" height="24px" />
          <div style={{ display: 'flex', gap: '12px' }}>
            <SkeletonBox width="100px" height="40px" borderRadius="6px" />
            <SkeletonBox width="120px" height="40px" borderRadius="6px" />
          </div>
        </div>

        <AdminFormInputSkeleton />
        <AdminFormInputSkeleton />

        <div style={{ marginBottom: '24px' }}>
          <SkeletonBox width="250px" height="16px" marginBottom="8px" />
          <SkeletonBox width="100%" height="300px" borderRadius="10px" />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <SkeletonBox width="180px" height="48px" borderRadius="10px" />
        </div>
      </div>
    </div>
  </div>
);

// Add CSS animation to global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

export default SkeletonBox;
