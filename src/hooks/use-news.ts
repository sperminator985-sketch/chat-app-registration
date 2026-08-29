import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const CACHE_KEY = 'obshaga-news';

type Cached = { day: string; items: string[] };

const today = () => new Date().toLocaleDateString('ru-RU');

const readCache = (): Cached | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const useNews = () => {
  const [items, setItems] = useState<string[]>(() => readCache()?.items ?? []);

  useEffect(() => {
    const load = () => {
      const cached = readCache();
      if (cached && cached.day === today() && cached.items.length) return;

      api
        .news()
        .then((res) => {
          if (!res.news?.length) return;
          setItems(res.news);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ day: today(), items: res.news }));
        })
        .catch(() => undefined);
    };

    load();
    const timer = window.setInterval(load, 3600000);
    return () => window.clearInterval(timer);
  }, []);

  return items;
};

export default useNews;
