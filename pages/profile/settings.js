import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import OfflineDownloadManager from '../../components/OfflineDownloadManager';
import styles from '../../styles/profile.module.css';
import settingsStyles from '../../styles/settings.module.css';


function SettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme, themeOptions, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'offline'
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

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
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
      } else {
        const error = await response.json();
        toast.error(error.message || t('settings.password.errors.failed'));
      }
    } catch (error) {
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
        // Refresh user data without reloading the entire page
        await refreshUser();
      } else {
        toast.error(t('settings.updateError'));
      }
    } catch (error) {
      toast.error(t('settings.updateError'));
    }
  };

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: t('breadcrumb.home'), url: '/' },
    { name: t('breadcrumb.dashboard'), url: '/profile' },
    { name: t('breadcrumb.settings'), url: '/profile/settings' }
  ]);

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
          <h1 className={settingsStyles.pageTitle}>⚙️ {t('settings.title')}</h1>

          {/* Tabs */}
          <div className={settingsStyles.tabs}>
            <button
              className={`${settingsStyles.tab} ${activeTab === 'general' ? settingsStyles.tabActive : ''}`}
              onClick={() => setActiveTab('general')}
            >
              ⚙️ Cài đặt chung
            </button>
            <button
              className={`${settingsStyles.tab} ${activeTab === 'offline' ? settingsStyles.tabActive : ''}`}
              onClick={() => setActiveTab('offline')}
            >
              📥 Offline
            </button>
          </div>

          {/* General Settings Tab */}
          {activeTab === 'general' && (
          <div className={settingsStyles.settingsList}>
            {/* Profile Info */}
            <div className={settingsStyles.settingRow}>
              <div className={settingsStyles.settingInfo}>
                <span className={settingsStyles.settingIcon}>👤</span>
                <div>
                  <div className={settingsStyles.settingName}>{user?.name}</div>
                  <div className={settingsStyles.settingDesc}>{user?.email}</div>
                </div>
              </div>
            </div>

            {/* Native Language */}
            <div className={settingsStyles.settingRow}>
              <div className={settingsStyles.settingInfo}>
                <span className={settingsStyles.settingIcon}>🌐</span>
                <div className={settingsStyles.settingName}>{t('settings.nativeLanguage.title')}</div>
              </div>
              <select
                value={user?.nativeLanguage || 'vi'}
                onChange={(e) => handleProfileUpdate('nativeLanguage', e.target.value)}
                className={settingsStyles.settingSelect}
              >
                <option value="vi">🇻🇳 Tiếng Việt</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>

            {/* Theme */}
            <div className={settingsStyles.settingRow}>
              <div className={settingsStyles.settingInfo}>
                <span className={settingsStyles.settingIcon}>🎨</span>
                <div className={settingsStyles.settingName}>{t('settings.appearance.title')}</div>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className={settingsStyles.settingSelect}
              >
                {themeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.emoji} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div className={settingsStyles.settingRow}>
              <div className={settingsStyles.settingInfo}>
                <span className={settingsStyles.settingIcon}>🎯</span>
                <div className={settingsStyles.settingName}>{t('lesson.ui.levelAndDifficulty')}</div>
              </div>
              <select
                value={user?.level || 'beginner'}
                onChange={(e) => handleProfileUpdate('level', e.target.value)}
                className={settingsStyles.settingSelect}
              >
                <option value="beginner">🌱 {t('settings.level.beginner')}</option>
                <option value="experienced">🚀 {t('settings.level.experienced')}</option>
                <option value="all">🎯 {t('settings.level.all')}</option>
              </select>
            </div>

            {/* Password */}
            <div className={settingsStyles.settingRow}>
              <div className={settingsStyles.settingInfo}>
                <span className={settingsStyles.settingIcon}>🔒</span>
                <div className={settingsStyles.settingName}>{t('settings.password.title')}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className={settingsStyles.changeBtn}
              >
                {showPasswordForm ? t('common.cancel') : t('settings.password.button')}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handlePasswordChange} className={settingsStyles.passwordForm}>
                <input
                  type="password"
                  placeholder={t('settings.password.current')}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className={settingsStyles.formInput}
                  required
                />
                <input
                  type="password"
                  placeholder={t('settings.password.new')}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className={settingsStyles.formInput}
                  required
                  minLength={6}
                />
                <input
                  type="password"
                  placeholder={t('settings.password.confirm')}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className={settingsStyles.formInput}
                  required
                  minLength={6}
                />
                <button type="submit" disabled={passwordLoading} className={settingsStyles.submitButton}>
                  {passwordLoading ? t('settings.password.updating') : t('settings.password.button')}
                </button>
              </form>
            )}
          </div>
          )}

          {/* Offline Downloads Tab */}
          {activeTab === 'offline' && (
            <OfflineDownloadManager />
          )}
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
