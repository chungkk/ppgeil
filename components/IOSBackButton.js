import React from 'react';
import { useRouter } from 'next/router';
import { useIsNativeApp } from '../lib/hooks/useIsNativeApp';
import styles from '../styles/IOSBackButton.module.css';

/**
 * iOS-style back button component
 * Only shows on iOS native app (except on home page)
 * Navigates to home page when clicked
 */
const IOSBackButton = ({ className = '' }) => {
  const router = useRouter();
  const { isIOS } = useIsNativeApp();

  // Only show on iOS native app
  if (!isIOS) return null;

  // Hide on home page
  const isHomePage = router.pathname === '/';
  if (isHomePage) return null;

  const handleBack = () => {
    router.push('/');
  };

  return (
    <button 
      className={`${styles.backButton} ${className}`}
      onClick={handleBack}
      aria-label="Go back"
    >
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
};

export default IOSBackButton;
