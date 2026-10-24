import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'night' | 'day';
export type Palette = 'sky' | 'sunset' | 'mint' | 'sand';

export const PALETTES: { id: Palette; label: string; swatch: string; bar: string }[] = [
  { id: 'sky', label: 'Небо', swatch: '#A9DDF4', bar: '#A9DDF4' },
  { id: 'sunset', label: 'Закат', swatch: '#F8C6A8', bar: '#F8C6A8' },
  { id: 'mint', label: 'Мята', swatch: '#B9E6CF', bar: '#B9E6CF' },
  { id: 'sand', label: 'Песок', swatch: '#F1DFB4', bar: '#F1DFB4' },
];

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
  palette: Palette;
  setPalette: (p: Palette) => void;
};

const Ctx = createContext<ThemeCtx>({
  theme: 'night',
  toggle: () => {},
  palette: 'sky',
  setPalette: () => {},
});

const KEY = 'obshaga-theme';
const PALETTE_KEY = 'obshaga-palette';
const NIGHT_BAR = '#1E3ACC';

const read = (): Theme => {
  if (typeof window === 'undefined') return 'night';
  const saved = window.localStorage.getItem(KEY);
  return saved === 'day' ? 'day' : 'night';
};

const readPalette = (): Palette => {
  if (typeof window === 'undefined') return 'sky';
  const saved = window.localStorage.getItem(PALETTE_KEY);
  return PALETTES.some((p) => p.id === saved) ? (saved as Palette) : 'sky';
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(read);
  const [palette, setPalette] = useState<Palette>(readPalette);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('day', theme === 'day');
    PALETTES.forEach((p) => root.classList.toggle(`day-${p.id}`, theme === 'day' && p.id === palette));
    root.style.colorScheme = theme === 'day' ? 'light' : 'dark';
    window.localStorage.setItem(KEY, theme);
    window.localStorage.setItem(PALETTE_KEY, palette);
    const meta = document.querySelector('meta[name="theme-color"]');
    const bar = theme === 'day' ? PALETTES.find((p) => p.id === palette)?.bar ?? NIGHT_BAR : NIGHT_BAR;
    if (meta) meta.setAttribute('content', bar);
  }, [theme, palette]);

  const toggle = () => setTheme((t) => (t === 'day' ? 'night' : 'day'));

  return <Ctx.Provider value={{ theme, toggle, palette, setPalette }}>{children}</Ctx.Provider>;
};

export const useTheme = () => useContext(Ctx);
