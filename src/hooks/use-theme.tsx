import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'night' | 'day';

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
};

const Ctx = createContext<ThemeCtx>({ theme: 'night', toggle: () => {} });

const KEY = 'obshaga-theme';
const BAR = { night: '#1E3ACC', day: '#A9DDF4' };

const read = (): Theme => {
  if (typeof window === 'undefined') return 'night';
  const saved = window.localStorage.getItem(KEY);
  return saved === 'day' ? 'day' : 'night';
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('day', theme === 'day');
    root.style.colorScheme = theme === 'day' ? 'light' : 'dark';
    window.localStorage.setItem(KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', BAR[theme]);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'day' ? 'night' : 'day'));

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
};

export const useTheme = () => useContext(Ctx);