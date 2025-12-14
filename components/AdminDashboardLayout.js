import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/adminLayout.module.css';

const AdminDashboardLayout = ({ children }) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false); // for mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // for desktop
  const [userName, setUserName] = useState('Admin');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false); // for user dropdown

  useEffect(() => {
    // Get user info from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.name || userData.email || 'Admin');
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const navSections = [
    {
      label: 'Main',
      items: [
        { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
        { href: '/admin/dashboard/files', label: 'Dateien', icon: '📁' },
      ]
    },
    {
      label: 'Content',
      items: [
        { href: '/admin/dashboard/lesson/new', label: 'Neue Lektion', icon: '➕' },
        { href: '/admin/dashboard/pages', label: 'Seiteninhalte', icon: '📄' },
        { href: '/admin/dashboard/categories', label: 'Vokabelkategorien', icon: '🏷️' },
      ]
    },
    {
      label: 'Settings',
      items: [
        { href: '/admin/settings', label: 'Einstellungen', icon: '⚙️' },
        { href: '/admin/cache', label: 'Cache', icon: '💾' },
      ]
    }
  ];

  const isActive = (path) => {
    if (path === '/admin/dashboard') {
      return router.pathname === '/admin/dashboard' || router.pathname === '/admin/dashboard/index';
    }
    return router.pathname.startsWith(path);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const getUserInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={styles.layout}>
      {/* Overlay for mobile */}
      <div 
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarVisible : ''} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoContent}>
            <div className={styles.logoIcon}>🎓</div>
            <div className={styles.logoText}>
              <h1 className={styles.logoTitle}>PapaGeil</h1>
              <p className={styles.logoSubtitle}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {navSections.map((section, index) => (
            <div key={index} className={styles.navSection}>
              {!sidebarCollapsed && <div className={styles.navLabel}>{section.label}</div>}
              <ul className={styles.navList}>
                {section.items.map((item) => (
                  <li key={item.href} className={styles.navItem}>
                    <Link
                      href={item.href}
                      className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ''}`}
                      onClick={closeSidebar}
                      title={sidebarCollapsed ? item.label : ''}
                    >
                      <span className={styles.navIcon}>{item.icon}</span>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse Button */}
        <button 
          className={styles.collapseButton}
          onClick={toggleSidebarCollapse}
          title={sidebarCollapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'}
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>

        {/* User Section */}
        {!sidebarCollapsed && (
          <div className={styles.sidebarUser}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {getUserInitials(userName)}
              </div>
              <div className={styles.userDetails}>
                <p className={styles.userName}>{userName}</p>
                <p className={styles.userRole}>Administrator</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Wrapper */}
      <div className={`${styles.mainWrapper} ${sidebarCollapsed ? styles.mainWrapperCollapsed : ''}`}>
        {/* Top Header */}
        <header className={styles.topHeader}>
          <div className={styles.headerLeft}>
            <button 
              className={styles.menuToggle}
              onClick={toggleSidebar}
              aria-label="Toggle menu"
            >
              ☰
            </button>

            <div className={styles.searchBar}>
              <span className={styles.searchIcon}>🔍</span>
              <input 
                type="text" 
                placeholder="Suchen..." 
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.headerRight}>
            <button className={styles.headerButton} title="Benachrichtigungen">
              🔔
              <span className={styles.notificationDot}></span>
            </button>
            
            <button className={styles.headerButton} title="Hilfe">
              ❓
            </button>

            <div className={styles.userMenuWrapper}>
              <button
                className={styles.userButton}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                title="Benutzermenu"
              >
                <div className={styles.userButtonAvatar}>
                  {getUserInitials(userName)}
                </div>
                <span className={styles.userButtonName}>{userName}</span>
                <span className={styles.dropdownArrow}>{userDropdownOpen ? '▲' : '▼'}</span>
              </button>

              {userDropdownOpen && (
                <>
                  <div className={styles.dropdownOverlay} onClick={() => setUserDropdownOpen(false)} />
                  <div className={styles.userDropdown}>
                    <div className={styles.dropdownHeader}>
                      <div className={styles.dropdownAvatar}>
                        {getUserInitials(userName)}
                      </div>
                      <div>
                        <div className={styles.dropdownName}>{userName}</div>
                        <div className={styles.dropdownRole}>Administrator</div>
                      </div>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button
                      className={styles.dropdownItem}
                      onClick={() => {
                        setUserDropdownOpen(false);
                        router.push('/admin/settings');
                      }}
                    >
                      <span>⚙️</span>
                      <span>Einstellungen</span>
                    </button>
                    <button
                      className={styles.dropdownItem}
                      onClick={() => {
                        setUserDropdownOpen(false);
                        router.push('/');
                      }}
                    >
                      <span>🏠</span>
                      <span>Zur Startseite</span>
                    </button>
                    <div className={styles.dropdownDivider} />
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={handleLogout}
                    >
                      <span>🚪</span>
                      <span>Abmelden</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;
