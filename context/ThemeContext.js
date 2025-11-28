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
  },
  {
    id: 'light',
    emoji: '☀️'
  },
  {
    id: 'auto',
    emoji: '🌗'
  }
];

let DEFAULT_THEME_ID = 'light'; // Will be updated from server settings

const getNextThemeId = (currentId) => {
  // Only cycle between light and dark for toggle (skip auto)
  if (currentId === 'light') return 'dark';
  return 'light';
};

const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light';
};

const resolveThemeFromPreference = (preference) => {
  if (preference === 'auto') {
    return getSystemTheme();
  }
  return preference;
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
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          const serverDefaultTheme = settings.defaultTheme || 'light';
          
          // Update default theme constant
          DEFAULT_THEME_ID = serverDefaultTheme;
          
          // Apply server default theme
          const isValid = THEME_OPTIONS.some((option) => option.id === serverDefaultTheme);
          if (isValid) {
            setThemePreference(serverDefaultTheme);
            window.localStorage.setItem('theme', serverDefaultTheme);
          }
        } else {
          // Fallback to light if API fails
          window.localStorage.setItem('theme', themePreference);
        }
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
    // Toggle only cycles between light and dark, ignoring auto
    setThemePreference((current) => {
      const resolved = resolveThemeFromPreference(current);
      return getNextThemeId(resolved);
    });
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
