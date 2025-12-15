import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { NotificationProvider } from '../context/NotificationContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/globals.css';
import '../lib/i18n';

import Header from '../components/Header';
import Footer from '../components/Footer';
import OfflineIndicator from '../components/OfflineIndicator';
import FixedSocialShare from '../components/FixedSocialShare';
import CookieConsent from '../components/CookieConsent';
import BottomNavigation from '../components/BottomNavigation';
import IOSBackButton from '../components/IOSBackButton';
import { registerServiceWorker } from '../lib/serviceWorker';
import { useIsNativeApp } from '../lib/hooks/useIsNativeApp';

function Layout({ children }) {
  const router = useRouter();
  const isHomePage = router.pathname === '/';
  const isAdminPage = router.pathname.startsWith('/admin');
  const { isIOS } = useIsNativeApp();

  // Hide header and footer on iOS native app
  const shouldHideHeaderFooter = isAdminPage || isIOS;

  return (
    <>
      {/* IOSBackButton handles its own visibility logic */}
      <IOSBackButton />
      {!shouldHideHeaderFooter && <Header />}
      {children}
      {!shouldHideHeaderFooter && <Footer />}
    </>
  );
}

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  // Register Service Worker for offline mode
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker()
        .then(registration => {
          if (registration) {
            console.log('✅ Service Worker registered for offline mode');
          }
        })
        .catch(error => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <SessionProvider session={session}>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <Head>
                <title>papageil.net</title>
                <meta name="description" content="Learn German with Shadowing and Dictation methods" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
                <link rel="icon" href="/favicon.ico" />
                <link rel="manifest" href="/manifest.json" />
              </Head>

              <div className="App">
                <Layout>
                  <Component {...pageProps} />
                </Layout>
              </div>
              
              {/* Bottom Navigation (iOS only) */}
              <BottomNavigation />
              
              {/* Fixed Social Share Button */}
              <FixedSocialShare />
              
              {/* Offline Indicator */}
              <OfflineIndicator />
              
              {/* Cookie Consent Banner */}
              <CookieConsent />
              
              <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
              />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}

export default MyApp;
