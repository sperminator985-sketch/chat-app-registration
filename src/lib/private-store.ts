import type { ApiFile } from '@/lib/api';
import type { NickColor } from '@/data/chat';

export type StoredFile = Pick<ApiFile, 'name' | 'type' | 'size'>;

export type StoredMessage = {
  key: string;
  convo: string;
  id: number;
  roomId: number;
  nick: string;
  color: NickColor;
  text: string;
  ts: number;
  avatar?: number;
  avatarUrl?: string | null;
  file?: StoredFile | null;
};

const DB_NAME = 'obshaga-private';
const MSG = 'messages';
const BLOB = 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MSG)) {
          db.createObjectStore(MSG, { keyPath: 'key' }).createIndex('convo', 'convo');
        }
        if (!db.objectStoreNames.contains(BLOB)) {
          db.createObjectStore(BLOB).createIndex('convo', 'convo');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
};

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

const asPromise = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const convoKey = (me: string, peer: string) => `${me.toLowerCase()}::${peer.toLowerCase()}`;
export const msgKey = (convo: string, id: number) => `${convo}|${id}`;

let persistAsked = false;
const askPersist = () => {
  if (persistAsked) return;
  persistAsked = true;
  navigator.storage?.persist?.().catch(() => undefined);
};

export const loadHistory = async (convo: string): Promise<StoredMessage[]> => {
  try {
    const db = await openDb();
    const tx = db.transaction(MSG, 'readonly');
    const rows = await asPromise(tx.objectStore(MSG).index('convo').getAll(convo) as IDBRequest<StoredMessage[]>);
    return rows.sort((a, b) => a.id - b.id);
  } catch {
    return [];
  }
};

export const saveMessages = async (rows: StoredMessage[]) => {
  if (!rows.length) return;
  try {
    const db = await openDb();
    const tx = db.transaction(MSG, 'readwrite');
    rows.forEach((r) => tx.objectStore(MSG).put(r));
    await done(tx);
  } catch {
    /* хранилище недоступно — переписка просто не сохранится */
  }
};

export const getBlob = async (key: string): Promise<Blob | null> => {
  try {
    const db = await openDb();
    const tx = db.transaction(BLOB, 'readonly');
    const row = await asPromise(tx.objectStore(BLOB).get(key) as IDBRequest<{ blob: Blob } | undefined>);
    return row?.blob ?? null;
  } catch {
    return null;
  }
};

const dropOldestBlobs = async (count: number) => {
  const db = await openDb();
  const tx = db.transaction(BLOB, 'readwrite');
  const store = tx.objectStore(BLOB);
  const all = await asPromise(store.getAll() as IDBRequest<{ ts: number }[]>);
  const keys = await asPromise(store.getAllKeys());
  keys
    .map((k, i) => ({ k, ts: all[i]?.ts ?? 0 }))
    .sort((a, b) => a.ts - b.ts)
    .slice(0, count)
    .forEach(({ k }) => store.delete(k));
  await done(tx);
};

export const putBlob = async (key: string, convo: string, blob: Blob): Promise<boolean> => {
  askPersist();
  const write = async () => {
    const db = await openDb();
    const tx = db.transaction(BLOB, 'readwrite');
    tx.objectStore(BLOB).put({ blob, convo, ts: Date.now() }, key);
    await done(tx);
  };
  try {
    await write();
    return true;
  } catch {
    try {
      await dropOldestBlobs(5);
      await write();
      return true;
    } catch {
      return false;
    }
  }
};

export const clearConvo = async (convo: string) => {
  const db = await openDb();
  const tx = db.transaction([MSG, BLOB], 'readwrite');
  for (const name of [MSG, BLOB]) {
    const store = tx.objectStore(name);
    const keys = await asPromise(store.index('convo').getAllKeys(convo));
    keys.forEach((k) => store.delete(k));
  }
  await done(tx);
};

export const formatStamp = (ts: number) => {
  const d = new Date(ts);
  const hm = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (days <= 0) return hm;
  if (days === 1) return `вчера ${hm}`;
  const date = d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    ...(d.getFullYear() !== today.getFullYear() ? { year: '2-digit' } : {}),
  });
  return `${date} ${hm}`;
};
