import Icon from '@/components/ui/icon';
import { ApiFile } from '@/lib/api';

const sizeText = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(n / 1024))} КБ`;

const PrivateFile = ({ file }: { file: ApiFile }) => {
  if (file.type === 'image') {
    return (
      <a href={file.url} target="_blank" rel="noreferrer" className="mt-1 block w-fit">
        <img
          src={file.url}
          alt={file.name}
          loading="lazy"
          className="max-h-64 max-w-[min(100%,320px)] border-2 border-sky-400/60 object-contain"
        />
      </a>
    );
  }
  if (file.type === 'video') {
    return (
      <video src={file.url} controls preload="metadata" className="mt-1 max-h-72 max-w-[min(100%,360px)] border-2 border-sky-400/60" />
    );
  }
  if (file.type === 'audio') {
    return <audio src={file.url} controls preload="metadata" className="mt-1 w-full max-w-[320px]" />;
  }
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      download={file.name}
      className="mt-1 flex w-fit max-w-full items-center gap-2 border-2 border-sky-400/60 px-3 py-2 text-[0.88rem] text-foreground transition-colors hover:border-sky-400 hover:bg-sky-400/10"
    >
      <Icon name="FileDown" size={18} className="shrink-0 text-sky-300" />
      <span className="truncate">{file.name}</span>
      <span className="shrink-0 font-mono text-[0.7rem] text-muted-foreground">{sizeText(file.size)}</span>
    </a>
  );
};

export default PrivateFile;
