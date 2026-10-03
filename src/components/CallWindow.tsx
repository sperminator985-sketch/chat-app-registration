import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useCall, QUALITY_PRESETS, type CallQuality } from '@/hooks/use-call';

const Video = ({
  stream,
  muted,
  className,
  onBlocked,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
  onBlocked?: (play: (() => void) | null) => void;
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

  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
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
  const { status, peerNick, localStream, remoteStream, micOn, camOn, mode, link, acceptCall, declineCall, hangUp, toggleMic, toggleCam, quality, setQuality } = useCall();

  if (status === 'idle') return null;

  const ringing = status === 'calling' || status === 'incoming';
  const voice = mode === 'audio';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4">
      <div className="flex w-full max-w-[900px] flex-col border-2 border-foreground/40 bg-background">
        <div className="flex items-center gap-3 border-b-2 border-foreground/35 px-5 py-4">
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

        <div className="relative bg-muted/40">
          {voice ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-black/90">
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
              className={cn('aspect-video w-full bg-black object-cover', ringing && 'opacity-40')}
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

          {!voice && localStream && (
            <Video
              stream={localStream}
              muted
              className="absolute bottom-4 right-4 h-[22%] w-[28%] border-2 border-foreground/50 bg-black object-cover"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 border-t-2 border-foreground/35 px-5 py-4">
          {status === 'incoming' ? (
            <>
              <button onClick={acceptCall} className="btn-brut flex items-center gap-2">
                <Icon name="Phone" size={16} />
                Взять трубку
              </button>
              <button onClick={declineCall} className="btn-ghost-brut flex items-center gap-2">
                <Icon name="PhoneOff" size={16} />
                Не сейчас
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
              <button onClick={hangUp} className="btn-brut flex items-center gap-2">
                <Icon name="PhoneOff" size={16} />
                Положить трубку
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallWindow;