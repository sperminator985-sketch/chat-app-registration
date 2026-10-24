import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { ApiFile } from '@/lib/api';

const sizeText = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(n / 1024))} КБ`;

const DownloadCard = ({ file, note }: { file: ApiFile; note?: string }) => (
  <div className="mt-1 w-fit max-w-full">
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      download={file.name}
      className="flex w-fit max-w-full items-center gap-2 border-2 border-sky-400/60 px-3 py-2 text-[0.88rem] text-foreground transition-colors hover:border-sky-400 hover:bg-sky-400/10"
    >
      <Icon name="FileDown" size={18} className="shrink-0 text-sky-300" />
      <span className="truncate">{file.name}</span>
      <span className="shrink-0 font-mono text-[0.7rem] text-muted-foreground">{sizeText(file.size)}</span>
    </a>
    {note && <p className="mt-1 font-mono text-[0.66rem] text-muted-foreground">{note}</p>}
  </div>
);

const PrivateVideo = ({ file, localUrl }: { file: ApiFile; localUrl?: string }) => {
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(false);

  if (failed) {
    return <DownloadCard file={file} note="Браузер не умеет показывать этот формат видео — скачайте файл" />;
  }

  return (
    <div className="mt-1 w-fit max-w-full">
      <video
        src={localUrl ?? file.url}
        controls
        playsInline
        preload="metadata"
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onPause={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onError={() => setFailed(true)}
        className="max-h-72 max-w-[min(100%,360px)] border-2 border-sky-400/60 bg-black"
      />
      <div className="mt-0.5 flex items-center gap-2 font-mono text-[0.66rem] text-muted-foreground">
        {waiting && <span className="animate-pulse">видео подгружается…</span>}
        <a href={file.url} target="_blank" rel="noreferrer" download={file.name} className="underline hover:text-sky-300">
          скачать · {sizeText(file.size)}
        </a>
      </div>
    </div>
  );
};

type Props = { file: ApiFile; localUrl?: string; gone?: boolean; receiving?: number | null };

const PrivateFile = ({ file, localUrl, gone, receiving }: Props) => {
  if (gone) {
    return (
      <div className="mt-1 flex w-fit max-w-full items-center gap-2 border-2 border-dashed border-foreground/25 px-3 py-2 text-[0.82rem] text-muted-foreground">
        <Icon name="FileX" size={16} className="shrink-0" />
        <span className="truncate">{file.name}</span>
        <span className="shrink-0 font-mono text-[0.66rem]">не сохранён на этом устройстве</span>
      </div>
    );
  }
  if (receiving != null) {
    return (
      <div className="mt-1 w-fit max-w-full border-2 border-sky-400/60 px-3 py-2 text-[0.82rem] text-foreground">
        <div className="flex items-center gap-2">
          <Icon name="Download" size={16} className="shrink-0 animate-pulse text-sky-300" />
          <span className="truncate">{file.name}</span>
          <span className="shrink-0 font-mono text-[0.7rem] text-sky-300">{receiving}%</span>
        </div>
        <div className="mt-1.5 h-1 w-48 max-w-full bg-foreground/15">
          <div className="h-full bg-sky-400 transition-[width] duration-200" style={{ width: `${receiving}%` }} />
        </div>
      </div>
    );
  }
  if (!file.url) return null;
  if (file.type === 'image') {
    return (
      <a href={file.url} target="_blank" rel="noreferrer" className="mt-1 block w-fit">
        <img
          src={localUrl ?? file.url}
          alt={file.name}
          loading="lazy"
          className="max-h-64 max-w-[min(100%,320px)] border-2 border-sky-400/60 object-contain"
        />
      </a>
    );
  }
  if (file.type === 'video') {
    return <PrivateVideo file={file} localUrl={localUrl} />;
  }
  if (file.type === 'audio') {
    return <audio src={localUrl ?? file.url} controls preload="metadata" className="mt-1 w-full max-w-[320px]" />;
  }
  return <DownloadCard file={file} />;
};

export default PrivateFile;
