import React, { createContext, useContext, useState, useEffect } from 'react';

export const LIGHT = {
  mode: 'light',
  bg: '#f3f4f6',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  headerBg: '#2563eb',
  headerText: '#ffffff',
  tabBarBg: '#ffffff',
};

export const DARK = {
  mode: 'dark',
  bg: '#0f1115',
  card: '#1a1d23',
  border: '#2a2d34',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  textFaint: '#6b7280',
  headerBg: '#1e3a8a',
  headerText: '#ffffff',
  tabBarBg: '#1a1d23',
};

const ThemeContext = createContext({ theme: LIGHT, isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('afya_theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('afya_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const theme = isDark ? DARK : LIGHT;
  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
