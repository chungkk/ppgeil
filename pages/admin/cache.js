import React, { useState, useEffect, useCallback } from 'react';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import styles from '../../styles/AdminCache.module.css';

const AdminCacheDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // For invalidation
  const [invalidateWord, setInvalidateWord] = useState('');
  const [invalidateLang, setInvalidateLang] = useState('');

  // For settings
  const [settings, setSettings] = useState(null);
  const [expiryDays, setExpiryDays] = useState(7);
  const [savingSettings, setSavingSettings] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setAdminToken('');
    setIsAuthenticated(false);
    setStats(null);
  }, []);

  const fetchStats = useCallback(async (token) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/cache/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid admin token');
        }
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
      if (err.message === 'Invalid admin token') {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  const fetchSettings = useCallback(async (token) => {
    try {
      const response = await fetch('/api/admin/cache/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setExpiryDays(data.settings.expiryDays);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  }, []);

  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAuthenticated(true);
      fetchStats(savedToken);
      fetchSettings(savedToken);
    }
  }, [fetchStats, fetchSettings]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (adminToken.trim()) {
      localStorage.setItem('admin_token', adminToken);
      setIsAuthenticated(true);
      fetchStats(adminToken);
      fetchSettings(adminToken);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/admin/cache/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expiryDays })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      alert('Settings saved! Cache will now use ' + expiryDays + ' days expiry time.');
      fetchSettings(adminToken);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleInvalidate = async (type, value) => {
    if (!confirm(`Are you sure you want to clear ${type === 'all' ? 'ALL cache entries' : `cache for "${invalidateWord}"`}?`)) {
      return;
    }

    setLoading(true);
    try {
      let body = {};

      if (type === 'word') {
        if (!invalidateWord.trim()) {
          alert('Please enter a word to clear');
          return;
        }
        body = { word: invalidateWord };
        if (invalidateLang.trim()) {
          body.targetLang = invalidateLang;
        }
      } else if (type === 'all') {
        body = { clearAll: true };
      }

      const response = await fetch('/api/admin/cache/invalidate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to invalidate cache');
      }

      const data = await response.json();
      alert(`${data.message}\nDeleted: ${data.deletedCount} entries`);

      // Refresh stats
      fetchStats(adminToken);

      // Clear form
      setInvalidateWord('');
      setInvalidateLang('');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <AdminDashboardLayout>
        <div className={styles.container}>
          <div className={styles.loginBox}>
            <h1 className={styles.title}>Admin Login</h1>
            <form onSubmit={handleLogin} className={styles.loginForm}>
              <input
                type="password"
                placeholder="Enter admin token"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className={styles.input}
                autoFocus
              />
              <button type="submit" className={styles.button}>
                Login
              </button>
            </form>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cache Dashboard</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => fetchStats(adminToken)}
            className={styles.refreshButton}
            disabled={loading}
          >
            Refresh
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {loading && <div className={styles.loading}>Loading...</div>}
      {error && <div className={styles.error}>{error}</div>}

      {stats && (
        <>
          {/* Stats Overview */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Entries</div>
              <div className={styles.statValue}>{stats.totalEntries.toLocaleString()}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Hits</div>
              <div className={styles.statValue}>{stats.hitStats.totalHits.toLocaleString()}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Hit Rate</div>
              <div className={styles.statValue}>
                {stats.totalEntries > 0
                  ? (stats.hitStats.totalHits / stats.totalEntries).toFixed(2)
                  : '0.00'}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Avg Hits per Word</div>
              <div className={styles.statValue}>
                {stats.hitStats.avgHits?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>

          {/* Two column layout */}
          <div className={styles.twoColumns}>
            {/* Top Words */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Top 10 Words</h2>
              <div className={styles.topWordsList}>
                {stats.topWords.map((item, idx) => (
                  <div key={idx} className={styles.topWordItem}>
                    <div className={styles.topWordRank}>#{idx + 1}</div>
                    <div className={styles.topWordInfo}>
                      <div className={styles.topWordWord}>{item.word}</div>
                      <div className={styles.topWordMeta}>
                        {item.targetLang.toUpperCase()} • {item.hits} hits
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Distributions */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Distributions</h2>

              <h3 className={styles.subTitle}>By Version</h3>
              {stats.versionDistribution.map((item, idx) => (
                <div key={idx} className={styles.distributionItem}>
                  <span>{item._id}</span>
                  <span className={styles.distributionCount}>{item.count}</span>
                </div>
              ))}

              <h3 className={styles.subTitle}>By Language</h3>
              {stats.languageDistribution.map((item, idx) => (
                <div key={idx} className={styles.distributionItem}>
                  <span>{item._id.toUpperCase()}</span>
                  <span className={styles.distributionCount}>{item.count}</span>
                </div>
              ))}

              <h3 className={styles.subTitle}>By Age</h3>
              <div className={styles.distributionItem}>
                <span>Last 24 hours</span>
                <span className={styles.distributionCount}>{stats.ageDistribution.last24h}</span>
              </div>
              <div className={styles.distributionItem}>
                <span>Last 7 days</span>
                <span className={styles.distributionCount}>{stats.ageDistribution.last7days}</span>
              </div>
              <div className={styles.distributionItem}>
                <span>Older</span>
                <span className={styles.distributionCount}>{stats.ageDistribution.older}</span>
              </div>
            </div>
          </div>

          {/* Cache Settings */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Cache Settings</h2>

            <div className={styles.managementGrid}>
              <div className={styles.managementCard}>
                <h3>Cache Expiry Time</h3>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  Number of days to keep cached words before auto-deletion
                </p>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  placeholder="Days (e.g., 7)"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className={styles.input}
                />
                <button
                  onClick={handleSaveSettings}
                  className={styles.button}
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              <div className={styles.managementCard}>
                <h3>Current Settings</h3>
                {settings ? (
                  <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                    <div><strong>Expiry Days:</strong> {settings.expiryDays} days</div>
                    <div><strong>Cache Version:</strong> {settings.version}</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                      Cache older than {settings.expiryDays} days will be automatically deleted.
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#999' }}>Loading settings...</div>
                )}
              </div>
            </div>
          </div>

          {/* Cache Management */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Cache Management</h2>

            <div className={styles.managementGrid}>
              <div className={styles.managementCard}>
                <h3>Clear Specific Word</h3>
                <input
                  type="text"
                  placeholder="Word (e.g., haus)"
                  value={invalidateWord}
                  onChange={(e) => setInvalidateWord(e.target.value)}
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="Language (optional, e.g., vi)"
                  value={invalidateLang}
                  onChange={(e) => setInvalidateLang(e.target.value)}
                  className={styles.input}
                />
                <button
                  onClick={() => handleInvalidate('word')}
                  className={styles.dangerButton}
                  disabled={loading}
                >
                  Clear Word
                </button>
              </div>

              <div className={styles.managementCard}>
                <h3>Clear All Cache</h3>
                <p className={styles.warningText}>
                  Warning: This will delete ALL cache entries.
                </p>
                <button
                  onClick={() => handleInvalidate('all')}
                  className={styles.dangerButton}
                  disabled={loading}
                >
                  Clear All Cache
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </AdminDashboardLayout>
  );
};

export default AdminCacheDashboard;
