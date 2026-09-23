import { useEffect, useState } from 'react';

const WEATHER_URL = 'https://functions.poehali.dev/2c6a74d1-2f8a-481c-ac3e-49927c9727a9';

export const useWeather = () => {
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${WEATHER_URL}?t=${Math.floor(Date.now() / 600000)}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          const t = typeof d?.temp === 'number' ? d.temp : d?.current?.temperature_2m;
          setTemp(typeof t === 'number' ? Math.round(t) : null);
        })
        .catch(() => undefined);

    load();
    let timer = window.setInterval(load, 900000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        window.clearInterval(timer);
      } else {
        load();
        window.clearInterval(timer);
        timer = window.setInterval(load, 900000);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return temp;
};

export const formatTemp = (t: number) => (t > 0 ? `+${t}` : `${t}`);

export const degreeWord = (t: number) => {
  const n = Math.abs(Math.trunc(t)) % 100;
  if (n >= 11 && n <= 14) return 'градусов';
  const last = n % 10;
  if (last === 1) return 'градус';
  if (last >= 2 && last <= 4) return 'градуса';
  return 'градусов';
};