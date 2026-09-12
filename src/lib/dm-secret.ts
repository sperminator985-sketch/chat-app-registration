import { toB64 } from '@/lib/crypto';

const KEY = (id: number) => `dm_pass_${id}`;
const PENDING = 'dm_pass_pending';

export const deriveSecret = async (nick: string, password: string): Promise<string> => {
  const data = new TextEncoder().encode(`obshaga:${nick.toLowerCase()}:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toB64(hash);
};

export const stashSecret = (secret: string) => {
  sessionStorage.setItem(PENDING, secret);
};

export const bindSecret = (userId: number) => {
  const pending = sessionStorage.getItem(PENDING);
  if (pending) {
    localStorage.setItem(KEY(userId), pending);
    sessionStorage.removeItem(PENDING);
  }
};

export const getSecret = (userId: number): string | null => localStorage.getItem(KEY(userId));

export const setSecret = (userId: number, secret: string) => {
  localStorage.setItem(KEY(userId), secret);
};
