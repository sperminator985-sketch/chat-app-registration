import { useEffect, useState } from 'react';

const OWN_URL = 'https://chat-tom.ru/chat/api.php?action=weather';
const WEATHER_URL = 'https://functions.poehali.dev/2c6a74d1-2f8a-481c-ac3e-49927c9727a9';

export type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

const CACHE_KEY = 'weather-cache-v1';

let lastSky: Sky = 'clear';
let lastIsDay = true;
let lastDayText: string | null = null;
let lastTemp: number | null = null;

try {
  const raw = localStorage.getItem(CACHE_KEY);
  if (raw) {
    const c = JSON.parse(raw);
    if (typeof c?.temp === 'number') lastTemp = c.temp;
    if (typeof c?.sky === 'string') lastSky = c.sky as Sky;
    if (typeof c?.isDay === 'boolean') lastIsDay = c.isDay;
    if (typeof c?.dayText === 'string') lastDayText = c.dayText;
  }
} catch {
  /* кэш не критичен */
}

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
  const [temp, setTemp] = useState<number | null>(lastTemp);

  useEffect(() => {
    let alive = true;

    const grab = async (url: string) => {
      const stamp = Math.floor(Date.now() / 600000);
      const sep = url.includes('?') ? '&' : '?';
      const ctrl = new AbortController();
      const kill = window.setTimeout(() => ctrl.abort(), 6000);
      try {
        const r = await fetch(`${url}${sep}t=${stamp}`, { signal: ctrl.signal });
        if (!r.ok) throw new Error('bad status');
        const d = await r.json();
        const t = typeof d?.temp === 'number' ? d.temp : d?.current?.temperature_2m;
        if (typeof t !== 'number') throw new Error('no temp');
        return { t, sky: d?.sky, isDay: d?.isDay, dayText: d?.dayText };
      } finally {
        window.clearTimeout(kill);
      }
    };

    const load = async () => {
      const [own, cloud] = await Promise.allSettled([grab(OWN_URL), grab(WEATHER_URL)]);
      if (!alive) return;

      const main =
        own.status === 'fulfilled'
          ? own.value
          : cloud.status === 'fulfilled'
            ? cloud.value
            : null;
      if (!main) return;

      if (typeof main.sky === 'string') lastSky = main.sky as Sky;
      if (typeof main.isDay === 'boolean') lastIsDay = main.isDay;

      const text =
        typeof main.dayText === 'string' && main.dayText
          ? main.dayText
          : cloud.status === 'fulfilled' && typeof cloud.value.dayText === 'string'
            ? cloud.value.dayText
            : null;
      if (text) lastDayText = text;

      lastTemp = Math.round(main.t);
      setTemp(lastTemp);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ temp: lastTemp, sky: lastSky, isDay: lastIsDay, dayText: lastDayText }),
        );
      } catch {
        /* кэш не критичен */
      }
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

export const dayForecastText = () => lastDayText;

export const formatTemp = (t: number) => (t > 0 ? `+${t}` : `${t}`);

export const degreeWord = (t: number) => {
  const n = Math.abs(Math.trunc(t)) % 100;
  if (n >= 11 && n <= 14) return 'градусов';
  const last = n % 10;
  if (last === 1) return 'градус';
  if (last >= 2 && last <= 4) return 'градуса';
  return 'градусов';
};