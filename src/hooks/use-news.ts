import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const CACHE_KEY = 'obshaga-news';
const DAY = 86400000;

type Cached = { at: number; items: string[] };

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
    const cached = readCache();
    if (cached && Date.now() - cached.at < DAY) return;

    api
      .news()
      .then((res) => {
        if (!res.news?.length) return;
        setItems(res.news);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: res.news }));
      })
      .catch(() => undefined);
  }, []);

  return items;
};

export default useNews;
