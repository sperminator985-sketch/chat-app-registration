import { useEffect, useState } from 'react';

const WEATHER_URL = 'https://functions.poehali.dev/2c6a74d1-2f8a-481c-ac3e-49927c9727a9';

export const useWeather = () => {
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    fetch(WEATHER_URL)
      .then((r) => r.json())
      .then((d) => setTemp(typeof d.temp === 'number' ? d.temp : null))
      .catch(() => undefined);
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