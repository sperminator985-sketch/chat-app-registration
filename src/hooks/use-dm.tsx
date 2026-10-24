import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

type DmState = {
  soundOn: boolean;
  toggleSound: () => void;
};

const DmContext = createContext<DmState | null>(null);

export const DmProvider = ({ children }: { children: ReactNode }) => {
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('obshaga_sound') !== 'off');

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      localStorage.setItem('obshaga_sound', prev ? 'off' : 'on');
      return !prev;
    });
  }, []);

  const value = useMemo(() => ({ soundOn, toggleSound }), [soundOn, toggleSound]);

  return <DmContext.Provider value={value}>{children}</DmContext.Provider>;
};

export const useDm = () => {
  const ctx = useContext(DmContext);
  if (!ctx) throw new Error('useDm должен использоваться внутри DmProvider');
  return ctx;
};
