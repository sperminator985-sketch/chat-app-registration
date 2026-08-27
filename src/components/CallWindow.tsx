import { useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useCall } from '@/hooks/use-call';

const Video = ({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
};

const CallWindow = () => {
  const { status, peerNick, localStream, remoteStream, micOn, camOn, acceptCall, declineCall, hangUp, toggleMic, toggleCam } = useCall();

  if (status === 'idle') return null;

  const ringing = status === 'calling' || status === 'incoming';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4">
      <div className="flex w-full max-w-[900px] flex-col border-2 border-foreground/40 bg-background">
        <div className="flex items-center gap-3 border-b-2 border-foreground/35 px-5 py-4">
          <Icon name="Video" size={18} className="text-secondary" />
          <p className="font-display text-base font-extrabold uppercase leading-none tracking-[-0.02em] sm:text-lg">
            {status === 'incoming' ? 'Стучатся по видео' : status === 'calling' ? 'Дозваниваемся' : 'Видеосвязь'}
            {peerNick ? ` · ${peerNick}` : ''}
          </p>
        </div>

        <div className="relative bg-muted/40">
          <Video
            stream={remoteStream}
            className={cn('aspect-video w-full bg-black object-cover', ringing && 'opacity-40')}
          />

          {ringing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <span className="animate-pulse font-display text-xl font-extrabold uppercase tracking-[-0.02em] text-foreground">
                {status === 'incoming' ? `${peerNick} звонит` : `Ждём ${peerNick}`}
              </span>
              <span className="text-[0.9rem] text-muted-foreground">
                {status === 'incoming' ? 'Возьмёшь трубку?' : 'Гудки идут по коридору…'}
              </span>
            </div>
          )}

          {localStream && (
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
                title={camOn ? 'Выключить камеру' : 'Включить камеру'}
                className={cn(
                  'flex h-11 w-11 items-center justify-center border-2 transition-colors',
                  camOn ? 'border-foreground/40 text-foreground hover:border-secondary' : 'border-primary bg-primary text-primary-foreground',
                )}
              >
                <Icon name={camOn ? 'Video' : 'VideoOff'} size={18} />
              </button>
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
