import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to detect if the app is running on a native platform (iOS or Android)
 * @returns {Object} - { isNative, platform, isIOS, isAndroid }
 */
export const useIsNativeApp = () => {
  const [platformInfo, setPlatformInfo] = useState({
    isNative: false,
    platform: 'web',
    isIOS: false,
    isAndroid: false
  });

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    
    setPlatformInfo({
      isNative,
      platform,
      isIOS: platform === 'ios',
      isAndroid: platform === 'android'
    });
  }, []);

  return platformInfo;
};

export default useIsNativeApp;
