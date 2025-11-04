import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Always apply dark mode
    document.documentElement.classList.add('dark');
  }, []);

  const theme = {
    darkMode: true, // Always dark mode
    toggleDarkMode: () => {}, // No-op function for compatibility
    colors: {
      // Black and white aesthetic for dark mode
      background: '#000000',
      surface: '#0a0a0a',
      surfaceLight: '#1a1a1a',
      surfaceElevated: '#262626',
      text: '#ffffff',
      textSecondary: '#b3b3b3',
      textMuted: '#808080',
      primary: '#ffffff',
      primaryDark: '#e0e0e0',
      accent: '#ffffff',
      border: '#333333',
      borderLight: '#404040',
      success: '#ffffff',
      error: '#ffffff',
      warning: '#ffffff',
      gradient: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
    }
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};
