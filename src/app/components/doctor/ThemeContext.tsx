import { createContext, useContext, useState, ReactNode } from 'react';
import { ColorTheme, getColors, getShadows } from './colors';

interface Shadows {
  card: string;
  hover: string;
  modal: string;
}

interface ThemeContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
  c: ColorTheme;
  sh: Shadows;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

interface ThemeProviderProps {
  children: ReactNode;
  darkMode: boolean;
  onToggleDark: () => void;
}

export function ThemeProvider({ children, darkMode, onToggleDark }: ThemeProviderProps) {
  const c = getColors(darkMode);
  const sh = getShadows(darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode: onToggleDark, c, sh }}>
      {children}
    </ThemeContext.Provider>
  );
}
