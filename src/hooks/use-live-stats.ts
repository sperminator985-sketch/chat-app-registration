import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type LiveStats = {
  online: number;
  totalUsers: number;
  dayMessages: number;
  roomCounts: Record<string, number>;
};

export const useLiveStats = () => {
  const [data, setData] = useState<LiveStats | null>(null);

  useEffect(() => {
    const load = () =>
      api
        .feed('kurilka')
        .then((res) =>
          setData({
            online: res.online.length,
            totalUsers: res.totalUsers,
            dayMessages: res.dayMessages,
            roomCounts: res.roomCounts ?? {},
          }),
        )
        .catch(() => undefined);
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return data;
};