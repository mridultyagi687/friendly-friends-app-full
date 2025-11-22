import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark mode
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    // Apply theme class to body for global styles
    document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
  }, [isDarkMode]);

  // Initialize body class on mount
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    colors: {
      // Always use modern theme colors (keep glassmorphism and gradients)
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      cardBackground: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(30, 30, 60, 0.95) 100%)',
      text: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textTertiary: 'rgba(255, 255, 255, 0.5)',
      border: 'rgba(255, 255, 255, 0.15)',
      glassBackground: 'rgba(255, 255, 255, 0.1)',
      sidebarBackground: 'linear-gradient(180deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      // Only input/textarea backgrounds change with theme
      // Ensure opposite colors for proper contrast
      inputBackground: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#ffffff',
      inputText: isDarkMode ? '#ffffff' : '#000000', // White text on dark bg, black text on white bg
      inputPlaceholder: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
    }
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

