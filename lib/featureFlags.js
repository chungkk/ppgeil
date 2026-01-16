// Feature Flags System for A/B Testing
// Uses localStorage for persistence and random assignment

const FEATURE_FLAGS_KEY = 'feature_flags';

/**
 * Get all feature flags for current user
 */
export const getFeatureFlags = () => {
  if (typeof window === 'undefined') return {};

  try {
    const flags = localStorage.getItem(FEATURE_FLAGS_KEY);
    return flags ? JSON.parse(flags) : {};
  } catch (error) {
    console.error('Error getting feature flags:', error);
    return {};
  }
};

/**
 * Set a feature flag value
 */
export const setFeatureFlag = (flagName, value) => {
  if (typeof window === 'undefined') return;

  try {
    const flags = getFeatureFlags();
    flags[flagName] = value;
    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
  } catch (error) {
    console.error('Error setting feature flag:', error);
  }
};

/**
 * Check if a feature is enabled (with A/B testing support)
 * @param {string} flagName - Name of the feature flag
 * @param {number} rolloutPercentage - Percentage of users to enable (0-100)
 * @returns {boolean}
 */
export const isFeatureEnabled = (flagName, rolloutPercentage = 100) => {
  if (typeof window === 'undefined') return false;

  const flags = getFeatureFlags();

  // If flag is already set, return that value
  if (flagName in flags) {
    return flags[flagName];
  }

  // New user - assign randomly based on rollout percentage
  const randomValue = Math.random() * 100;
  const isEnabled = randomValue < rolloutPercentage;

  // Save assignment for consistency
  setFeatureFlag(flagName, isEnabled);

  return isEnabled;
};

/**
 * Feature Flags Configuration
 */
export const FEATURES = {
  // Loading state: skeleton vs spinner
  // 50% users see skeleton, 50% see spinner
  USE_SKELETON_LOADING: 'use_skeleton_loading',

  // Other potential flags
  CONFETTI_ANIMATION: 'confetti_animation',
  SWIPE_TO_CLOSE: 'swipe_to_close',
  ANALYTICS_ENABLED: 'analytics_enabled',
};

/**
 * Get current A/B test variant for a feature
 * @param {string} flagName
 * @returns {string} 'control' or 'variant'
 */
export const getABTestVariant = (flagName) => {
  return isFeatureEnabled(flagName) ? 'variant' : 'control';
};

/**
 * Track which variant user is in (for analytics)
 */
export const getAllVariants = () => {
  const flags = getFeatureFlags();
  const variants = {};

  Object.values(FEATURES).forEach(featureName => {
    variants[featureName] = flags[featureName] !== undefined
      ? (flags[featureName] ? 'variant' : 'control')
      : 'not_assigned';
  });

  return variants;
};

/**
 * Reset all feature flags (for testing)
 */
export const resetFeatureFlags = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FEATURE_FLAGS_KEY);
};

const featureFlags = {
  getFeatureFlags,
  setFeatureFlag,
  isFeatureEnabled,
  getABTestVariant,
  getAllVariants,
  resetFeatureFlags,
  FEATURES
};

export default featureFlags;
