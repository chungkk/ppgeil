import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';
import { useTranslation } from 'react-i18next';

const ThemeContext = createContext();

export const THEME_OPTIONS = [
  {
    id: 'dark',
    emoji: '🌙'
  }
];

let DEFAULT_THEME_ID = 'dark'; // Force dark mode only

const getNextThemeId = (currentId) => {
  // Always return dark - no toggle
  return 'dark';
};

const getSystemTheme = () => {
  // Always return dark mode
  return 'dark';
};

const resolveThemeFromPreference = (preference) => {
  // Always return dark mode
  return 'dark';
};

const resolveInitialTheme = () => {
  // Always return default theme initially for consistent server/client rendering
  return DEFAULT_THEME_ID;
};

export function ThemeProvider({ children }) {
  const { t } = useTranslation();
  const [themePreference, setThemePreference] = useState(resolveInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState(resolveInitialTheme);

  const applyTheme = useCallback((themeId) => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', themeId);
  }, []);

  useEffect(() => {
    // Fetch system settings and set default theme
    const initializeTheme = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Check if user has saved preference in localStorage
        const savedTheme = window.localStorage.getItem('theme');
        
        if (savedTheme) {
          // User has a saved preference - use it
          const isValid = THEME_OPTIONS.some((option) => option.id === savedTheme);
          if (isValid && savedTheme !== themePreference) {
            setThemePreference(savedTheme);
            return;
          }
        }

        // No saved preference - fetch default from server
        // Always force dark mode - ignore server settings
        setThemePreference('dark');
        window.localStorage.setItem('theme', 'dark');
      } catch (error) {
        console.error('Failed to fetch theme settings:', error);
        // Fallback to current preference
        window.localStorage.setItem('theme', themePreference);
      }
    };

    initializeTheme();
  }, []); // Run only once on mount

  // Update resolved theme when preference changes
  useEffect(() => {
    const resolved = resolveThemeFromPreference(themePreference);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', themePreference);
    }
  }, [themePreference, applyTheme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (typeof window === 'undefined' || themePreference !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Fallback for older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [themePreference, applyTheme]);

  const selectTheme = useCallback((themeId) => {
    const isValidTheme = THEME_OPTIONS.some((option) => option.id === themeId);
    if (!isValidTheme) return;
    setThemePreference((current) => (current === themeId ? current : themeId));
  }, []);

  const toggleTheme = useCallback(() => {
    // Always keep dark mode - no toggling
    setThemePreference('dark');
  }, []);

  const value = useMemo(() => {
    const themeOptionsWithTranslations = THEME_OPTIONS.map(option => ({
      ...option,
      label: t(`theme.${option.id}.label`),
      description: t(`theme.${option.id}.description`)
    }));

    const currentThemeOption = themeOptionsWithTranslations.find((option) => option.id === themePreference) || themeOptionsWithTranslations[0];
    const nextThemeId = getNextThemeId(resolvedTheme);
    const nextTheme = themeOptionsWithTranslations.find((option) => option.id === nextThemeId);

    return {
      theme: resolvedTheme, // The actual applied theme (light or dark)
      themePreference, // User's preference (light, dark, or auto)
      themeOptions: themeOptionsWithTranslations,
      currentTheme: currentThemeOption,
      nextTheme,
      setTheme: selectTheme,
      toggleTheme
    };
  }, [resolvedTheme, themePreference, selectTheme, toggleTheme, t]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
