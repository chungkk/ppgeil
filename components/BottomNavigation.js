import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaCompass, FaBookmark, FaBars } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { useIsNativeApp } from '../lib/hooks/useIsNativeApp';
import styles from '../styles/BottomNavigation.module.css';

const BottomNavigation = () => {
  const router = useRouter();
  const { isIOS } = useIsNativeApp();

  // Only show on iOS native app
  if (!isIOS) return null;

  // Hide in lesson pages
  const isLessonPage = router.pathname === '/[lessonId]' || 
                       router.pathname.startsWith('/dictation/') ||
                       router.pathname.startsWith('/self-lesson/') ||
                       router.pathname.startsWith('/practice/') ||
                       router.pathname.startsWith('/leben-in-deutschland/');
  
  if (isLessonPage) return null;

  const navItems = [
    {
      href: '/',
      label: 'Für dich',
      icon: <HiSparkles size={26} />,
      match: (path) => path === '/'
    },
    {
      href: '/dashboard',
      label: 'Entdecken',
      icon: <FaCompass size={24} />,
      match: (path) => path.startsWith('/dashboard') || path.startsWith('/category')
    },
    {
      href: '/profile/vocabulary',
      label: 'Bibliothek',
      icon: <FaBookmark size={24} />,
      match: (path) => path.startsWith('/profile/vocabulary')
    },
    {
      href: '/profile',
      label: 'Mehr',
      icon: <FaBars size={24} />,
      match: (path) => path.startsWith('/profile') && !path.startsWith('/profile/vocabulary')
    }
  ];

  const isActive = (item) => {
    return item.match(router.pathname);
  };

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.navContainer}>
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.active : ''}`}
            >
              <div className={styles.iconWrapper}>
                {item.icon}
              </div>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
