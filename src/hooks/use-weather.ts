import { useEffect, useState } from 'react';

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=56.4977&longitude=84.9744&current=temperature_2m&timezone=Asia%2FTomsk';

export const useWeather = () => {
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(WEATHER_URL)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          const t = d?.current?.temperature_2m;
          setTemp(typeof t === 'number' ? Math.round(t) : null);
        })
        .catch(() => undefined);

    load();
    const timer = window.setInterval(load, 900000);
    return () => {
      alive = false;
      window.clearInterval(timer);
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