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
