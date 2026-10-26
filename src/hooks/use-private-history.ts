import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiFile, ApiMessage } from '@/lib/api';
import {
  byTime,
  clearConvo,
  convoKey,
  formatStamp,
  getBlob,
  loadHistory,
  msgKey,
  putBlob,
  saveMessages,
  StoredMessage,
} from '@/lib/private-store';

export type ViewMessage = {
  id: number;
  nick: string;
  color: ApiMessage['color'];
  text: string;
  time: string;
  file: (ApiFile & { url: string }) | null;
  fileGone: boolean;
  receiving: number | null;
};

type Options = {
  me?: string;
  peer?: string;
  serverMessages: ApiMessage[];
  reveal: (cipher?: string | null) => Promise<string>;
};

const MAX_TRIES = 3;

const fetchBlob = async (url: string, onProgress: (p: number) => void) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  const type = res.headers.get('content-type') || '';
  const total = Number(res.headers.get('content-length') || 0);
  if (!res.body || !total) return res.blob();
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress(Math.min(99, Math.round((got / total) * 100)));
  }
  return new Blob(chunks, { type });
};

const toStored = (m: ApiMessage, convo: string, text: string): StoredMessage => ({
  key: msgKey(convo, m.id),
  convo,
  id: m.id,
  roomId: 0,
  nick: m.nick,
  color: m.color,
  text,
  ts: m.ts ?? Date.now(),
  avatar: m.avatar,
  avatarUrl: m.avatarUrl,
  file: m.file ? { name: m.file.name, type: m.file.type, size: m.file.size } : null,
});

export const usePrivateHistory = ({ me, peer, serverMessages, reveal }: Options) => {
  const convo = me && peer ? convoKey(me, peer) : null;
  const [history, setHistory] = useState<StoredMessage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [gone, setGone] = useState<Record<string, boolean>>({});
  const [receiving, setReceiving] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  const saved = useRef<Set<string>>(new Set());
  const blobReady = useRef<Set<string>>(new Set());
  const inflight = useRef<Set<string>>(new Set());
  const tries = useRef<Map<string, number>>(new Map());
  const urlTried = useRef<Set<string>>(new Set());
  const urlsRef = useRef(urls);
  urlsRef.current = urls;
  const acking = useRef(false);
  const convoRef = useRef(convo);
  convoRef.current = convo;
  const fileQueue = useRef<Promise<void>>(Promise.resolve());

  const isMine = useCallback((nick: string) => Boolean(me) && nick.toLowerCase() === me!.toLowerCase(), [me]);

  const revokeAll = () => {
    Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u));
  };

  useEffect(() => {
    let alive = true;
    revokeAll();
    setUrls({});
    setGone({});
    setReceiving({});
    setHistory([]);
    setLoaded(false);
    saved.current = new Set();
    blobReady.current = new Set();
    inflight.current = new Set();
    tries.current = new Map();
    urlTried.current = new Set();
    if (!convo) return;
    loadHistory(convo).then((rows) => {
      if (!alive) return;
      rows.forEach((r) => saved.current.add(r.key));
      setHistory(rows);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [convo]);

  useEffect(() => () => revokeAll(), []);

  const remember = useCallback(async (rows: StoredMessage[]) => {
    if (!rows.length) return;
    await saveMessages(rows);
    rows.forEach((r) => saved.current.add(r.key));
    setHistory((prev) => {
      const map = new Map(prev.map((r) => [r.key, r]));
      rows.forEach((r) => map.set(r.key, r));
      return [...map.values()].sort(byTime);
    });
  }, []);

  const attachBlob = useCallback((key: string, blob: Blob) => {
    blobReady.current.add(key);
    urlTried.current.add(key);
    setUrls((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]);
      return { ...prev, [key]: URL.createObjectURL(blob) };
    });
    setGone((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const saveOwn = useCallback(
    async (m: ApiMessage, text: string, blob?: Blob) => {
      if (!convo) return;
      const key = msgKey(convo, m.id);
      if (blob) {
        attachBlob(key, blob);
        await putBlob(key, convo, blob);
      }
      await remember([toStored(m, convo, text)]);
    },
    [convo, remember, attachBlob],
  );

  const saveVoice = useCallback(
    async (v: { nick: string; color: ApiMessage['color']; blob: Blob; name: string; ts: number }) => {
      if (!convo) return false;
      const id = -v.ts;
      const key = msgKey(convo, id);
      if (saved.current.has(key)) return true;
      const ok = await putBlob(key, convo, v.blob);
      if (!ok) return false;
      if (convoRef.current === convo) attachBlob(key, v.blob);
      await remember([
        {
          key,
          convo,
          id,
          roomId: 0,
          nick: v.nick,
          color: v.color,
          text: '',
          ts: v.ts,
          file: { name: v.name, type: 'audio', size: v.blob.size },
        },
      ]);
      return true;
    },
    [convo, remember, attachBlob],
  );

  useEffect(() => {
    if (!convo || !loaded) return;
    const fresh = serverMessages.filter((m) => {
      const key = msgKey(convo, m.id);
      return !saved.current.has(key) && !inflight.current.has(key);
    });

    fresh
      .filter((m) => !m.file)
      .forEach((m) => {
        const key = msgKey(convo, m.id);
        inflight.current.add(key);
        (async () => {
          const text = m.cipher ? await reveal(m.cipher) : m.text;
          if (m.cipher && text.startsWith('🔒')) return;
          if (convoRef.current === convo) await remember([toStored(m, convo, text)]);
        })().finally(() => inflight.current.delete(key));
      });

    fresh
      .filter((m) => m.file)
      .forEach((m) => {
        const key = msgKey(convo, m.id);
        if ((tries.current.get(key) ?? 0) >= MAX_TRIES) return;
        inflight.current.add(key);
        fileQueue.current = fileQueue.current.then(async () => {
          try {
            if (convoRef.current !== convo) return;
            let ok = blobReady.current.has(key) || Boolean(await getBlob(key));
            if (!ok) {
              setReceiving((prev) => ({ ...prev, [key]: 0 }));
              const blob = await fetchBlob(m.file!.url, (p) => setReceiving((prev) => ({ ...prev, [key]: p })));
              ok = await putBlob(key, convo, blob);
              if (convoRef.current === convo) attachBlob(key, blob);
            }
            if (!ok) tries.current.set(key, (tries.current.get(key) ?? 0) + 1);
            if (ok && convoRef.current === convo) await remember([toStored(m, convo, '')]);
          } catch {
            tries.current.set(key, (tries.current.get(key) ?? 0) + 1);
          } finally {
            inflight.current.delete(key);
            setReceiving((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
          }
        });
      });
  }, [serverMessages, convo, loaded, reveal, remember, attachBlob]);

  useEffect(() => {
    if (!convo || acking.current) return;
    const ids = serverMessages
      .filter((m) => !isMine(m.nick) && saved.current.has(msgKey(convo, m.id)))
      .map((m) => m.id);
    if (!ids.length) return;
    acking.current = true;
    api
      .privateAck(ids)
      .catch(() => undefined)
      .finally(() => {
        acking.current = false;
      });
  }, [serverMessages, history, convo, isMine]);

  useEffect(() => {
    if (!convo) return;
    history
      .filter((r) => r.file && !urlTried.current.has(r.key))
      .forEach((r) => {
        urlTried.current.add(r.key);
        getBlob(r.key).then((blob) => {
          if (convoRef.current !== convo) return;
          if (blob) attachBlob(r.key, blob);
          else setGone((prev) => ({ ...prev, [r.key]: true }));
        });
      });
  }, [history, convo, attachBlob]);

  const clear = useCallback(async () => {
    if (!convo) return;
    await clearConvo(convo);
    revokeAll();
    setUrls({});
    setGone({});
    setHistory([]);
    saved.current = new Set();
    blobReady.current = new Set();
    urlTried.current = new Set();
  }, [convo]);

  const items = useMemo<ViewMessage[]>(() => {
    if (!convo) return [];
    const byId = new Map<number, ViewMessage & { ts: number }>();
    history.forEach((r) => {
      const url = urls[r.key];
      const onServer = serverMessages.find((m) => m.id === r.id)?.file?.url;
      byId.set(r.id, {
        id: r.id,
        nick: r.nick,
        color: r.color,
        text: r.text,
        time: formatStamp(r.ts),
        ts: r.ts,
        file: r.file ? { ...r.file, url: url ?? onServer ?? '' } : null,
        fileGone: Boolean(r.file) && !url && !onServer && Boolean(gone[r.key]),
        receiving: null,
      });
    });
    serverMessages.forEach((m) => {
      if (byId.has(m.id)) return;
      const key = msgKey(convo, m.id);
      byId.set(m.id, {
        id: m.id,
        nick: m.nick,
        color: m.color,
        text: m.cipher ? '🔒 расшифровываем…' : m.text,
        time: m.ts ? formatStamp(m.ts) : m.time,
        ts: m.ts ?? Date.now(),
        file: m.file ? { ...m.file, url: urls[key] ?? m.file.url } : null,
        fileGone: false,
        receiving: receiving[key] ?? null,
      });
    });
    return [...byId.values()].sort(byTime).map(({ ts: _ts, ...v }) => v);
  }, [convo, history, serverMessages, urls, gone, receiving]);

  return { items, saveOwn, saveVoice, clear, hasHistory: history.length > 0 };
};

export default usePrivateHistory;
