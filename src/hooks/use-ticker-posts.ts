import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const TTL = 60 * 1000;

export const useTickerPosts = () => {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api
        .ticker()
        .then((res) => {
          if (alive) setItems(res.ticker ?? []);
        })
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, TTL);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return items;
};

export default useTickerPosts;
