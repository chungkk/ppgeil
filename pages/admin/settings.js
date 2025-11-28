import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import ProtectedPage from '../../components/ProtectedPage';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { toast } from 'react-toastify';
import styles from '../../styles/adminDashboard.module.css';

function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Einstellungen konnten nicht geladen werden');
      
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Fehler beim Laden der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!res.ok) throw new Error('Einstellungen konnten nicht gespeichert werden');
      
      const data = await res.json();
      toast.success(data.message || 'Einstellungen erfolgreich gespeichert!');
      setSettings(data.settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general', label: 'Allgemein', icon: '⚙️' },
    { id: 'appearance', label: 'Giao diện', icon: '🎨' },
    { id: 'features', label: 'Funktionen', icon: '✨' },
    { id: 'lessons', label: 'Lektionen', icon: '📚' },
    { id: 'gamification', label: 'Gamification', icon: '🎮' },
    { id: 'api', label: 'API-Schlüssel', icon: '🔑' },
    { id: 'social', label: 'Social Media', icon: '🌐' },
    { id: 'maintenance', label: 'Wartung', icon: '🔧' }
  ];

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className={styles.loadingState}>Lädt Einstellungen...</div>
      </AdminDashboardLayout>
    );
  }

  if (!settings) {
    return (
      <AdminDashboardLayout>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚠️</div>
          <h3 className={styles.emptyTitle}>Fehler beim Laden der Einstellungen</h3>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Systemeinstellungen - Admin Dashboard</title>
      </Head>

      <AdminDashboardLayout>
        {/* Breadcrumb Header */}
        <div className={styles.breadcrumbHeader}>
          <nav className={styles.breadcrumb}>
            <Link href="/admin/dashboard" className={styles.breadcrumbLink}>Admin</Link>
            <span className={styles.breadcrumbSeparator}>›</span>
            <span className={styles.breadcrumbCurrent}>Einstellungen</span>
          </nav>
        </div>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>⚙️ Systemeinstellungen</h1>
            <p className={styles.pageSubtitle}>
              Verwalten Sie die Konfiguration Ihrer Lernplattform
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={styles.primaryButton}
          >
            {saving ? '💾 Speichert...' : '💾 Speichern'}
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>🌐 Allgemeine Einstellungen</h2>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Seitenname
                  <span className={styles.formHint}>Der Name Ihrer Website</span>
                </label>
                <input
                  type="text"
                  value={settings.siteName || ''}
                  onChange={(e) => updateSetting('siteName', e.target.value)}
                  className={styles.formInput}
                  placeholder="z.B. PapaGeil - Deutsch Lernen"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Seitenbeschreibung
                  <span className={styles.formHint}>Kurze Beschreibung für SEO</span>
                </label>
                <textarea
                  value={settings.siteDescription || ''}
                  onChange={(e) => updateSetting('siteDescription', e.target.value)}
                  className={styles.formTextarea}
                  rows={3}
                  placeholder="z.B. Lerne Deutsch mit interaktiven Lektionen"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Website-URL
                  <span className={styles.formHint}>Hauptdomain Ihrer Website</span>
                </label>
                <input
                  type="url"
                  value={settings.siteUrl || ''}
                  onChange={(e) => updateSetting('siteUrl', e.target.value)}
                  className={styles.formInput}
                  placeholder="https://papageil.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  E-Mail Absender
                  <span className={styles.formHint}>Von-Adresse für System-E-Mails</span>
                </label>
                <input
                  type="email"
                  value={settings.emailFrom || ''}
                  onChange={(e) => updateSetting('emailFrom', e.target.value)}
                  className={styles.formInput}
                  placeholder="noreply@papageil.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Support E-Mail
                  <span className={styles.formHint}>Kontakt-E-Mail für Benutzer</span>
                </label>
                <input
                  type="email"
                  value={settings.emailSupport || ''}
                  onChange={(e) => updateSetting('emailSupport', e.target.value)}
                  className={styles.formInput}
                  placeholder="support@papageil.com"
                />
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>🎨 Cài đặt Giao diện</h2>
              
              {/* Colors */}
              <div className={styles.subsectionTitle}>🌈 Màu sắc</div>
              <div className={styles.colorGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Màu chính (Primary)
                    <span className={styles.formHint}>Màu chủ đạo của trang</span>
                  </label>
                  <div className={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={settings.primaryColor || '#667eea'}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={settings.primaryColor || '#667eea'}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className={styles.formInput}
                      placeholder="#667eea"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Màu phụ (Secondary)
                    <span className={styles.formHint}>Màu gradient thứ hai</span>
                  </label>
                  <div className={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={settings.secondaryColor || '#764ba2'}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor || '#764ba2'}
                      onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                      className={styles.formInput}
                      placeholder="#764ba2"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Màu nhấn (Accent)
                    <span className={styles.formHint}>Cho highlights và CTAs</span>
                  </label>
                  <div className={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={settings.accentColor || '#f59e0b'}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={settings.accentColor || '#f59e0b'}
                      onChange={(e) => updateSetting('accentColor', e.target.value)}
                      className={styles.formInput}
                      placeholder="#f59e0b"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Màu nền (Background)
                    <span className={styles.formHint}>Màu nền trang</span>
                  </label>
                  <div className={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={settings.backgroundColor || '#ffffff'}
                      onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={settings.backgroundColor || '#ffffff'}
                      onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                      className={styles.formInput}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Màu chữ (Text)
                    <span className={styles.formHint}>Màu chữ chính</span>
                  </label>
                  <div className={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={settings.textColor || '#111827'}
                      onChange={(e) => updateSetting('textColor', e.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={settings.textColor || '#111827'}
                      onChange={(e) => updateSetting('textColor', e.target.value)}
                      className={styles.formInput}
                      placeholder="#111827"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Màu Header
                    <span className={styles.formHint}>Màu nền header</span>
                  </label>
                  <div className={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={settings.headerBackgroundColor || '#ffffff'}
                      onChange={(e) => updateSetting('headerBackgroundColor', e.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={settings.headerBackgroundColor || '#ffffff'}
                      onChange={(e) => updateSetting('headerBackgroundColor', e.target.value)}
                      className={styles.formInput}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Màu Footer
                    <span className={styles.formHint}>Màu nền footer</span>
                  </label>
                  <div className={styles.colorInputWrapper}>
                    <input
                      type="color"
                      value={settings.footerBackgroundColor || '#1f2937'}
                      onChange={(e) => updateSetting('footerBackgroundColor', e.target.value)}
                      className={styles.colorInput}
                    />
                    <input
                      type="text"
                      value={settings.footerBackgroundColor || '#1f2937'}
                      onChange={(e) => updateSetting('footerBackgroundColor', e.target.value)}
                      className={styles.formInput}
                      placeholder="#1f2937"
                    />
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className={styles.subsectionTitle}>🔤 Typography</div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Font chữ
                  <span className={styles.formHint}>Font cho toàn bộ website</span>
                </label>
                <select
                  value={settings.fontFamily || 'Inter'}
                  onChange={(e) => updateSetting('fontFamily', e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="Inter">Inter (Modern, Clean)</option>
                  <option value="Roboto">Roboto (Google Material)</option>
                  <option value="Open Sans">Open Sans (Readable)</option>
                  <option value="Lato">Lato (Professional)</option>
                  <option value="Montserrat">Montserrat (Bold, Geometric)</option>
                  <option value="Poppins">Poppins (Friendly)</option>
                  <option value="Nunito">Nunito (Rounded, Soft)</option>
                  <option value="SF Pro">SF Pro (Apple Style)</option>
                </select>
              </div>

              {/* Layout & Styling */}
              <div className={styles.subsectionTitle}>📐 Layout & Styling</div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Border Radius
                  <span className={styles.formHint}>Bo tròn góc của các elements</span>
                </label>
                <select
                  value={settings.borderRadius || 'medium'}
                  onChange={(e) => updateSetting('borderRadius', e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="none">None (0px) - Sharp corners</option>
                  <option value="small">Small (4px) - Subtle rounding</option>
                  <option value="medium">Medium (8px) - Balanced</option>
                  <option value="large">Large (12px) - Soft curves</option>
                  <option value="full">Full (999px) - Fully rounded</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Button Style
                  <span className={styles.formHint}>Kiểu dáng nút bấm</span>
                </label>
                <select
                  value={settings.buttonStyle || 'rounded'}
                  onChange={(e) => updateSetting('buttonStyle', e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="rounded">Rounded - Bo tròn vừa phải</option>
                  <option value="sharp">Sharp - Góc vuông</option>
                  <option value="pill">Pill - Bo tròn hoàn toàn</option>
                </select>
              </div>

              {/* Logo & Branding */}
              <div className={styles.subsectionTitle}>🖼️ Logo & Branding</div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Logo URL
                  <span className={styles.formHint}>Link đến file logo (PNG, SVG)</span>
                </label>
                <input
                  type="url"
                  value={settings.logoUrl || ''}
                  onChange={(e) => updateSetting('logoUrl', e.target.value)}
                  className={styles.formInput}
                  placeholder="https://example.com/logo.png"
                />
                {settings.logoUrl && (
                  <div className={styles.imagePreview}>
                    <Image src={settings.logoUrl} alt="Logo preview" width={120} height={60} style={{ objectFit: 'contain' }} />
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Favicon URL
                  <span className={styles.formHint}>Icon hiển thị trên tab (ICO, PNG)</span>
                </label>
                <input
                  type="url"
                  value={settings.faviconUrl || ''}
                  onChange={(e) => updateSetting('faviconUrl', e.target.value)}
                  className={styles.formInput}
                  placeholder="https://example.com/favicon.ico"
                />
              </div>

              {/* Theme Settings */}
              <div className={styles.subsectionTitle}>🌓 Theme mặc định</div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Chọn theme mặc định
                  <span className={styles.formHint}>Theme sẽ được áp dụng khi user mới truy cập trang</span>
                </label>
                <div className={styles.themeSelector}>
                  <label className={`${styles.themeOption} ${(settings.defaultTheme || 'light') === 'light' ? styles.themeOptionSelected : ''}`}>
                    <input
                      type="radio"
                      name="defaultTheme"
                      value="light"
                      checked={(settings.defaultTheme || 'light') === 'light'}
                      onChange={(e) => updateSetting('defaultTheme', e.target.value)}
                      className={styles.themeRadioInput}
                    />
                    <div className={styles.themeOptionCard}>
                      <div className={styles.themeOptionIcon}>☀️</div>
                      <div className={styles.themeOptionContent}>
                        <div className={styles.themeOptionTitle}>Sáng (Light)</div>
                        <div className={styles.themeOptionDesc}>Giao diện sáng, dễ đọc ban ngày</div>
                      </div>
                      <div className={styles.themeCheckmark}>✓</div>
                    </div>
                  </label>

                  <label className={`${styles.themeOption} ${settings.defaultTheme === 'dark' ? styles.themeOptionSelected : ''}`}>
                    <input
                      type="radio"
                      name="defaultTheme"
                      value="dark"
                      checked={settings.defaultTheme === 'dark'}
                      onChange={(e) => updateSetting('defaultTheme', e.target.value)}
                      className={styles.themeRadioInput}
                    />
                    <div className={styles.themeOptionCard}>
                      <div className={styles.themeOptionIcon}>🌙</div>
                      <div className={styles.themeOptionContent}>
                        <div className={styles.themeOptionTitle}>Tối (Dark)</div>
                        <div className={styles.themeOptionDesc}>Giao diện tối, dễ nhìn ban đêm</div>
                      </div>
                      <div className={styles.themeCheckmark}>✓</div>
                    </div>
                  </label>

                  <label className={`${styles.themeOption} ${settings.defaultTheme === 'auto' ? styles.themeOptionSelected : ''}`}>
                    <input
                      type="radio"
                      name="defaultTheme"
                      value="auto"
                      checked={settings.defaultTheme === 'auto'}
                      onChange={(e) => updateSetting('defaultTheme', e.target.value)}
                      className={styles.themeRadioInput}
                    />
                    <div className={styles.themeOptionCard}>
                      <div className={styles.themeOptionIcon}>🌗</div>
                      <div className={styles.themeOptionContent}>
                        <div className={styles.themeOptionTitle}>Tự động (Auto)</div>
                        <div className={styles.themeOptionDesc}>Theo cài đặt hệ thống của user</div>
                      </div>
                      <div className={styles.themeCheckmark}>✓</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Display Options */}
              <div className={styles.subsectionTitle}>👁️ Display Options</div>
              <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Hiển thị Logo</span>
                    <span className={styles.toggleDescription}>Hiện logo trong header</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showLogo !== false}
                    onChange={(e) => updateSetting('showLogo', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>

                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Hiển thị Footer</span>
                    <span className={styles.toggleDescription}>Hiện footer ở cuối trang</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showFooter !== false}
                    onChange={(e) => updateSetting('showFooter', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>

                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Compact Mode</span>
                    <span className={styles.toggleDescription}>Giảm khoảng cách, hiển thị gọn hơn</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.compactMode || false}
                    onChange={(e) => updateSetting('compactMode', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>
              </div>

              {/* Custom Code */}
              <div className={styles.subsectionTitle}>💻 Custom Code</div>
              <div className={styles.warningBox}>
                ⚠️ Chú ý: Code tùy chỉnh có thể ảnh hưởng đến hiệu suất và bảo mật của website.
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Custom CSS
                  <span className={styles.formHint}>Thêm CSS tùy chỉnh (sẽ được áp dụng toàn site)</span>
                </label>
                <textarea
                  value={settings.customCSS || ''}
                  onChange={(e) => updateSetting('customCSS', e.target.value)}
                  className={styles.formTextarea}
                  rows={8}
                  placeholder="/* Your custom CSS here */&#10;.my-class {&#10;  color: blue;&#10;}"
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Custom Header HTML
                  <span className={styles.formHint}>Code HTML thêm vào &lt;head&gt; (tracking, meta tags...)</span>
                </label>
                <textarea
                  value={settings.customHeaderHTML || ''}
                  onChange={(e) => updateSetting('customHeaderHTML', e.target.value)}
                  className={styles.formTextarea}
                  rows={6}
                  placeholder="<!-- Analytics, fonts, meta tags... -->"
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Custom Footer HTML
                  <span className={styles.formHint}>Code HTML thêm vào cuối &lt;body&gt; (scripts...)</span>
                </label>
                <textarea
                  value={settings.customFooterHTML || ''}
                  onChange={(e) => updateSetting('customFooterHTML', e.target.value)}
                  className={styles.formTextarea}
                  rows={6}
                  placeholder="<!-- Custom scripts... -->"
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>✨ Funktionen aktivieren/deaktivieren</h2>
              
              <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Registrierung aktivieren</span>
                    <span className={styles.toggleDescription}>Neue Benutzer können sich registrieren</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableRegistration || false}
                    onChange={(e) => updateSetting('enableRegistration', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>

                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Google Translate Integration</span>
                    <span className={styles.toggleDescription}>Übersetzungsfunktion in Lektionen</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableGoogleTranslate || false}
                    onChange={(e) => updateSetting('enableGoogleTranslate', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>

                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Wörterbuch aktivieren</span>
                    <span className={styles.toggleDescription}>Wörterbuch-Funktion verfügbar machen</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableDictionary || false}
                    onChange={(e) => updateSetting('enableDictionary', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>

                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Bestenliste aktivieren</span>
                    <span className={styles.toggleDescription}>Zeige Rangliste der Benutzer</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableLeaderboard || false}
                    onChange={(e) => updateSetting('enableLeaderboard', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>

                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Analytics aktivieren</span>
                    <span className={styles.toggleDescription}>Tracking und Statistiken sammeln</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableAnalytics || false}
                    onChange={(e) => updateSetting('enableAnalytics', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>
              </div>
            </div>
          )}

          {/* Lessons Tab */}
          {activeTab === 'lessons' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>📚 Lektionseinstellungen</h2>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Lektionen pro Seite
                  <span className={styles.formHint}>Standardanzahl für Pagination (5-100)</span>
                </label>
                <input
                  type="number"
                  value={settings.defaultLessonsPerPage || 10}
                  onChange={(e) => updateSetting('defaultLessonsPerPage', parseInt(e.target.value))}
                  className={styles.formInput}
                  min={5}
                  max={100}
                />
              </div>

              <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>YouTube Integration</span>
                    <span className={styles.toggleDescription}>YouTube-Videos in Lektionen einbetten</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableYouTubeIntegration || false}
                    onChange={(e) => updateSetting('enableYouTubeIntegration', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Standard Benutzerniveau
                  <span className={styles.formHint}>Für neue Benutzer</span>
                </label>
                <select
                  value={settings.defaultUserLevel || 'beginner'}
                  onChange={(e) => updateSetting('defaultUserLevel', e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="beginner">🌱 Anfänger</option>
                  <option value="experienced">🚀 Fortgeschritten</option>
                  <option value="all">🎯 Alle Niveaus</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Standard Muttersprache
                  <span className={styles.formHint}>Für neue Benutzer</span>
                </label>
                <select
                  value={settings.defaultNativeLanguage || 'vi'}
                  onChange={(e) => updateSetting('defaultNativeLanguage', e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="it">🇮🇹 Italiano</option>
                  <option value="pt">🇵🇹 Português</option>
                  <option value="ru">🇷🇺 Русский</option>
                  <option value="ja">🇯🇵 日本語</option>
                  <option value="ko">🇰🇷 한국어</option>
                  <option value="zh">🇨🇳 中文</option>
                </select>
              </div>
            </div>
          )}

          {/* Gamification Tab */}
          {activeTab === 'gamification' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>🎮 Gamification Einstellungen</h2>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Punkte pro Lektion
                  <span className={styles.formHint}>Belohnung für abgeschlossene Lektion</span>
                </label>
                <input
                  type="number"
                  value={settings.pointsPerLesson || 100}
                  onChange={(e) => updateSetting('pointsPerLesson', parseInt(e.target.value))}
                  className={styles.formInput}
                  min={0}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Punkte pro Wort
                  <span className={styles.formHint}>Belohnung für gelerntes Wort</span>
                </label>
                <input
                  type="number"
                  value={settings.pointsPerWord || 10}
                  onChange={(e) => updateSetting('pointsPerWord', parseInt(e.target.value))}
                  className={styles.formInput}
                  min={0}
                />
              </div>

              <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Streaks aktivieren</span>
                    <span className={styles.toggleDescription}>Tägliche Lernserien verfolgen</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableStreaks || false}
                    onChange={(e) => updateSetting('enableStreaks', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>
              </div>
            </div>
          )}

          {/* API Tab */}
          {activeTab === 'api' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>🔑 API-Schlüssel</h2>
              <div className={styles.warningBox}>
                ⚠️ Achtung: Diese Schlüssel sind vertraulich. Teilen Sie sie niemals öffentlich.
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Google Translate API Key
                  <span className={styles.formHint}>Für Übersetzungsfunktion</span>
                </label>
                <input
                  type="password"
                  value={settings.googleTranslateApiKey || ''}
                  onChange={(e) => updateSetting('googleTranslateApiKey', e.target.value)}
                  className={styles.formInput}
                  placeholder="AIza..."
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  YouTube API Key
                  <span className={styles.formHint}>Für YouTube-Untertitel</span>
                </label>
                <input
                  type="password"
                  value={settings.youtubeApiKey || ''}
                  onChange={(e) => updateSetting('youtubeApiKey', e.target.value)}
                  className={styles.formInput}
                  placeholder="AIza..."
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Google Analytics ID
                  <span className={styles.formHint}>Tracking ID (z.B. G-XXXXXXXXXX)</span>
                </label>
                <input
                  type="text"
                  value={settings.googleAnalyticsId || ''}
                  onChange={(e) => updateSetting('googleAnalyticsId', e.target.value)}
                  className={styles.formInput}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
            </div>
          )}

          {/* Social Tab */}
          {activeTab === 'social' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>🌐 Social Media Links</h2>
              <p className={styles.sectionDescription}>
                Fügen Sie Links zu Ihren Social-Media-Profilen hinzu. Diese werden im Footer angezeigt.
              </p>

              <div className={styles.socialMediaGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.socialIcon}>📘</span> Facebook URL
                    <span className={styles.formHint}>Ihr Facebook-Profil oder -Seite</span>
                  </label>
                  <input
                    type="url"
                    value={settings.facebookUrl || ''}
                    onChange={(e) => updateSetting('facebookUrl', e.target.value)}
                    className={styles.formInput}
                    placeholder="https://facebook.com/papageil"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.socialIcon}>🐦</span> Twitter/X URL
                    <span className={styles.formHint}>Ihr Twitter/X-Profil</span>
                  </label>
                  <input
                    type="url"
                    value={settings.twitterUrl || ''}
                    onChange={(e) => updateSetting('twitterUrl', e.target.value)}
                    className={styles.formInput}
                    placeholder="https://twitter.com/papageil"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.socialIcon}>📷</span> Instagram URL
                    <span className={styles.formHint}>Ihr Instagram-Profil</span>
                  </label>
                  <input
                    type="url"
                    value={settings.instagramUrl || ''}
                    onChange={(e) => updateSetting('instagramUrl', e.target.value)}
                    className={styles.formInput}
                    placeholder="https://instagram.com/papageil"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.socialIcon}>▶️</span> YouTube URL
                    <span className={styles.formHint}>Ihr YouTube-Kanal</span>
                  </label>
                  <input
                    type="url"
                    value={settings.youtubeUrl || ''}
                    onChange={(e) => updateSetting('youtubeUrl', e.target.value)}
                    className={styles.formInput}
                    placeholder="https://youtube.com/@papageil"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.socialIcon}>🎵</span> TikTok URL
                    <span className={styles.formHint}>Ihr TikTok-Profil</span>
                  </label>
                  <input
                    type="url"
                    value={settings.tiktokUrl || ''}
                    onChange={(e) => updateSetting('tiktokUrl', e.target.value)}
                    className={styles.formInput}
                    placeholder="https://tiktok.com/@papageil"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.socialIcon}>💼</span> LinkedIn URL
                    <span className={styles.formHint}>Ihr LinkedIn-Profil oder Unternehmensseite</span>
                  </label>
                  <input
                    type="url"
                    value={settings.linkedinUrl || ''}
                    onChange={(e) => updateSetting('linkedinUrl', e.target.value)}
                    className={styles.formInput}
                    placeholder="https://linkedin.com/company/papageil"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className={styles.socialIcon}>💻</span> GitHub URL
                    <span className={styles.formHint}>Ihr GitHub-Profil oder Organisation</span>
                  </label>
                  <input
                    type="url"
                    value={settings.githubUrl || ''}
                    onChange={(e) => updateSetting('githubUrl', e.target.value)}
                    className={styles.formInput}
                    placeholder="https://github.com/papageil"
                  />
                </div>
              </div>

              <div className={styles.infoBox}>
                💡 <strong>Tipp:</strong> Lassen Sie Felder leer, wenn Sie bestimmte Social-Media-Plattformen nicht verwenden. 
                Diese werden dann im Footer nicht angezeigt.
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className={styles.settingsSection}>
              <h2 className={styles.sectionTitle}>🔧 Wartungsmodus</h2>
              
              <div className={styles.toggleGroup}>
                <label className={styles.toggleLabel}>
                  <div className={styles.toggleInfo}>
                    <span className={styles.toggleTitle}>Wartungsmodus aktivieren</span>
                    <span className={styles.toggleDescription}>
                      {settings.maintenanceMode 
                        ? '⚠️ Website ist derzeit im Wartungsmodus' 
                        : 'Website ist normal zugänglich'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode || false}
                    onChange={(e) => updateSetting('maintenanceMode', e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSwitch}></span>
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Wartungsnachricht
                  <span className={styles.formHint}>Diese Nachricht wird Benutzern angezeigt</span>
                </label>
                <textarea
                  value={settings.maintenanceMessage || ''}
                  onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                  className={styles.formTextarea}
                  rows={4}
                  placeholder="Die Website wird gerade gewartet..."
                />
              </div>

              {settings.maintenanceMode && (
                <div className={styles.warningBox}>
                  ⚠️ Wartungsmodus ist aktiv! Nur Administratoren können die Website besuchen.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save Button (Fixed at bottom) */}
        <div className={styles.stickyFooter}>
          <button
            onClick={handleSave}
            disabled={saving}
            className={styles.primaryButton}
          >
            {saving ? '💾 Speichert...' : '💾 Alle Änderungen speichern'}
          </button>
        </div>
      </AdminDashboardLayout>
    </>
  );
}

export default function AdminSettings() {
  return (
    <ProtectedPage requireAdmin={true}>
      <AdminSettingsPage />
    </ProtectedPage>
  );
}
