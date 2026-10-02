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

export const downloadBuildZip = async (onProgress?: (done: number, total: number) => void) => {
  const res = await fetch(`/build-files.json?bf=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Список файлов билда не найден. Скачивание билда работает только на опубликованном сайте.');
  const manifest = (await res.json()) as { builtAt?: string; files: string[] };
  const files = manifest.files || [];
  const data: Record<string, Uint8Array> = {};
  let done = 0;
  const queue = [...files];
  const worker = async () => {
    while (queue.length) {
      const name = queue.shift() as string;
      const r = await fetch(`/${name.split('/').map(encodeURIComponent).join('/')}?bf=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Не скачался файл ${name}`);
      data[name] = new Uint8Array(await r.arrayBuffer());
      done += 1;
      onProgress?.(done, files.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  const stamp = (manifest.builtAt || new Date().toISOString()).slice(0, 16).replace(/[-:T]/g, '');
  const blob = new Blob([zipSync(data, { level: 6 })], { type: 'application/zip' });
  saveBlob(blob, `chat-build-${stamp}.zip`);
  return files.length;
};
