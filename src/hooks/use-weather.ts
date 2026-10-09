import { useEffect, useState } from 'react';

const OWN_URL = 'https://chat-tom.ru/chat/api.php?action=weather';
const CLOUD_URL = 'https://functions.poehali.dev/2c6a74d1-2f8a-481c-ac3e-49927c9727a9';

export type Sky = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

const CACHE_KEY = 'weather-cache-v1';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const tomskTomorrowLabel = () => {
  const d = new Date(Date.now() + 7 * 3600000 + 86400000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

const isActualTomorrow = (text: unknown): text is string => {
  if (typeof text !== 'string' || !text) return false;
  const m = text.match(/^Завтра,\s*(\d{1,2}\s+\S+)/i);
  return Boolean(m) && m![1].toLowerCase() === tomskTomorrowLabel();
};

let lastSky: Sky = 'clear';
let lastIsDay = true;
let lastDayText: string | null = null;
let lastTomorrowText: string | null = null;
let lastTemp: number | null = null;

try {
  const raw = localStorage.getItem(CACHE_KEY);
  if (raw) {
    const c = JSON.parse(raw);
    if (typeof c?.temp === 'number') lastTemp = c.temp;
    if (typeof c?.sky === 'string') lastSky = c.sky as Sky;
    if (typeof c?.isDay === 'boolean') lastIsDay = c.isDay;
    if (typeof c?.dayText === 'string') lastDayText = c.dayText;
    if (isActualTomorrow(c?.tomorrowText)) lastTomorrowText = c.tomorrowText;
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
      const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
      const sep = url.includes('?') ? '&' : '?';
      const ctrl = new AbortController();
      const kill = window.setTimeout(() => ctrl.abort(), 15000);
      try {
        const r = await fetch(`${url}${sep}t=${stamp}`, { signal: ctrl.signal, cache: 'no-store' });
        if (!r.ok) throw new Error('bad status');
        const d = await r.json();
        const t = typeof d?.temp === 'number' ? d.temp : d?.current?.temperature_2m;
        if (typeof t !== 'number') throw new Error('no temp');
        return { t, sky: d?.sky, isDay: d?.isDay, dayText: d?.dayText, tomorrowText: d?.tomorrowText };
      } finally {
        window.clearTimeout(kill);
      }
    };

    const load = async () => {
      let main: Awaited<ReturnType<typeof grab>> | null = null;
      for (let attempt = 0; attempt < 3 && !main; attempt += 1) {
        for (const url of [OWN_URL, CLOUD_URL]) {
          try {
            main = await grab(url);
            break;
          } catch {
            if (!alive) return;
          }
        }
        if (!main) await new Promise((res) => window.setTimeout(res, 1500 * (attempt + 1)));
      }
      if (!alive || !main) return;

      if (typeof main.sky === 'string') lastSky = main.sky as Sky;
      if (typeof main.isDay === 'boolean') lastIsDay = main.isDay;
      if (typeof main.dayText === 'string' && main.dayText) lastDayText = main.dayText;
      if (isActualTomorrow(main.tomorrowText)) lastTomorrowText = main.tomorrowText;
      else if (!isActualTomorrow(lastTomorrowText)) lastTomorrowText = null;

      lastTemp = Math.round(main.t);
      setTemp(lastTemp);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            temp: lastTemp,
            sky: lastSky,
            isDay: lastIsDay,
            dayText: lastDayText,
            tomorrowText: lastTomorrowText,
          }),
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

export const tomorrowForecastText = () => (isActualTomorrow(lastTomorrowText) ? lastTomorrowText : null);

export const formatTemp = (t: number) => (t > 0 ? `+${t}` : `${t}`);

export const degreeWord = (t: number) => {
  const n = Math.abs(Math.trunc(t)) % 100;
  if (n >= 11 && n <= 14) return 'градусов';
  const last = n % 10;
  if (last === 1) return 'градус';
  if (last >= 2 && last <= 4) return 'градуса';
  return 'градусов';
};