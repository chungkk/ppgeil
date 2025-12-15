import React from 'react';
import { useRouter } from 'next/router';
import { useIsNativeApp } from '../lib/hooks/useIsNativeApp';
import styles from '../styles/IOSBackButton.module.css';

/**
 * iOS-style back button component
 * DEPRECATED: Now integrated into DictationHeader component
 * This component is kept for backward compatibility but returns null
 */
const IOSBackButton = ({ className = '' }) => {
  // Back button is now integrated into DictationHeader
  // Return null to avoid rendering duplicate button
  return null;
};

export default IOSBackButton;
