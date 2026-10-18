import { useEffect, useState } from 'react';
import { api, type HoroscopeDay } from '@/lib/api';

const CACHE_KEY = 'obshaga-horoscope';
const TTL = 3 * 60 * 60 * 1000;
const CLOUD_URL = 'https://functions.poehali.dev/2c6a74d1-2f8a-481c-ac3e-49927c9727a9';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

type Cached = { ts: number; days: HoroscopeDay[] };

const readCache = (): Cached | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!Array.isArray(parsed.days)) return null;
    return { ts: Number(parsed.ts) || 0, days: parsed.days };
  } catch {
    return null;
  }
};

const tomskNow = () => new Date(Date.now() + 7 * 3600000);

const pickTarget = () => {
  const now = tomskNow();
  const evening = now.getUTCHours() >= 18;
  const d = evening ? new Date(now.getTime() + 86400000) : now;
  const iso = d.toISOString().slice(0, 10);
  return { iso, evening, label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` };
};

export type HoroscopeLine = { title: string; text: string };

export const useHoroscope = (): HoroscopeLine[] => {
  const [days, setDays] = useState<HoroscopeDay[]>(() => readCache()?.days ?? []);
  const [target, setTarget] = useState(pickTarget);

  useEffect(() => {
    const load = () => {
      const cached = readCache();
      const fresh = cached && cached.days.length && Date.now() - cached.ts < TTL;
      const hasTarget = cached?.days.some((d) => d.date === pickTarget().iso);
      if (fresh && hasTarget) return;

      const save = (list: HoroscopeDay[] | undefined) => {
        if (!list?.length) throw new Error('empty');
        setDays(list);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), days: list }));
      };

      api
        .horoscope()
        .then((res) => save(res.days))
        .catch(() =>
          fetch(`${CLOUD_URL}?action=horoscope`)
            .then((r) => r.json())
            .then((res: { days?: HoroscopeDay[] }) => save(res.days)),
        )
        .catch(() => undefined);
    };

    load();
    const timer = window.setInterval(() => {
      setTarget((prev) => {
        const next = pickTarget();
        return next.iso === prev.iso && next.evening === prev.evening ? prev : next;
      });
      load();
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const day = days.find((d) => d.date === target.iso);
  if (!day) return [];
  const when = target.evening ? `ГОРОСКОП НА ЗАВТРА, ${target.label}` : `ГОРОСКОП НА СЕГОДНЯ, ${target.label}`;
  return day.signs.map((s) => ({ title: `${when.toUpperCase()} · ${s.sign.toUpperCase()}`, text: s.text }));
};

export default useHoroscope;