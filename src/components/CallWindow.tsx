import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useCall, QUALITY_PRESETS, type CallQuality } from '@/hooks/use-call';

const Video = ({
  stream,
  muted,
  className,
  style,
  onBlocked,
  onRatio,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onBlocked?: (play: (() => void) | null) => void;
  onRatio?: (ratio: number) => void;
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (!stream) return;
    const tryPlay = () => {
      el.play()
        .then(() => onBlocked?.(null))
        .catch(() => onBlocked?.(() => el.play().then(() => onBlocked?.(null)).catch(() => undefined)));
    };
    tryPlay();
    const tracks = stream.getTracks();
    tracks.forEach((t) => t.addEventListener('unmute', tryPlay));
    stream.addEventListener('addtrack', tryPlay);
    el.addEventListener('loadedmetadata', tryPlay);
    return () => {
      tracks.forEach((t) => t.removeEventListener('unmute', tryPlay));
      stream.removeEventListener('addtrack', tryPlay);
      el.removeEventListener('loadedmetadata', tryPlay);
    };
  }, [stream, onBlocked]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onRatio) return;
    const update = () => {
      if (el.videoWidth && el.videoHeight) onRatio(el.videoWidth / el.videoHeight);
    };
    update();
    el.addEventListener('loadedmetadata', update);
    el.addEventListener('resize', update);
    return () => {
      el.removeEventListener('loadedmetadata', update);
      el.removeEventListener('resize', update);
    };
  }, [onRatio]);

  return <video ref={ref} autoPlay playsInline muted={muted} className={className} style={style} />;
};

const Audio = ({ stream, onBlocked }: { stream: MediaStream | null; onBlocked?: (play: (() => void) | null) => void }) => {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (!stream) return;
    el.play()
      .then(() => onBlocked?.(null))
      .catch(() => onBlocked?.(() => el.play().then(() => onBlocked?.(null)).catch(() => undefined)));
  }, [stream, onBlocked]);

  return <audio ref={ref} autoPlay className="hidden" />;
};

const CallWindow = () => {
  const [resume, setResume] = useState<(() => void) | null>(null);
  const onBlocked = useRef((play: (() => void) | null) => setResume(() => play)).current;
  const [remoteRatio, setRemoteRatio] = useState(0);
  const [localRatio, setLocalRatio] = useState(0);
  const [boxRatio, setBoxRatio] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const { status, peerNick, localStream, remoteStream, micOn, camOn, mode, link, acceptCall, declineCall, hangUp, toggleMic, toggleCam, quality, setQuality, maintenance } = useCall();
  const [pressed, setPressed] = useState<'accept' | 'hang' | 'decline' | null>(null);
  useEffect(() => {
    setPressed(null);
  }, [status]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth && el.clientHeight) setBoxRatio(el.clientWidth / el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [status]);

  if (status === 'idle') return null;

  const sameShape = remoteRatio > 0 && boxRatio > 0 && remoteRatio > 1 === boxRatio > 1;
  const pipPortrait = localRatio > 0 && localRatio < 1;

  const ringing = status === 'calling' || status === 'incoming';
  const voice = mode === 'audio';

  return (
    <div className="fixed inset-0 z-[80] flex bg-black">
      <div className="flex h-[100dvh] w-full flex-col bg-background">
        <div className="flex items-center gap-3 border-b-2 border-foreground/35 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Icon name={voice ? 'Phone' : 'Video'} size={18} className="text-secondary" />
          <p className="font-display text-base font-extrabold uppercase leading-none tracking-[-0.02em] sm:text-lg">
            {status === 'incoming'
              ? voice ? 'Звонок по голосу' : 'Стучатся по видео'
              : status === 'calling'
                ? 'Дозваниваемся'
                : voice ? 'Голосовая связь' : 'Видеосвязь'}
            {peerNick ? ` · ${peerNick}` : ''}
          </p>
        </div>

        <div ref={boxRef} className="relative min-h-0 flex-1 bg-black">
          {voice ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-black/90">
              <Audio stream={remoteStream} onBlocked={onBlocked} />
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-secondary/70 bg-background/10">
                <Icon name="Phone" size={40} className="text-secondary" />
              </div>
              <span className="font-display text-xl font-extrabold uppercase tracking-[-0.02em] text-foreground">
                {peerNick}
              </span>
              <span className="text-[0.9rem] text-muted-foreground">
                {status === 'incoming'
                  ? 'Голосовой звонок — возьмёшь трубку?'
                  : status === 'calling'
                    ? 'Гудки идут по коридору…'
                    : 'Разговор идёт'}
              </span>
            </div>
          ) : (
            <>
            <Audio stream={remoteStream} onBlocked={onBlocked} />
            <Video
              stream={remoteStream}
              muted
              onRatio={setRemoteRatio}
              className={cn('h-full w-full bg-black', sameShape ? 'object-cover' : 'object-contain', ringing && 'opacity-40')}
            />
            </>
          )}

          {status === 'active' && link !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 px-6 text-center">
              <span className="animate-pulse font-display text-lg font-extrabold uppercase tracking-[-0.02em] text-white">
                {link === 'stuck' ? 'Связь не проходит' : 'Соединяемся…'}
              </span>
              {link === 'stuck' && (
                <span className="max-w-sm text-[0.85rem] text-white/75">
                  Сеть кого-то из вас не пропускает видео напрямую. Чтобы звонки проходили всегда, нужен промежуточный сервер для звонков.
                </span>
              )}
            </div>
          )}

          {status === 'active' && link === 'connected' && resume && (
            <button
              type="button"
              onClick={() => resume()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white"
            >
              <Icon name="Play" size={44} />
              <span className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">
                {voice ? 'Нажми, чтобы включить звук' : 'Нажми, чтобы включить видео'}
              </span>
            </button>
          )}

          {!voice && ringing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <span className="animate-pulse font-display text-xl font-extrabold uppercase tracking-[-0.02em] text-foreground">
                {status === 'incoming' ? `${peerNick} звонит` : `Ждём ${peerNick}`}
              </span>
              <span className="text-[0.9rem] text-muted-foreground">
                {status === 'incoming' ? 'Возьмёшь трубку?' : 'Гудки идут по коридору…'}
              </span>
            </div>
          )}

          {maintenance && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-[repeating-linear-gradient(-45deg,#111_0,#111_28px,#1c1c1c_28px,#1c1c1c_56px)] px-6 text-center">
              <div className="flex h-24 w-24 items-center justify-center border-4 border-secondary bg-black sm:h-28 sm:w-28">
                <Icon name="Wrench" size={48} className="text-secondary" />
              </div>
              <span className="bg-black px-3 py-1 font-display text-2xl font-extrabold uppercase leading-tight tracking-[-0.02em] text-secondary sm:text-4xl">
                Технические работы
                <br />
                на сервере
              </span>
              <span className="max-w-md bg-black/80 px-3 py-1 text-[0.95rem] text-white/80">
                Видеосвязь временно недоступна. Положи трубку и позвони чуть позже.
              </span>
            </div>
          )}

          {!voice && localStream && !maintenance && (
            <Video
              stream={localStream}
              muted
              onRatio={setLocalRatio}
              style={{ aspectRatio: localRatio || undefined }}
              className={cn(
                'absolute bottom-4 right-4 border-2 border-foreground/50 bg-black object-cover',
                pipPortrait ? 'h-40 w-auto sm:h-48 lg:h-56' : 'h-auto w-32 sm:w-56 lg:w-72',
              )}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t-2 border-foreground/35 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {status === 'incoming' ? (
            <>
              <button
                onClick={() => {
                  if (pressed) return;
                  setPressed('accept');
                  acceptCall();
                }}
                className={cn(
                  'btn-brut flex items-center gap-2 active:scale-95 active:border-emerald-500 active:bg-emerald-500 active:text-black',
                  pressed === 'accept' && '!border-emerald-500 !bg-emerald-500 !text-black',
                )}
              >
                <Icon name={pressed === 'accept' ? 'Loader2' : 'Phone'} size={16} className={cn(pressed === 'accept' && 'animate-spin')} />
                {pressed === 'accept' ? 'Соединяю…' : 'Взять трубку'}
              </button>
              <button
                onClick={() => {
                  if (pressed) return;
                  setPressed('decline');
                  window.setTimeout(declineCall, 250);
                }}
                className={cn(
                  'btn-ghost-brut flex items-center gap-2 active:scale-95 active:border-red-600 active:bg-red-600 active:text-white',
                  pressed === 'decline' && '!border-red-600 !bg-red-600 !text-white',
                )}
              >
                <Icon name="PhoneOff" size={16} />
                {pressed === 'decline' ? 'Отклоняю…' : 'Не сейчас'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleMic}
                title={micOn ? 'Выключить микрофон' : 'Включить микрофон'}
                className={cn(
                  'flex h-11 w-11 items-center justify-center border-2 transition-colors',
                  micOn ? 'border-foreground/40 text-foreground hover:border-secondary' : 'border-primary bg-primary text-primary-foreground',
                )}
              >
                <Icon name={micOn ? 'Mic' : 'MicOff'} size={18} />
              </button>
              <button
                onClick={toggleCam}
                disabled={voice}
                title={voice ? 'Голосовой звонок без камеры' : camOn ? 'Выключить камеру' : 'Включить камеру'}
                className={cn(
                  'flex h-11 w-11 items-center justify-center border-2 transition-colors',
                  camOn ? 'border-foreground/40 text-foreground hover:border-secondary' : 'border-primary bg-primary text-primary-foreground',
                  voice && 'cursor-not-allowed opacity-40',
                )}
              >
                <Icon name={camOn ? 'Video' : 'VideoOff'} size={18} />
              </button>
              {!voice && (
                <div className="flex border-2 border-foreground/40" role="group" aria-label="Качество видео">
                  {(Object.keys(QUALITY_PRESETS) as CallQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      title={`Качество: ${QUALITY_PRESETS[q].label}`}
                      className={cn(
                        'h-10 px-2.5 text-[0.68rem] font-bold uppercase tracking-[0.06em] transition-colors sm:px-3 sm:text-[0.72rem]',
                        quality === q
                          ? 'bg-secondary text-secondary-foreground'
                          : 'text-muted-foreground hover:text-secondary',
                      )}
                    >
                      {QUALITY_PRESETS[q].label}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  if (pressed === 'hang') return;
                  setPressed('hang');
                  window.setTimeout(hangUp, 250);
                }}
                className={cn(
                  'btn-brut flex items-center gap-2 active:scale-95 active:border-red-600 active:bg-red-600 active:text-white',
                  pressed === 'hang' && '!border-red-600 !bg-red-600 !text-white',
                )}
              >
                <Icon name="PhoneOff" size={16} />
                {pressed === 'hang' ? 'Кладу трубку…' : 'Положить трубку'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallWindow;