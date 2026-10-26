import { api } from '@/lib/api';

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let iceCache: { at: number; servers: RTCIceServer[] } | null = null;

export const loadIce = async (): Promise<RTCIceServer[]> => {
  if (iceCache && Date.now() - iceCache.at < 30 * 60 * 1000) return iceCache.servers;
  try {
    const res = await Promise.race([
      api.callIce(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
    if (res.iceServers?.length) {
      iceCache = { at: Date.now(), servers: res.iceServers };
      return res.iceServers;
    }
  } catch {
    /* старый сервер без TURN — соединяемся напрямую */
  }
  return FALLBACK_ICE;
};
