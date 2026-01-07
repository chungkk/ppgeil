import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { navigateWithLocale } from '../lib/navigation';

const ProtectedPage = ({ children, adminOnly = false, requireAdmin = false, requireAuth = true }) => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();

  // Support both adminOnly and requireAdmin props
  const needsAdmin = adminOnly || requireAdmin;

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // Redirect to home with login required flag (login modal will be opened)
        navigateWithLocale(router, '/?login=required&redirect=' + encodeURIComponent(router.asPath));
      } else if (needsAdmin && user && user.role !== 'admin') {
        // Redirect to home if not admin (check user.role instead of user.isAdmin)
        navigateWithLocale(router, '/');
      }
    }
  }, [user, loading, router, needsAdmin, requireAuth]);

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
      }}>
        <div className="loading-spinner" />
        <div style={{ color: 'var(--text-secondary)' }}>{t('protectedPage.loading')}</div>
      </div>
    );
  }

  // Don't render if user doesn't have access
  if (requireAuth && !user) {
    return null;
  }

  if (needsAdmin && user && user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedPage;
