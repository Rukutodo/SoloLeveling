'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'sololeveling' | 'onedark' | 'rosepine' | 'catppuccin' | 'gruvbox';

export interface ThemeInfo {
  id: ThemeName;
  label: string;
  colors: [string, string, string, string]; // 4 preview swatch colors
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'sololeveling',
    label: 'Solo Leveling',
    colors: ['hsl(240,15%,4%)', 'hsl(190,100%,50%)', 'hsl(270,90%,65%)', 'hsl(45,100%,50%)'],
  },
  {
    id: 'onedark',
    label: 'One Dark',
    colors: ['hsl(220,13%,18%)', 'hsl(207,82%,66%)', 'hsl(286,60%,67%)', 'hsl(39,67%,69%)'],
  },
  {
    id: 'rosepine',
    label: 'Rosé Pine',
    colors: ['hsl(249,22%,12%)', 'hsl(189,43%,73%)', 'hsl(267,57%,78%)', 'hsl(343,76%,68%)'],
  },
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    colors: ['hsl(240,21%,15%)', 'hsl(217,92%,76%)', 'hsl(267,84%,81%)', 'hsl(343,81%,75%)'],
  },
  {
    id: 'gruvbox',
    label: 'Gruvbox',
    colors: ['hsl(0,0%,16%)', 'hsl(27,83%,53%)', 'hsl(61,66%,44%)', 'hsl(157,29%,52%)'],
  },
];

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'sololeveling',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('sololeveling');
  const [mounted, setMounted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Read persisted theme on mount
  useEffect(() => {
    const stored = localStorage.getItem('sl-theme') as ThemeName | null;
    if (stored && THEMES.some(t => t.id === stored)) {
      setThemeState(stored);
      applyTheme(stored);
    }
    setMounted(true);
  }, []);

  const applyTheme = (t: ThemeName) => {
    const html = document.documentElement;
    if (t === 'sololeveling') {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', t);
    }
  };

  const setTheme = (t: ThemeName) => {
    setTransitioning(true);
    setTimeout(() => {
      setThemeState(t);
      applyTheme(t);
      localStorage.setItem('sl-theme', t);
    }, 175);
    setTimeout(() => setTransitioning(false), 525);
  };

  // Prevent flash of wrong theme
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
      {transitioning && <div className="theme-overlay" />}
    </ThemeContext.Provider>
  );
}
