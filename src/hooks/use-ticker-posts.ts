import { useEffect, useState } from 'react';
import { api, type TickerLine, type TickerMode } from '@/lib/api';

const TTL = 60 * 1000;

export const useTickerPosts = () => {
  const [items, setItems] = useState<TickerLine[]>([]);
  const [mode, setMode] = useState<TickerMode>('mix');
  const [speed, setSpeed] = useState(100);

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
          setMode(res.mode ?? 'mix');
          setSpeed(res.speed && res.speed > 0 ? res.speed : 100);
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

  return { items, mode, speed };
};

export default useTickerPosts;
