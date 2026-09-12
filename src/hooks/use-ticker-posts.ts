import { useEffect, useState } from 'react';
import { api, type TickerLine } from '@/lib/api';

const TTL = 60 * 1000;

export const useTickerPosts = () => {
  const [items, setItems] = useState<TickerLine[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api
        .ticker()
        .then((res) => {
          if (!alive) return;
          const list = (res.ticker ?? []).map((t) =>
            typeof t === 'string' ? { nick: '', color: 0, text: t } : t,
          );
          setItems(list);
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
