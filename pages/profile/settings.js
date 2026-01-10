import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';

import styles from '../../styles/profile.module.css';
import settingsStyles from '../../styles/settings.module.css';


function SettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme, themeOptions, setTheme } = useTheme();


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

  const getUserInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return '?';
  };

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
            <h1 className={settingsStyles.pageTitle}>
              <span>⚙️</span>
              {t('settings.title')}
            </h1>
            <p className={settingsStyles.pageSubtitle}>
              {t('settings.subtitle') || 'Quản lý tài khoản và tùy chỉnh trải nghiệm học tập của bạn'}
            </p>
          </div>



          {/* Settings Content */}
          <div className={settingsStyles.settingsContainer}>
              {/* Profile Section */}
              <div className={settingsStyles.settingsSection}>
                <div className={settingsStyles.sectionHeader}>
                  <div className={`${settingsStyles.sectionIcon} ${settingsStyles.profile}`}>
                    👤
                  </div>
                  <div className={settingsStyles.sectionInfo}>
                    <h3>Thông tin cá nhân</h3>
                    <p>Xem và quản lý thông tin tài khoản của bạn</p>
                  </div>
                </div>
                <div className={settingsStyles.sectionBody}>
                  <div className={settingsStyles.profileCard}>
                    <div className={settingsStyles.profileAvatar}>
                      {getUserInitial()}
                    </div>
                    <div className={settingsStyles.profileInfo}>
                      <h4 className={settingsStyles.profileName}>{user?.name || 'User'}</h4>
                      <p className={settingsStyles.profileEmail}>{user?.email}</p>
                    </div>
                    <div className={settingsStyles.profileBadge}>
                      ✨ Active
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferences Section */}
              <div className={settingsStyles.settingsSection}>
                <div className={settingsStyles.sectionHeader}>
                  <div className={`${settingsStyles.sectionIcon} ${settingsStyles.preferences}`}>
                    🎨
                  </div>
                  <div className={settingsStyles.sectionInfo}>
                    <h3>Tùy chọn hiển thị</h3>
                    <p>Tùy chỉnh giao diện và ngôn ngữ</p>
                  </div>
                </div>
                <div className={settingsStyles.sectionBody}>
                  <div className={settingsStyles.settingsList}>
                    {/* Native Language */}
                    <div className={settingsStyles.settingRow}>
                      <div className={settingsStyles.settingInfo}>
                        <div className={settingsStyles.settingIcon}>🌐</div>
                        <div className={settingsStyles.settingContent}>
                          <div className={settingsStyles.settingName}>{t('settings.nativeLanguage.title')}</div>
                          <div className={settingsStyles.settingDesc}>Ngôn ngữ hiển thị phụ đề và gợi ý</div>
                        </div>
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
                        <div className={settingsStyles.settingIcon}>🎨</div>
                        <div className={settingsStyles.settingContent}>
                          <div className={settingsStyles.settingName}>{t('settings.appearance.title')}</div>
                          <div className={settingsStyles.settingDesc}>Chọn theme sáng hoặc tối theo sở thích</div>
                        </div>
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
                  </div>
                </div>
              </div>

              {/* Learning Section */}
              <div className={settingsStyles.settingsSection}>
                <div className={settingsStyles.sectionHeader}>
                  <div className={`${settingsStyles.sectionIcon} ${settingsStyles.learning}`}>
                    📚
                  </div>
                  <div className={settingsStyles.sectionInfo}>
                    <h3>Cài đặt học tập</h3>
                    <p>Điều chỉnh cấp độ và nội dung bài học</p>
                  </div>
                </div>
                <div className={settingsStyles.sectionBody}>
                  <div className={settingsStyles.settingsList}>
                    {/* Level */}
                    <div className={settingsStyles.settingRow}>
                      <div className={settingsStyles.settingInfo}>
                        <div className={settingsStyles.settingIcon}>🎯</div>
                        <div className={settingsStyles.settingContent}>
                          <div className={settingsStyles.settingName}>{t('lesson.ui.levelAndDifficulty')}</div>
                          <div className={settingsStyles.settingDesc}>Bài học sẽ được lọc theo trình độ của bạn</div>
                        </div>
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
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className={settingsStyles.settingsSection}>
                <div className={settingsStyles.sectionHeader}>
                  <div className={`${settingsStyles.sectionIcon} ${settingsStyles.security}`}>
                    🔐
                  </div>
                  <div className={settingsStyles.sectionInfo}>
                    <h3>Bảo mật</h3>
                    <p>Quản lý mật khẩu và bảo vệ tài khoản</p>
                  </div>
                </div>
                <div className={settingsStyles.sectionBody}>
                  <div className={settingsStyles.settingsList}>
                    {/* Password */}
                    <div className={settingsStyles.settingRow}>
                      <div className={settingsStyles.settingInfo}>
                        <div className={settingsStyles.settingIcon}>🔒</div>
                        <div className={settingsStyles.settingContent}>
                          <div className={settingsStyles.settingName}>{t('settings.password.title')}</div>
                          <div className={settingsStyles.settingDesc}>Thay đổi mật khẩu đăng nhập của bạn</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className={settingsStyles.changeBtn}
                      >
                        {showPasswordForm ? t('common.cancel') : t('settings.password.button')}
                      </button>
                    </div>
                  </div>

                  {showPasswordForm && (
                    <form onSubmit={handlePasswordChange} className={settingsStyles.passwordForm}>
                      <div className={settingsStyles.passwordFormHeader}>
                        <span>🔑</span>
                        <h4>Đổi mật khẩu</h4>
                      </div>
                      <input
                        type="password"
                        placeholder={t('settings.password.current')}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className={settingsStyles.formInput}
                        required
                      />
                      <input
                        type="password"
                        placeholder={t('settings.password.new')}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className={settingsStyles.formInput}
                        required
                        minLength={6}
                      />
                      <input
                        type="password"
                        placeholder={t('settings.password.confirm')}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className={settingsStyles.formInput}
                        required
                        minLength={6}
                      />
                      <button type="submit" disabled={passwordLoading} className={settingsStyles.submitButton}>
                        {passwordLoading ? '⏳ ' + t('settings.password.updating') : '✓ ' + t('settings.password.button')}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Tips Card */}
              <div className={settingsStyles.tipsCard}>
                <div className={settingsStyles.tipsIcon}>💡</div>
                <div className={settingsStyles.tipsContent}>
                  <h4>Mẹo học tiếng Đức hiệu quả</h4>
                  <p>
                    Sử dụng tính năng Shadowing để cải thiện phát âm và Dictation để nâng cao kỹ năng nghe.
                    Luyện tập mỗi ngày 15-30 phút sẽ giúp bạn tiến bộ nhanh hơn!
                  </p>
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
