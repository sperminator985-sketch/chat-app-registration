import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const CACHE_KEY = 'obshaga-news';
const TTL = 15 * 60 * 1000;

type Cached = { ts: number; items: string[] };

const readCache = (): Cached | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!Array.isArray(parsed.items)) return null;
    return { ts: Number(parsed.ts) || 0, items: parsed.items };
  } catch {
    return null;
  }
};

export const useNews = () => {
  const [items, setItems] = useState<string[]>(() => readCache()?.items ?? []);

  useEffect(() => {
    const load = () => {
      const cached = readCache();
      if (cached && cached.items.length && Date.now() - cached.ts < TTL) return;

      api
        .news()
        .then((res) => {
          if (!res.news?.length) return;
          setItems(res.news);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items: res.news }));
        })
        .catch(() => undefined);
    };

    load();
    const timer = window.setInterval(load, TTL);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return items;
};

export default useNews;
