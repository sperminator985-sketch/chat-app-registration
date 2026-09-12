import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import {
  generatePair,
  packPair,
  unpackPrivate,
  importPublic,
  sealText,
  openText,
  parseEnvelope,
} from '@/lib/crypto';
import { getSecret, setSecret } from '@/lib/dm-secret';

type CryptoState = {
  ready: boolean;
  enabled: boolean;
  seal: (peerNick: string, text: string) => Promise<string | null>;
  reveal: (cipher?: string | null) => Promise<string>;
};

const CryptoContext = createContext<CryptoState | null>(null);

export const CryptoProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const privRef = useRef<CryptoKey | null>(null);
  const vaultRef = useRef<CryptoKey | null>(null);
  const myPubRef = useRef<CryptoKey | null>(null);
  const peerCache = useRef<Map<string, { id: number; key: CryptoKey }>>(new Map());
  const plainCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) {
      privRef.current = null;
      peerCache.current.clear();
      plainCache.current.clear();
      setReady(false);
      setEnabled(false);
      return;
    }
    let alive = true;

    const boot = async () => {
      try {
        const info = await api.keysMe();
        if (!alive) return;
        vaultRef.current = info.vault ? await importPublic(info.vault) : null;
        if (!info.enabled || !vaultRef.current) {
          setEnabled(false);
          setReady(true);
          return;
        }

        let secret = getSecret(user.id);
        if (!secret) {
          secret = crypto.randomUUID() + crypto.randomUUID();
          setSecret(user.id, secret);
        }

        if (info.bundle) {
          try {
            privRef.current = await unpackPrivate(info.bundle, secret);
            myPubRef.current = await importPublic(info.bundle.publicJwk);
          } catch {
            privRef.current = null;
            myPubRef.current = null;
          }
        }

        if (!privRef.current) {
          const pair = await generatePair();
          const bundle = await packPair(pair, secret);
          await api.keysSave(bundle);
          privRef.current = pair.privateKey;
          myPubRef.current = pair.publicKey;
        }

        if (!alive) return;
        setEnabled(true);
        setReady(true);
      } catch {
        if (alive) {
          setEnabled(false);
          setReady(true);
        }
      }
    };

    boot();
    return () => {
      alive = false;
    };
  }, [user]);

  const seal = useCallback(
    async (peerNick: string, text: string): Promise<string | null> => {
      if (!enabled || !user || !myPubRef.current || !vaultRef.current) return null;
      try {
        let peer = peerCache.current.get(peerNick.toLowerCase());
        if (!peer) {
          const res = await api.keysPeer(peerNick);
          if (!res.publicJwk || res.userId == null) return null;
          peer = { id: res.userId, key: await importPublic(res.publicJwk) };
          peerCache.current.set(peerNick.toLowerCase(), peer);
        }

        const recipients: Record<string, CryptoKey> = {
          [String(user.id)]: myPubRef.current,
          [String(peer.id)]: peer.key,
          vault: vaultRef.current,
        };
        const env = await sealText(text, recipients);
        return JSON.stringify(env);
      } catch {
        return null;
      }
    },
    [enabled, user],
  );

  const reveal = useCallback(
    async (cipher?: string | null): Promise<string> => {
      if (!cipher) return '';
      const cached = plainCache.current.get(cipher);
      if (cached !== undefined) return cached;
      const env = parseEnvelope(cipher);
      if (!env || !privRef.current || !user) return '🔒 зашифровано';
      try {
        const text = await openText(env, user.id, privRef.current);
        plainCache.current.set(cipher, text);
        return text;
      } catch {
        return '🔒 не удалось расшифровать';
      }
    },
    [user],
  );

  const value = useMemo(() => ({ ready, enabled, seal, reveal }), [ready, enabled, seal, reveal]);

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
};

export const useCrypto = () => {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error('useCrypto должен использоваться внутри CryptoProvider');
  return ctx;
};

export default useCrypto;
