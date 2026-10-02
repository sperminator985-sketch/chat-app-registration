import { zipSync, strToU8 } from 'fflate';

import apiPhp from '@/assets/server/api.php.txt?raw';
import installPhp from '@/assets/server/install.php.txt?raw';
import dbPhp from '@/assets/server/db.php.txt?raw';
import configPhp from '@/assets/server/config.php.txt?raw';
import dropSecretPhp from '@/assets/server/drop_secret.php.txt?raw';
import installMd from '@/assets/server/УСТАНОВКА.md.txt?raw';

const saveBlob = (blob: Blob, name: string) => {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
};

const pack = (files: Record<string, string>) => {
  const data: Record<string, Uint8Array> = {};
  for (const [name, text] of Object.entries(files)) {
    data[name] = strToU8(text);
  }
  return new Blob([zipSync(data, { level: 6 })], { type: 'application/zip' });
};

export const downloadApiZip = () => {
  saveBlob(pack({ 'api.php': apiPhp }), 'api-update.zip');
};

export const downloadFullZip = () => {
  saveBlob(
    pack({
      'api.php': apiPhp,
      'install.php': installPhp,
      'db.php': dbPhp,
      'config.php': configPhp,
      'drop_secret.php': dropSecretPhp,
      'УСТАНОВКА.md': installMd,
    }),
    'chat-server.zip',
  );
};

const ASSET_RE = /(?:\/assets\/|["'`(]\.\/|["'`(]assets\/)([\w.-]+\.(?:js|css|woff2?|ttf|png|jpe?g|svg|webp|gif|mp3|wav|ogg))/g;

const grab = async (path: string) => {
  const r = await fetch(`/${path.split('/').map(encodeURIComponent).join('/')}?bf=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Не скачался файл ${path}`);
  return new Uint8Array(await r.arrayBuffer());
};

export const downloadSiteWithApiZip = async (onProgress?: (done: number, total: number) => void) => {
  const html = await (await fetch(`/index.html?bf=${Date.now()}`, { cache: 'no-store' })).text();
  if (html.includes('/src/main.tsx')) {
    throw new Error('Это окно предпросмотра, тут нет готового билда. Открой комендантскую на опубликованном адресе.');
  }
  const listRes = await fetch(`/build-files.json?bf=${Date.now()}`, { cache: 'no-store' });
  const staticFiles: string[] = listRes.ok ? ((await listRes.json()) as { files: string[] }).files || [] : [];

  const data: Record<string, Uint8Array> = { 'index.html': strToU8(html), 'chat/api.php': strToU8(apiPhp) };
  const seen = new Set<string>(['index.html']);
  const queue: string[] = [];
  const add = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p);
      queue.push(p);
    }
  };
  const scan = (text: string) => {
    for (const m of text.matchAll(ASSET_RE)) add(`assets/${m[1]}`);
  };
  scan(html);
  staticFiles.forEach(add);

  let done = 0;
  const worker = async () => {
    while (queue.length) {
      const p = queue.shift() as string;
      let bytes: Uint8Array;
      try {
        bytes = await grab(p);
      } catch (e) {
        if (p.startsWith('assets/')) throw e;
        continue;
      }
      data[p] = bytes;
      if (/\.(js|css)$/.test(p)) scan(new TextDecoder().decode(bytes));
      done += 1;
      onProgress?.(done, done + queue.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  saveBlob(new Blob([zipSync(data, { level: 6 })], { type: 'application/zip' }), `chat-site-${stamp}.zip`);
  return Object.keys(data).length;
};
