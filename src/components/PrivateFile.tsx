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
  const [ready, setReady] = useState(false);

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
        onLoadedMetadata={() => setReady(true)}
        onError={() => setFailed(true)}
        className="max-h-72 max-w-[min(100%,360px)] border-2 border-sky-400/60 bg-black"
      />
      <div className="mt-0.5 flex items-center gap-2 font-mono text-[0.66rem] text-muted-foreground">
        {!ready && <span className="animate-pulse">видео подгружается…</span>}
        <a href={file.url} target="_blank" rel="noreferrer" download={file.name} className="underline hover:text-sky-300">
          скачать · {sizeText(file.size)}
        </a>
      </div>
    </div>
  );
};

const PrivateFile = ({ file, localUrl }: { file: ApiFile; localUrl?: string }) => {
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
