
import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('SISFILA_THEME');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('SISFILA_THEME', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('SISFILA_THEME', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return { isDarkMode, toggleTheme };
}
