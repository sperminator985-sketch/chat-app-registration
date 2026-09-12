import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { api, type VaultInfo, type VaultMessage } from '@/lib/api';
import {
  generatePair,
  packPair,
  unpackPrivate,
  exportPrivateJwk,
  importPrivateJwk,
  openText,
  parseEnvelope,
  toB64,
} from '@/lib/crypto';

const fingerprintOf = async (jwk: string) => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jwk));
  return toB64(hash).slice(0, 24);
};

const VaultPanel = () => {
  const { toast } = useToast();
  const [info, setInfo] = useState<VaultInfo | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [keyFile, setKeyFile] = useState('');
  const [unlocked, setUnlocked] = useState<CryptoKey | null>(null);
  const [items, setItems] = useState<VaultMessage[]>([]);
  const [plain, setPlain] = useState<Record<number, string>>({});
  const [idleLeft, setIdleLeft] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.adminVault();
      setInfo(res.vault);
      setCount(res.messages);
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const createKey = async () => {
    if (phrase.trim().length < 12) {
      toast({ title: 'Пароль-фраза должна быть от 12 символов', variant: 'destructive' });
      return;
    }
    if (info && !confirm('Старый ключ перестанет работать, а вся переписка под ним станет нечитаемой. Продолжить?')) {
      return;
    }
    setBusy(true);
    try {
      const pair = await generatePair();
      const bundle = await packPair(pair, phrase.trim());
      const fp = await fingerprintOf(bundle.publicJwk);
      await api.adminVaultSet({ publicJwk: bundle.publicJwk, fingerprint: fp });

      const blob = new Blob([JSON.stringify({ ...bundle, fingerprint: fp }, null, 2)], {
        type: 'application/json',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'obshaga-master-key.json';
      a.click();
      URL.revokeObjectURL(a.href);

      setPhrase('');
      await load();
      toast({ title: 'Ключ создан, файл скачан. Храни его надёжно' });
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (file?: File | null) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setKeyFile(String(r.result || ''));
    r.readAsText(file);
  };

  const unlock = async () => {
    if (!keyFile) {
      toast({ title: 'Загрузи файл ключа', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const parsed = JSON.parse(keyFile);
      let priv: CryptoKey;
      if (parsed.privateEnc) {
        priv = await unpackPrivate(parsed, phrase.trim());
      } else {
        priv = await importPrivateJwk(keyFile);
      }
      setUnlocked(priv);
      const res = await api.adminDmVault();
      setItems(res.messages);

      const next: Record<number, string> = {};
      for (const m of res.messages) {
        const env = parseEnvelope(m.cipher);
        if (!env) continue;
        try {
          next[m.id] = await openText(env, 'vault', priv);
        } catch {
          next[m.id] = '— не расшифровать этим ключом';
        }
      }
      setPlain(next);
      setPhrase('');
      toast({ title: `Открыто сообщений: ${res.messages.length}` });
    } catch {
      toast({ title: 'Не подошёл ключ или фраза', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!unlocked) return;
    setIdleLeft(15 * 60);
    const tick = window.setInterval(() => {
      setIdleLeft((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);
    const wake = () => setIdleLeft(15 * 60);
    window.addEventListener('mousemove', wake);
    window.addEventListener('keydown', wake);
    window.addEventListener('touchstart', wake);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('touchstart', wake);
    };
  }, [unlocked]);

  useEffect(() => {
    if (unlocked && idleLeft === 0) {
      setUnlocked(null);
      setItems([]);
      setPlain({});
      setKeyFile('');
      toast({ title: 'Сейф закрылся сам — не было действий 15 минут' });
    }
  }, [idleLeft, unlocked, toast]);

  const lock = () => {
    setUnlocked(null);
    setItems([]);
    setPlain({});
    setKeyFile('');
  };

  const wipe = async () => {
    if (!confirm('Удалить ВСЕ личные сообщения без возможности восстановления?')) return;
    setBusy(true);
    try {
      const res = await api.adminDmWipe();
      setItems([]);
      setPlain({});
      await load();
      toast({ title: `Удалено сообщений: ${res.removed}` });
    } catch (e) {
      toast({ title: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const exportKey = async () => {
    if (!unlocked) return;
    const jwk = await exportPrivateJwk(unlocked);
    const blob = new Blob([jwk], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'obshaga-master-key-raw.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-foreground/35 bg-card px-4 py-4">
        <p className="mb-2 flex items-center gap-2 font-display text-[0.95rem] font-extrabold uppercase tracking-[0.04em]">
          <Icon name="ShieldCheck" size={18} className="text-secondary" />
          Главный ключ
        </p>
        {info ? (
          <p className="text-[0.85rem] leading-relaxed text-muted-foreground">
            Ключ установлен {info.since}. Отпечаток{' '}
            <span className="font-mono text-foreground">{info.fingerprint}</span>. Зашифрованных
            сообщений в базе: <span className="text-foreground">{count}</span>.
          </p>
        ) : (
          <p className="text-[0.85rem] leading-relaxed text-muted-foreground">
            Ключа пока нет — личные сообщения хранятся как обычный текст. Создай ключ, чтобы вся
            новая переписка шифровалась и читалась только тобой.
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="Пароль-фраза (от 12 символов)"
            className="w-full border-2 border-foreground/35 bg-input px-3 py-2 outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-secondary"
          />
          <button
            onClick={createKey}
            disabled={busy}
            className="shrink-0 border-2 border-primary bg-primary px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {info ? 'Заменить ключ' : 'Создать ключ'}
          </button>
        </div>
        <p className="mt-2 text-[0.75rem] leading-relaxed text-muted-foreground/80">
          Файл ключа скачается автоматически. Потеряешь файл или забудешь фразу — переписку не
          восстановит никто, включая меня.
        </p>
      </div>

      <div className="border-2 border-foreground/35 bg-card px-4 py-4">
        <p className="mb-2 flex items-center gap-2 font-display text-[0.95rem] font-extrabold uppercase tracking-[0.04em]">
          <Icon name={unlocked ? 'LockOpen' : 'Lock'} size={18} className="text-secondary" />
          Читальный зал
        </p>
        {unlocked ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-auto font-mono text-[0.75rem] text-muted-foreground">
              закроется через {Math.floor(idleLeft / 60)}:
              {String(idleLeft % 60).padStart(2, '0')}
            </span>
            <button
              onClick={lock}
              className="border-2 border-foreground/35 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
            >
              Закрыть сейф
            </button>
            <button
              onClick={exportKey}
              className="border-2 border-foreground/35 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
            >
              Резервная копия ключа
            </button>
            <button
              onClick={wipe}
              disabled={busy}
              className="border-2 border-primary px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              Стереть всю личку
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 border-2 border-dashed border-foreground/35 px-3 py-3 text-[0.82rem] text-muted-foreground transition-colors hover:border-secondary">
              <Icon name="Upload" size={16} />
              {keyFile ? 'Файл ключа загружен' : 'Выбрать файл ключа'}
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="Пароль-фраза от ключа"
                className="w-full border-2 border-foreground/35 bg-input px-3 py-2 outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-secondary"
              />
              <button
                onClick={unlock}
                disabled={busy}
                className="shrink-0 border-2 border-secondary bg-secondary px-3 py-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-secondary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Открыть
              </button>
            </div>
            <p className="text-[0.75rem] text-muted-foreground/80">
              Ключ никуда не отправляется — расшифровка идёт прямо в этом браузере.
            </p>
          </div>
        )}
      </div>

      {unlocked && (
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="border-2 border-foreground/35 bg-card px-4 py-6 text-center text-[0.9rem] text-muted-foreground">
              Зашифрованной переписки пока нет
            </p>
          ) : (
            items.map((m) => (
              <div key={m.id} className="border-2 border-foreground/35 bg-card px-4 py-3">
                <p className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted-foreground">
                  <span className="font-semibold text-foreground">{m.from}</span>
                  <Icon name="ArrowRight" size={13} />
                  <span className="font-semibold text-foreground">{m.to}</span>
                  <span className="ml-auto font-mono text-[0.75rem]">{m.time}</span>
                </p>
                <p
                  className={cn(
                    'mt-1 text-[0.92rem]',
                    plain[m.id]?.startsWith('—') ? 'text-muted-foreground/70' : 'text-foreground/90',
                  )}
                >
                  {plain[m.id] ?? '…'}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default VaultPanel;
