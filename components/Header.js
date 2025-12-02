import React, { useReducer, useRef, useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import { useAnswerStreak, getStreakLevel } from '../context/AnswerStreakContext';
import { getDefaultAvatar } from '../lib/helpers/avatar';
import NotificationDropdown from './NotificationDropdown';
import LoginModal from './LoginModal';
import styles from '../styles/Header.module.css';

// Day labels for weekly progress (Monday to Sunday)
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Initial state for header UI
const initialState = {
  mobileMenuOpen: false,
  userMenuOpen: false,
  languageMenuOpen: false,
  notificationDropdownOpen: false,
  showPointsPlusOne: false,
  pointsPlusValue: 1,
  showPointsMinus: false,
  pointsMinusValue: -0.5,
  loginModalOpen: false,
  isScrolled: false,
};

// Reducer for header state management
const headerReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MOBILE_MENU':
      return { ...state, mobileMenuOpen: action.payload };
    case 'SET_USER_MENU':
      return { ...state, userMenuOpen: action.payload };
    case 'SET_LANGUAGE_MENU':
      return { ...state, languageMenuOpen: action.payload };
    case 'SET_NOTIFICATION_DROPDOWN':
      return { ...state, notificationDropdownOpen: action.payload };
    case 'SET_LOGIN_MODAL':
      return { ...state, loginModalOpen: action.payload };
    case 'SET_SCROLLED':
      return { ...state, isScrolled: action.payload };
    case 'SHOW_POINTS_PLUS':
      return { ...state, showPointsPlusOne: true, pointsPlusValue: action.payload };
    case 'HIDE_POINTS_PLUS':
      return { ...state, showPointsPlusOne: false };
    case 'SHOW_POINTS_MINUS':
      return { ...state, showPointsMinus: true, pointsMinusValue: action.payload };
    case 'HIDE_POINTS_MINUS':
      return { ...state, showPointsMinus: false };
    case 'CLOSE_ALL_MENUS':
      return { ...state, userMenuOpen: false, languageMenuOpen: false, notificationDropdownOpen: false };
    default:
      return state;
  }
};

const Header = () => {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(headerReducer, initialState);
  const userMenuRef = useRef(null);
  const languageMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const router = useRouter();
  const { user, logout, userPoints, fetchUserPoints } = useAuth();
  const { theme, toggleTheme, currentTheme } = useTheme();
  const { currentLanguage, changeLanguage, languages, currentLanguageInfo } = useLanguage();
  const { unreadCount, fetchUnreadCount } = useNotifications();
  const { currentStreak, maxStreak, showCelebration, celebrationStreak } = useAnswerStreak();
  const [showStreakTooltip, setShowStreakTooltip] = useState(false);
  
  // Get weekly progress from user (for attendance tracking)
  const weeklyProgress = user?.streak?.weeklyProgress || [false, false, false, false, false, false, false];
  
  // Get current day index (0 = Monday, 6 = Sunday)
  const getCurrentDayIndex = () => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  };
  const todayIndex = getCurrentDayIndex();

  // Detect scroll for transparent header
  useEffect(() => {
    const handleScroll = () => {
      dispatch({ type: 'SET_SCROLLED', payload: window.scrollY > 20 });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show points animation (positive points)
  const showPointsAnimation = useCallback((points = 1) => {
    dispatch({ type: 'SHOW_POINTS_PLUS', payload: points });
    setTimeout(() => {
      dispatch({ type: 'HIDE_POINTS_PLUS' });
    }, 1500);
  }, []);

  // Show points animation (negative points)
  const showPointsMinusAnimation = useCallback((points = -0.5) => {
    dispatch({ type: 'SHOW_POINTS_MINUS', payload: points });
    setTimeout(() => {
      dispatch({ type: 'HIDE_POINTS_MINUS' });
    }, 1500);
  }, []);

  // Fetch user points on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUserPoints();
    }
  }, [user, fetchUserPoints]);

  // Expose animation functions globally (separate effect to avoid re-assignment issues)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.refreshUserPoints = fetchUserPoints;
      window.showPointsPlusOne = showPointsAnimation;
      window.showPointsMinus = showPointsMinusAnimation;
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.refreshUserPoints = null;
        window.showPointsPlusOne = null;
        window.showPointsMinus = null;
      }
    };
  }, [fetchUserPoints, showPointsAnimation, showPointsMinusAnimation]);

  // Listen for points update events from other pages
  useEffect(() => {
    const handlePointsUpdate = () => {
      if (user) {
        fetchUserPoints();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointsUpdated', handlePointsUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointsUpdated', handlePointsUpdate);
      }
    };
  }, [user, fetchUserPoints]);

  const navLinks = [
    { href: '/', label: t('header.nav.topics') },
    { href: '/leaderboard', label: t('header.nav.leaderboard') },
    // { href: '/city-builder', label: '🏙️ Thành phố' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        dispatch({ type: 'SET_USER_MENU', payload: false });
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        dispatch({ type: 'SET_LANGUAGE_MENU', payload: false });
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        dispatch({ type: 'SET_NOTIFICATION_DROPDOWN', payload: false });
      }
    };

    if (state.userMenuOpen || state.languageMenuOpen || state.notificationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [state.userMenuOpen, state.languageMenuOpen, state.notificationDropdownOpen]);

  const toggleUserMenu = () => {
    dispatch({ type: 'SET_USER_MENU', payload: !state.userMenuOpen });
  };

  const toggleLanguageMenu = () => {
    dispatch({ type: 'SET_LANGUAGE_MENU', payload: !state.languageMenuOpen });
  };

  const handleLogout = async () => {
    dispatch({ type: 'SET_USER_MENU', payload: false });
    await logout();
  };

  return (
    <header className={`${styles.header} ${state.isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerContent}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>🦜</div>
          <span className={styles.logoText}>PapaGeil</span>
        </Link>

        <nav className={`${styles.nav} ${state.mobileMenuOpen ? styles.open : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${isActive(link.href) ? styles.active : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.rightSection}>
          {/* Desktop only: Theme toggle */}
          <button
            className={styles.themeToggleDesktop}
            onClick={toggleTheme}
            aria-label={t('header.themeToggle')}
            title={currentTheme?.label || t('header.themeToggle')}
          >
            {currentTheme?.emoji || '🌅'}
          </button>

          {/* Desktop only: Language selector */}
          <div className={styles.languageMenuContainerDesktop} ref={languageMenuRef}>
            <button
              className={styles.languageSelector}
              onClick={toggleLanguageMenu}
              aria-label="Language"
              aria-expanded={state.languageMenuOpen}
            >
              <span>{currentLanguageInfo.flag}</span>
              <span>{currentLanguageInfo.nativeName}</span>
            </button>

            {state.languageMenuOpen && (
              <div className={styles.languageDropdown}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`${styles.languageItem} ${
                      lang.code === currentLanguage ? styles.active : ''
                    }`}
                    onClick={() => {
                      changeLanguage(lang.code);
                      dispatch({ type: 'SET_LANGUAGE_MENU', payload: false });
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                    {lang.code === currentLanguage && <span className={styles.checkmark}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user && (
            <>
              {/* Answer Streak Badge with weekly progress tooltip */}
              <div 
                className={styles.streakContainer}
                onMouseEnter={() => setShowStreakTooltip(true)}
                onMouseLeave={() => setShowStreakTooltip(false)}
              >
                <div 
                  className={`${styles.streakBadge} ${
                    currentStreak >= 15 ? styles.streakLegendary :
                    currentStreak >= 10 ? styles.streakFire :
                    currentStreak >= 5 ? styles.streakHot :
                    currentStreak === 0 ? styles.streakInactive : ''
                  }`}
                >
                  <span className={styles.streakIcon}>🔥</span>
                  <span className={styles.streakValue}>{currentStreak}</span>
                </div>
                
                {/* Weekly Progress Tooltip */}
                {showStreakTooltip && (
                  <div className={styles.streakTooltip}>
                    <div className={styles.streakTooltipTitle}>
                      Chuỗi đúng: {currentStreak} (max: {maxStreak})
                    </div>
                    <div className={styles.streakTooltipSubtitle}>
                      Điểm danh tuần này
                    </div>
                    <div className={styles.weeklyProgress}>
                      {DAY_LABELS.map((day, index) => (
                        <div 
                          key={day} 
                          className={`${styles.dayItem} ${
                            weeklyProgress[index] ? styles.dayActive : ''
                          } ${index === todayIndex ? styles.dayToday : ''}`}
                        >
                          <span className={styles.dayLabel}>{day}</span>
                          <span className={styles.dayCheck}>
                            {weeklyProgress[index] ? '✓' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {showCelebration && (
                  <div className={styles.streakCelebration}>
                    {celebrationStreak} 🔥
                  </div>
                )}
              </div>

              <div className={styles.pointsContainer}>
                <div className={styles.pointsBadge} title={t('header.points')}>
                  <span className={styles.pointsIcon}>💎</span>
                  <span className={styles.pointsValue}>{userPoints || 0}</span>
                </div>

                {state.showPointsPlusOne && (
                  <div className={styles.pointsPlusOne}>+{state.pointsPlusValue}</div>
                )}

                {state.showPointsMinus && (
                  <div className={styles.pointsMinus}>{state.pointsMinusValue}</div>
                )}
              </div>

              <div className={styles.notificationContainer} ref={notificationMenuRef}>
                <button
                  className={styles.notificationBtn}
                  onClick={() => dispatch({ type: 'SET_NOTIFICATION_DROPDOWN', payload: !state.notificationDropdownOpen })}
                  title={t('header.notifications')}
                  aria-label={t('header.notifications')}
                  aria-expanded={state.notificationDropdownOpen}
                >
                  <span>🔔</span>
                  {unreadCount > 0 && (
                    <span className={styles.notificationBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                {state.notificationDropdownOpen && (
                  <NotificationDropdown
                    isOpen={state.notificationDropdownOpen}
                    onClose={() => {
                      dispatch({ type: 'SET_NOTIFICATION_DROPDOWN', payload: false });
                      fetchUnreadCount();
                    }}
                  />
                )}
              </div>

              <div className={styles.userMenuContainer} ref={userMenuRef}>
                <button
                  className={styles.userAvatarBtn}
                  onClick={toggleUserMenu}
                  aria-label={t('header.userMenu.label')}
                  aria-expanded={state.userMenuOpen}
                >
                  <Image
                    src={user.avatar || getDefaultAvatar(user.name)}
                    alt={user.name || t('header.userMenu.user')}
                    width={40}
                    height={40}
                    className={styles.userAvatar}
                  />
                </button>

                {state.userMenuOpen && (
                  <div className={styles.userDropdown}>
                    <div className={styles.userDropdownHeader}>
                      <div className={styles.userDropdownAvatar}>
                        <Image
                          src={user.avatar || getDefaultAvatar(user.name)}
                          alt={user.name || t('header.userMenu.user')}
                          width={48}
                          height={48}
                          className={styles.dropdownAvatar}
                        />
                      </div>
                      <div className={styles.userDropdownInfo}>
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                      </div>
                    </div>

                    <div className={styles.userDropdownDivider}></div>

                    <div className={styles.userDropdownMenu}>
                      <Link
                        href="/profile"
                        className={styles.userDropdownItem}
                        onClick={() => dispatch({ type: 'SET_USER_MENU', payload: false })}
                      >
                        <span className={styles.dropdownIcon}>👤</span>
                        <span>{t('header.userMenu.dashboard')}</span>
                      </Link>

                      <Link
                        href="/profile/vocabulary"
                        className={styles.userDropdownItem}
                        onClick={() => dispatch({ type: 'SET_USER_MENU', payload: false })}
                      >
                        <span className={styles.dropdownIcon}>📚</span>
                        <span>{t('header.userMenu.myVocabulary')}</span>
                      </Link>

                      <Link
                        href="/leaderboard"
                        className={styles.userDropdownItem}
                        onClick={() => dispatch({ type: 'SET_USER_MENU', payload: false })}
                      >
                        <span className={styles.dropdownIcon}>🏆</span>
                        <span>{t('header.userMenu.leaderboard')}</span>
                      </Link>

                      <Link
                        href="/profile/settings"
                        className={styles.userDropdownItem}
                        onClick={() => dispatch({ type: 'SET_USER_MENU', payload: false })}
                      >
                        <span className={styles.dropdownIcon}>⚙️</span>
                        <span>{t('header.userMenu.settings')}</span>
                      </Link>

                      {/* Mobile only: Theme & Language in dropdown */}
                      <div className={styles.mobileOnlySection}>
                        <div className={styles.userDropdownDivider}></div>
                        <button
                          className={styles.userDropdownItem}
                          onClick={() => {
                            toggleTheme();
                          }}
                        >
                          <span className={styles.dropdownIcon}>{currentTheme?.emoji || '🌅'}</span>
                          <span>{currentTheme?.label || t('header.themeToggle')}</span>
                        </button>
                        <div className={styles.languageSubMenu}>
                          <span className={styles.languageSubMenuLabel}>
                            <span className={styles.dropdownIcon}>🌐</span>
                            <span>{t('header.language') || 'Language'}</span>
                          </span>
                          <div className={styles.languageOptions}>
                            {languages.map((lang) => (
                              <button
                                key={lang.code}
                                className={`${styles.languageOptionBtn} ${
                                  lang.code === currentLanguage ? styles.active : ''
                                }`}
                                onClick={() => changeLanguage(lang.code)}
                              >
                                <span>{lang.flag}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {user.role === 'admin' && (
                        <>
                          <div className={styles.userDropdownDivider}></div>
                          <Link
                            href="/admin/dashboard"
                            className={`${styles.userDropdownItem} ${styles.adminItem}`}
                            onClick={() => dispatch({ type: 'SET_USER_MENU', payload: false })}
                          >
                            <span className={styles.dropdownIcon}>👑</span>
                            <span>{t('header.userMenu.adminArea')}</span>
                          </Link>
                        </>
                      )}

                      <div className={styles.userDropdownDivider}></div>

                      <button
                        className={`${styles.userDropdownItem} ${styles.logoutItem}`}
                        onClick={handleLogout}
                      >
                        <span className={styles.dropdownIcon}>🚪</span>
                        <span>{t('header.userMenu.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!user && (
            <>
              <button
                onClick={() => dispatch({ type: 'SET_LOGIN_MODAL', payload: true })}
                className={styles.loginBtn}
              >
                {t('header.auth.login')}
              </button>
            </>
          )}

           <LoginModal
             isOpen={state.loginModalOpen}
             onClose={() => dispatch({ type: 'SET_LOGIN_MODAL', payload: false })}
           />
        </div>
      </div>
    </header>
  );
};

export default Header;
