import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isOnline, subscribeToNetworkStatus } from '../lib/serviceWorker';
import { processSyncQueue } from '../lib/offlineStorage';
import styles from '../styles/OfflineIndicator.module.css';

/**
 * Offline Indicator Component
 * Shows network status and sync progress
 */
const OfflineIndicator = () => {
  const { t } = useTranslation();
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    // Initial status
    setOnline(isOnline());
    
    // Subscribe to network changes
    const unsubscribe = subscribeToNetworkStatus(
      // On online
      async () => {
        setOnline(true);
        setShow(true);
        
        // Auto-hide after 3 seconds
        setTimeout(() => setShow(false), 3000);
        
        // Sync offline data
        setSyncing(true);
        try {
          await processSyncQueue();
        } catch (error) {
          console.error('Failed to sync offline data:', error);
        } finally {
          setSyncing(false);
        }
      },
      // On offline
      () => {
        setOnline(false);
        setShow(true);
      }
    );
    
    return unsubscribe;
  }, []);
  
  // Don't show if online and not syncing
  if (online && !syncing && !show) {
    return null;
  }
  
  return (
    <div className={`${styles.indicator} ${online ? styles.online : styles.offline}`}>
      <div className={styles.content}>
        {syncing ? (
          <>
            <div className={styles.spinner} />
            <span>{t('offlineIndicator.syncing')}</span>
          </>
        ) : online ? (
          <>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{t('offlineIndicator.backOnline')}</span>
          </>
        ) : (
          <>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.415m-1.414-1.415L3 3" />
            </svg>
            <span>{t('offlineIndicator.offlineMode')}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
