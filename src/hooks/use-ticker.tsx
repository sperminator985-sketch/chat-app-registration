import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

type TickerState = {
  open: boolean;
  pending: number;
  openTicker: () => void;
  closeTicker: () => void;
  setPending: (n: number) => void;
};

const TickerContext = createContext<TickerState | null>(null);

export const TickerProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);

  const openTicker = useCallback(() => setOpen(true), []);
  const closeTicker = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, pending, openTicker, closeTicker, setPending }),
    [open, pending, openTicker, closeTicker],
  );

  return <TickerContext.Provider value={value}>{children}</TickerContext.Provider>;
};

export const useTicker = () => {
  const ctx = useContext(TickerContext);
  if (!ctx) throw new Error('useTicker вне TickerProvider');
  return ctx;
};

export default useTicker;
