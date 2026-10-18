import { useEffect, useState } from 'react';

const CLOUD_URL = 'https://functions.poehali.dev/2c6a74d1-2f8a-481c-ac3e-49927c9727a9?action=rates';
const CACHE_KEY = 'obshaga-rates';
const TTL = 60 * 60 * 1000;

export type Rates = { date: string; usd: number; eur: number };

type Cached = { ts: number; rates: Rates };

const readCache = (): Cached | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (typeof parsed?.rates?.usd !== 'number' || typeof parsed?.rates?.eur !== 'number') return null;
    return { ts: Number(parsed.ts) || 0, rates: parsed.rates };
  } catch {
    return null;
  }
};

export const formatRate = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const useRates = (): Rates | null => {
  const [rates, setRates] = useState<Rates | null>(() => readCache()?.rates ?? null);

  useEffect(() => {
    const load = () => {
      const cached = readCache();
      if (cached && Date.now() - cached.ts < TTL) return;
      fetch(CLOUD_URL)
        .then((r) => r.json())
        .then((res: { rates?: Rates | null }) => {
          const r = res.rates;
          if (!r || typeof r.usd !== 'number' || typeof r.eur !== 'number') return;
          setRates(r);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: r }));
        })
        .catch(() => undefined);
    };

    load();
    const timer = window.setInterval(load, TTL);
    return () => window.clearInterval(timer);
  }, []);

  return rates;
};

export default useRates;
