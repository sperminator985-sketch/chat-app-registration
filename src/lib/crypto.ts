const te = new TextEncoder();
const td = new TextDecoder();

export const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

export const fromB64 = (s: string): ArrayBuffer => {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out.buffer;
};

const randomBytes = (n: number): ArrayBuffer => {
  const buf = new ArrayBuffer(n);
  crypto.getRandomValues(new Uint8Array(buf));
  return buf;
};

const PBKDF2_ROUNDS = 210000;

const deriveKek = async (secret: string, salt: ArrayBuffer): Promise<CryptoKey> => {
  const base = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ROUNDS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export type KeyBundle = {
  publicJwk: string;
  privateEnc: string;
  salt: string;
  iv: string;
};

export const generatePair = async (): Promise<CryptoKeyPair> =>
  crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  ) as Promise<CryptoKeyPair>;

export const packPair = async (pair: CryptoKeyPair, secret: string): Promise<KeyBundle> => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const kek = await deriveKek(secret, salt);
  const pubJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    kek,
    te.encode(JSON.stringify(privJwk)),
  );
  return {
    publicJwk: JSON.stringify(pubJwk),
    privateEnc: toB64(sealed),
    salt: toB64(salt),
    iv: toB64(iv),
  };
};

export const unpackPrivate = async (b: KeyBundle, secret: string): Promise<CryptoKey> => {
  const kek = await deriveKek(secret, fromB64(b.salt));
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(b.iv) },
    kek,
    fromB64(b.privateEnc),
  );
  const jwk = JSON.parse(td.decode(raw));
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, [
    'decrypt',
  ]);
};

export const importPublic = (jwkText: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwkText),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  );

export const exportPrivateJwk = async (key: CryptoKey): Promise<string> =>
  JSON.stringify(await crypto.subtle.exportKey('jwk', key));

export const importPrivateJwk = (jwkText: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwkText),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt'],
  );

export type Envelope = {
  v: 1;
  ct: string;
  iv: string;
  k: Record<string, string>;
};

export const sealText = async (
  text: string,
  recipients: Record<string, CryptoKey>,
): Promise<Envelope> => {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(text));
  const rawKey = await crypto.subtle.exportKey('raw', key);

  const k: Record<string, string> = {};
  for (const [id, pub] of Object.entries(recipients)) {
    const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pub, rawKey);
    k[id] = toB64(wrapped);
  }
  return { v: 1, ct: toB64(ct), iv: toB64(iv), k };
};

export const openText = async (
  env: Envelope,
  myId: string | number,
  priv: CryptoKey,
): Promise<string> => {
  const wrapped = env.k[String(myId)];
  if (!wrapped) throw new Error('Нет ключа для этого получателя');
  const rawKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, priv, fromB64(wrapped));
  const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(env.iv) },
    key,
    fromB64(env.ct),
  );
  return td.decode(plain);
};

export const parseEnvelope = (raw?: string | null): Envelope | null => {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    return j && j.v === 1 && j.ct && j.iv && j.k ? (j as Envelope) : null;
  } catch {
    return null;
  }
};
