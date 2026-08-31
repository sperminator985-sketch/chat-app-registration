import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { isPageVisible } from '@/hooks/use-polling';

export type LiveStats = {
  online: number;
  totalUsers: number;
  dayMessages: number;
  roomCounts: Record<string, number>;
  adminOnline: boolean;
};

let cache: LiveStats | null = null;
let timer: number | null = null;
const listeners = new Set<(v: LiveStats) => void>();

const load = () => {
  if (!isPageVisible()) return Promise.resolve();
  return api
    .feed('kurilka')
    .then((res) => {
      cache = {
        online: res.onlineTotal ?? res.online.length,
        totalUsers: res.totalUsers,
        dayMessages: res.dayMessages,
        roomCounts: res.roomCounts ?? {},
        adminOnline:
          res.adminOnline ??
          (res.online ?? []).some(
            (u: { nick?: string; isAdmin?: boolean }) =>
              u.isAdmin === true || (u.nick ?? '').trim().toLowerCase() === 'админ',
          ),
      };
      listeners.forEach((fn) => fn(cache as LiveStats));
    })
    .catch(() => undefined);
};

export const useLiveStats = () => {
  const [data, setData] = useState<LiveStats | null>(cache);

  useEffect(() => {
    listeners.add(setData);
    if (cache) setData(cache);
    load();
    if (timer === null) timer = window.setInterval(load, 5000);
    const onVisibility = () => {
      if (isPageVisible()) load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      listeners.delete(setData);
      document.removeEventListener('visibilitychange', onVisibility);
      if (listeners.size === 0 && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  return data;
};