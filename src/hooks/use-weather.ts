import { useEffect, useState } from 'react';

const OWN_URL = 'https://chat-tom.ru/chat/api.php?action=weather';
const WEATHER_URL = 'https://functions.poehali.dev/2c6a74d1-2f8a-481c-ac3e-49927c9727a9';

export type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

let lastSky: Sky = 'clear';
let lastIsDay = true;

export const weatherIcon = (temp: number): string => {
  switch (lastSky) {
    case 'clear':
      return lastIsDay ? 'Sun' : 'Moon';
    case 'partly':
      return lastIsDay ? 'CloudSun' : 'CloudMoon';
    case 'cloudy':
      return 'Cloud';
    case 'fog':
      return 'CloudFog';
    case 'drizzle':
      return 'CloudDrizzle';
    case 'rain':
      return 'CloudRain';
    case 'snow':
      return 'Snowflake';
    case 'storm':
      return 'CloudLightning';
    default:
      return temp <= 0 ? 'Snowflake' : 'Sun';
  }
};

export const useWeather = () => {
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    const grab = async (url: string) => {
      const stamp = Math.floor(Date.now() / 600000);
      const sep = url.includes('?') ? '&' : '?';
      const r = await fetch(`${url}${sep}t=${stamp}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('bad status');
      const d = await r.json();
      const t = typeof d?.temp === 'number' ? d.temp : d?.current?.temperature_2m;
      if (typeof t !== 'number') throw new Error('no temp');
      return { t, sky: d?.sky, isDay: d?.isDay };
    };

    const load = async () => {
      let data: { t: number; sky?: unknown; isDay?: unknown } | null = null;
      try {
        data = await grab(OWN_URL);
      } catch {
        try {
          data = await grab(WEATHER_URL);
        } catch {
          return;
        }
      }
      if (!alive || !data) return;
      if (typeof data.sky === 'string') lastSky = data.sky as Sky;
      if (typeof data.isDay === 'boolean') lastIsDay = data.isDay;
      setTemp(Math.round(data.t));
    };

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