import { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import { SettingsPageSkeleton } from '../../components/SkeletonLoader';
import styles from '../../styles/profile.module.css';
import settingsStyles from '../../styles/settings.module.css';


function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, themeOptions, setTheme, currentTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('settings.password.errors.mismatch'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error(t('settings.password.errors.minLength'));
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        toast.success(t('settings.password.success'));
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        toast.error(error.message || t('settings.password.errors.failed'));
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(t('settings.password.errors.failed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfileUpdate = async (field, value) => {
    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        toast.success(t('settings.updateSuccess'));
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(t('settings.updateError'));
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(t('settings.updateError'));
    }
  };



  // Structured data
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: t('breadcrumb.home'), url: '/' },
    { name: t('breadcrumb.dashboard'), url: '/profile' },
    { name: t('breadcrumb.settings'), url: '/profile/settings' }
  ]);

  if (loading) {
    return (
      <div className={styles.profilePage}>
        <div className={styles.profileContainer}>
          <SettingsPageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={t('seo.settings.title')}
        description={t('seo.settings.description')}
        keywords={t('seo.settings.keywords')}
        structuredData={breadcrumbData}
        noindex={true}
      />

      <div className={styles.profilePage}>
        <div className={styles.profileContainer}>
          {/* Page Header */}
          <div className={settingsStyles.pageHeader}>
            <h1 className={settingsStyles.pageTitle}>⚙️ {t('settings.title')}</h1>
            <p className={settingsStyles.pageSubtitle}>{t('settings.subtitle')}</p>
          </div>

          {/* Settings Sections */}
          <div className={settingsStyles.settingsGrid}>
            {/* Profile Card */}
            <div className={settingsStyles.settingCard}>
              <div className={settingsStyles.settingCardHeader}>
                <div className={settingsStyles.settingCardIcon}>👤</div>
                <h3 className={settingsStyles.settingCardTitle}>{t('settings.profile.title')}</h3>
              </div>
              <div className={settingsStyles.settingCardBody}>
                <div className={settingsStyles.profileInfo}>
                  <div className={settingsStyles.profileItem}>
                    <span className={settingsStyles.profileLabel}>{t('settings.profile.name')}</span>
                    <span className={settingsStyles.profileValue}>{user?.name}</span>
                  </div>
                  <div className={settingsStyles.profileItem}>
                    <span className={settingsStyles.profileLabel}>{t('settings.profile.email')}</span>
                    <span className={settingsStyles.profileValue}>{user?.email}</span>
                  </div>
                  <div className={settingsStyles.profileItem}>
                    <span className={settingsStyles.profileLabel}>{t('settings.profile.role')}</span>
                    <span className={settingsStyles.profileValue}>
                      {user?.role === 'admin' ? t('settings.profile.admin') : t('settings.profile.user')}
                    </span>
                  </div>
                </div>

                {/* Native Language Section */}
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                  <label className={settingsStyles.settingLabel}>
                    🌐 {t('settings.nativeLanguage.title')}
                  </label>
                  <p className={settingsStyles.settingDescription}>
                    {t('settings.nativeLanguage.description')}
                  </p>
                  <select
                    value={user?.nativeLanguage || 'vi'}
                    onChange={(e) => handleProfileUpdate('nativeLanguage', e.target.value)}
                    className={settingsStyles.settingSelect}
                  >
                    <option value="vi">🇻🇳 Tiếng Việt</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                  <p className={settingsStyles.settingHint}>
                    {t('settings.nativeLanguage.current')} <strong>{user?.nativeLanguage || 'Tiếng Việt'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Theme Setting Card */}
            <div className={settingsStyles.settingCard}>
              <div className={settingsStyles.settingCardHeader}>
                <div className={settingsStyles.settingCardIcon}>🎨</div>
                <h3 className={settingsStyles.settingCardTitle}>{t('settings.appearance.title')}</h3>
              </div>
              <div className={settingsStyles.settingCardBody}>
                <p className={settingsStyles.settingDescription}>
                  {t('settings.appearance.description')}
                </p>
                <div className={settingsStyles.themeOptions}>
                  {themeOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${settingsStyles.themeOption} ${theme === option.id ? settingsStyles.themeOptionActive : ''}`}
                      onClick={() => setTheme(option.id)}
                      aria-pressed={theme === option.id}
                    >
                      <span className={settingsStyles.themeOptionEmoji} aria-hidden="true">
                        {option.emoji}
                      </span>
                      <span className={settingsStyles.themeOptionContent}>
                        <span className={settingsStyles.themeOptionLabel}>{option.label}</span>
                        <span className={settingsStyles.themeOptionDescription}>{option.description}</span>
                      </span>
                      {theme === option.id && (
                        <span className={settingsStyles.checkmark}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className={settingsStyles.settingHint}>
                  {t('settings.appearance.current')} <strong>{currentTheme?.label}</strong>
                </p>
              </div>
            </div>

            {/* Learning Level & Difficulty Setting Card (Combined) */}
            <div className={settingsStyles.settingCard}>
              <div className={settingsStyles.settingCardHeader}>
                <div className={settingsStyles.settingCardIcon}>🎯</div>
                <h3 className={settingsStyles.settingCardTitle}>{t('lesson.ui.levelAndDifficulty')}</h3>
              </div>
              <div className={settingsStyles.settingCardBody}>
                <p className={settingsStyles.settingDescription}>
                  {t('settings.level.description')}
                </p>
                <select
                  value={user?.level || 'beginner'}
                  onChange={(e) => handleProfileUpdate('level', e.target.value)}
                  className={settingsStyles.settingSelect}
                >
                  <option value="beginner">🌱 {t('settings.level.beginner')}</option>
                  <option value="experienced">🚀 {t('settings.level.experienced')}</option>
                  <option value="all">🎯 {t('settings.level.all')}</option>
                </select>
                <p className={settingsStyles.settingHint}>
                  {t('settings.level.hint')}
                </p>
              </div>
            </div>

            {/* Password Change Card */}
            <div className={settingsStyles.settingCard}>
              <div className={settingsStyles.settingCardHeader}>
                <div className={settingsStyles.settingCardIcon}>🔒</div>
                <h3 className={settingsStyles.settingCardTitle}>{t('settings.password.title')}</h3>
              </div>
              <div className={settingsStyles.settingCardBody}>
                <form onSubmit={handlePasswordChange} className={settingsStyles.passwordForm}>
                  <div className={settingsStyles.formGroup}>
                    <label className={settingsStyles.formLabel}>{t('settings.password.current')}</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className={settingsStyles.formInput}
                      required
                    />
                  </div>
                  <div className={settingsStyles.formGroup}>
                    <label className={settingsStyles.formLabel}>{t('settings.password.new')}</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className={settingsStyles.formInput}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className={settingsStyles.formGroup}>
                    <label className={settingsStyles.formLabel}>{t('settings.password.confirm')}</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className={settingsStyles.formInput}
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className={settingsStyles.submitButton}
                  >
                    {passwordLoading ? `🔄 ${t('settings.password.updating')}` : `🔒 ${t('settings.password.button')}`}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Settings() {
  return (
    <ProtectedPage>
      <SettingsPage />
    </ProtectedPage>
  );
}
