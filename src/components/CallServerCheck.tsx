import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

type StepState = 'wait' | 'run' | 'ok' | 'fail' | 'warn';
type Step = { title: string; state: StepState; note?: string };

const INITIAL: Step[] = [
  { title: 'Настройки в config.php', state: 'wait' },
  { title: 'Сервер отвечает и принимает ключ', state: 'wait' },
  { title: 'Видео проходит через сервер', state: 'wait' },
];

const isRelay = (c: RTCIceCandidate) => c.type === 'relay' || / typ relay /.test(c.candidate);

const findRelay = (iceServers: RTCIceServer[]) =>
  new Promise<{ ok: boolean; code?: number }>((resolve) => {
    const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'relay' });
    let code: number | undefined;
    const finish = (ok: boolean) => {
      window.clearTimeout(timer);
      pc.close();
      resolve({ ok, code });
    };
    const timer = window.setTimeout(() => finish(false), 10000);
    pc.onicecandidate = (e) => {
      if (e.candidate && isRelay(e.candidate)) finish(true);
    };
    pc.onicecandidateerror = (e) => {
      const err = e as RTCPeerConnectionIceErrorEvent;
      if (err.errorCode) code = err.errorCode;
    };
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') finish(false);
    };
    pc.createDataChannel('probe');
    pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => finish(false));
  });

const loopback = (iceServers: RTCIceServer[]) =>
  new Promise<boolean>((resolve) => {
    const cfg: RTCConfiguration = { iceServers, iceTransportPolicy: 'relay' };
    const a = new RTCPeerConnection(cfg);
    const b = new RTCPeerConnection(cfg);
    const finish = (ok: boolean) => {
      window.clearTimeout(timer);
      a.close();
      b.close();
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), 15000);
    a.onicecandidate = (e) => e.candidate && b.addIceCandidate(e.candidate).catch(() => undefined);
    b.onicecandidate = (e) => e.candidate && a.addIceCandidate(e.candidate).catch(() => undefined);
    b.ondatachannel = (e) => {
      e.channel.onmessage = (m) => finish(m.data === 'ping');
    };
    const ch = a.createDataChannel('probe');
    ch.onopen = () => ch.send('ping');
    (async () => {
      const offer = await a.createOffer();
      await a.setLocalDescription(offer);
      await b.setRemoteDescription(offer);
      const answer = await b.createAnswer();
      await b.setLocalDescription(answer);
      await a.setRemoteDescription(answer);
    })().catch(() => finish(false));
  });

const CallServerCheck = () => {
  const [steps, setSteps] = useState<Step[]>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const set = (i: number, state: StepState, note?: string) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, state, note } : s)));

  const run = async () => {
    setOpen(true);
    setBusy(true);
    setSteps(INITIAL);
    try {
      set(0, 'run');
      let ice: RTCIceServer[] = [];
      try {
        const res = await api.callIce();
        if (!res.turn) {
          set(0, 'fail', 'Блок turn_urls в config.php пустой — впиши адрес сервера и ключ');
          return;
        }
        ice = res.iceServers;
      } catch (e) {
        const msg = (e as Error).message;
        set(
          0,
          'fail',
          /Неизвестное действие/.test(msg)
            ? 'На хостинге старый api.php — скачай свежий кнопкой «api.php» ниже и залей'
            : `Сайт не ответил: ${msg}`,
        );
        return;
      }
      set(0, 'ok');

      set(1, 'run');
      const relay = await findRelay(ice);
      if (!relay.ok) {
        const note =
          relay.code === 401
            ? 'Сервер отклонил ключ — проверь, что secret в eturnal.yml и turn_secret в config.php совпадают'
            : 'Сервер не отвечает. Если ты сейчас в домашней сети, где стоит сервер, — повтори проверку с телефона через мобильный интернет: многие роутеры не пускают к своему же белому IP изнутри. Если и там не отвечает — проверь, что eturnal запущен, порт 3478 открыт в брандмауэре и на роутере';
        set(1, 'fail', note);
        return;
      }
      set(1, 'ok');

      set(2, 'run');
      const passed = await loopback(ice);
      if (passed) {
        set(2, 'ok');
      } else {
        set(
          2,
          'warn',
          'Сервер работает, но данные не прошли. Проверь правило на роутере для UDP 49160–49200. Если ты сейчас в той же домашней сети, что и сервер, — повтори проверку с мобильного интернета',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const allOk = steps.every((s) => s.state === 'ok');

  return (
    <div className="mt-6 border-2 border-foreground/35 bg-card px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="RadioTower" size={16} className="text-secondary" />
        <span className="font-display text-[0.85rem] font-extrabold uppercase tracking-[0.04em]">
          Сервер звонков
        </span>
        <button
          onClick={run}
          disabled={busy}
          className="ml-auto flex items-center gap-1.5 border-2 border-secondary px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.08em] text-secondary transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:opacity-60"
        >
          <Icon name={busy ? 'Loader2' : 'Play'} size={13} className={cn(busy && 'animate-spin')} />
          {busy ? 'Проверяю…' : 'Проверить'}
        </button>
      </div>

      {open && (
        <ul className="mt-3 space-y-2">
          {steps.map((s) => (
            <li key={s.title} className="flex items-start gap-2 text-[0.82rem]">
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center',
                  s.state === 'ok' && 'text-emerald-400',
                  s.state === 'fail' && 'text-primary',
                  s.state === 'warn' && 'text-amber-400',
                  (s.state === 'wait' || s.state === 'run') && 'text-muted-foreground',
                )}
              >
                <Icon
                  name={
                    s.state === 'ok'
                      ? 'CircleCheck'
                      : s.state === 'fail'
                        ? 'CircleX'
                        : s.state === 'warn'
                          ? 'TriangleAlert'
                          : s.state === 'run'
                            ? 'Loader2'
                            : 'Circle'
                  }
                  size={15}
                  className={cn(s.state === 'run' && 'animate-spin')}
                />
              </span>
              <span>
                <span className={cn(s.state === 'wait' ? 'text-muted-foreground' : 'text-foreground')}>
                  {s.title}
                </span>
                {s.note && (
                  <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-muted-foreground">{s.note}</span>
                )}
              </span>
            </li>
          ))}
          {allOk && (
            <li className="pt-1 text-[0.78rem] text-emerald-400">
              Всё в порядке — звонки пойдут через сервер, если напрямую не получится.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default CallServerCheck;