import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { formatVoiceTime } from '@/hooks/use-voice-recorder';

type Props = { src: string; duration: number | null };

const VoiceMessage = ({ src, duration }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState<number>(duration ?? 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== audioRef.current) audioRef.current?.pause();
    };
    window.addEventListener('voice:play', onOther);
    return () => window.removeEventListener('voice:play', onOther);
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      window.dispatchEvent(new CustomEvent('voice:play', { detail: a }));
      a.play().catch(() => setFailed(true));
    } else {
      a.pause();
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !total) return;
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * total;
    a.currentTime = t;
    setCurrent(t);
  };

  const pct = total ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className="mt-1 flex w-[260px] max-w-full items-center gap-2.5 border-2 border-sky-400/60 bg-sky-400/5 px-2 py-1.5">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setTotal(d);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(e) => {
          setPlaying(false);
          setCurrent(0);
          e.currentTarget.currentTime = 0;
        }}
        onError={() => setFailed(true)}
        className="hidden"
      />
      <button
        type="button"
        onClick={toggle}
        disabled={failed}
        aria-label={playing ? 'Пауза' : 'Слушать'}
        className="flex h-9 w-9 shrink-0 items-center justify-center bg-sky-400 text-black transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        <Icon name={playing ? 'Pause' : 'Play'} size={16} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div onClick={seek} className="relative h-2 cursor-pointer bg-foreground/15">
          <div className="absolute inset-y-0 left-0 bg-sky-400" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between font-mono text-[0.64rem] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Icon name="Mic" size={11} className="text-sky-300" />
            {failed ? 'не воспроизводится' : 'голосовое'}
          </span>
          <span className={cn(playing && 'text-sky-300')}>
            {playing || current > 0 ? formatVoiceTime(current) : formatVoiceTime(total)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessage;
