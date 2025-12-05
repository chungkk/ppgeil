import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import styles from '../styles/CookieConsent.module.css';

const translations = {
  vi: {
    message: 'Trang web sử dụng cookie để cải thiện trải nghiệm của bạn.',
    accept: 'OK',
    learnMore: 'Tìm hiểu thêm'
  },
  de: {
    message: 'Diese Website verwendet Cookies für ein besseres Erlebnis.',
    accept: 'OK',
    learnMore: 'Mehr erfahren'
  },
  en: {
    message: 'This site uses cookies to improve your experience.',
    accept: 'OK',
    learnMore: 'Learn more'
  }
};

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const { language } = useLanguage();
  
  const t = translations[language] || translations.de;

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Delay showing the banner for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.banner}>
      <span className={styles.cookieEmoji}>🍪</span>
      <span className={styles.message}>{t.message}</span>
      <Link href="/privacy" className={styles.learnMore}>{t.learnMore}</Link>
      <button className={styles.acceptButton} onClick={handleAccept}>{t.accept}</button>
    </div>
  );
}
