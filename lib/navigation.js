/**
 * Navigation helper functions to ensure language-aware routing
 * Wraps Next.js router to preserve locale in all navigations
 */

/**
 * Navigate to a path while preserving the current locale
 * @param {Object} router - Next.js router instance
 * @param {string} path - The path to navigate to
 * @param {Object} options - Additional router options
 */
export const navigateWithLocale = (router, path, options = {}) => {
  const locale = router.locale || 'de';
  router.push(path, path, { locale, ...options });
};

/**
 * Get a localized path for use in Link components
 * @param {string} path - The path to localize
 * @param {string} locale - The locale to use (defaults to current)
 * @returns {string} - The localized path
 */
export const getLocalizedPath = (path, locale = 'de') => {
  // Next.js Link components automatically add locale prefix when i18n is enabled
  // This function is for manual path construction if needed
  return path;
};

/**
 * Replace current route with a new one while preserving locale
 * @param {Object} router - Next.js router instance
 * @param {string} path - The path to navigate to
 * @param {Object} options - Additional router options
 */
export const replaceWithLocale = (router, path, options = {}) => {
  const locale = router.locale || 'de';
  router.replace(path, path, { locale, ...options });
};
