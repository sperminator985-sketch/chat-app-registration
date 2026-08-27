import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type LiveStats = {
  online: number;
  totalUsers: number;
  dayMessages: number;
  roomCounts: Record<string, number>;
};

let cache: LiveStats | null = null;
let timer: number | null = null;
const listeners = new Set<(v: LiveStats) => void>();

const load = () =>
  api
    .feed('kurilka')
    .then((res) => {
      cache = {
        online: res.online.length,
        totalUsers: res.totalUsers,
        dayMessages: res.dayMessages,
        roomCounts: res.roomCounts ?? {},
      };
      listeners.forEach((fn) => fn(cache as LiveStats));
    })
    .catch(() => undefined);

export const useLiveStats = () => {
  const [data, setData] = useState<LiveStats | null>(cache);

  useEffect(() => {
    listeners.add(setData);
    if (cache) setData(cache);
    load();
    if (timer === null) timer = window.setInterval(load, 30000);
    return () => {
      listeners.delete(setData);
      if (listeners.size === 0 && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  return data;
};
