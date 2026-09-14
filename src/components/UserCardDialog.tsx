import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { AvatarId, NickColor, nickColorClass, staffNickClass } from '@/data/chat';
import { toast } from '@/hooks/use-toast';

export type CardPerson = {
  nick: string;
  color: NickColor;
  status?: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  since?: string | null;
};

type Props = {
  person: CardPerson | null;
  onOpenChange: (v: boolean) => void;
};

const humanDate = (iso?: string | null) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return null;
  return `${d}.${m}.${y}`;
};

const ageFrom = (iso?: string | null) => {
  if (!iso) return null;
  const born = new Date(iso);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const md = now.getMonth() - born.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
};

const yearsWord = (n: number) => {
  const t = n % 100;
  if (t >= 11 && t <= 14) return 'лет';
  const last = n % 10;
  if (last === 1) return 'год';
  if (last >= 2 && last <= 4) return 'года';
  return 'лет';
};

const UserCardDialog = ({ person, onOpenChange }: Props) => {
  const { user, saveProfile } = useAuth();
  const isMe = Boolean(user && person && person.nick === user.nick);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [dropImage, setDropImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!person) return;
    const src = isMe && user ? user : person;
    setFirstName(src.firstName ?? '');
    setLastName(src.lastName ?? '');
    setBirthDate(src.birthDate ?? '');
    setPreview(src.avatarUrl ?? null);
    setRawImage(null);
    setDropImage(false);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  }, [person, isMe, user]);

  if (!person) return null;

  const pickFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Файл тяжелее 8 МБ', description: 'Выбери фото поменьше', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      const img = new Image();
      img.onload = () => {
        setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        setRawImage(data);
        setPreview(data);
        setOffset({ x: 0, y: 0 });
        setZoom(1);
        setDropImage(false);
      };
      img.src = data;
    };
    reader.readAsDataURL(file);
  };

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rawImage) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const cropToSquare = async (): Promise<string | null> => {
    if (!rawImage || !natural.w) return null;
    const BOX = 160;
    const OUT = 400;
    const base = Math.max(BOX / natural.w, BOX / natural.h) * zoom;
    const drawW = natural.w * base;
    const drawH = natural.h * base;
    const left = (BOX - drawW) / 2 + offset.x;
    const top = (BOX - drawH) / 2 + offset.y;

    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return rawImage;
    const k = OUT / BOX;
    const img = new Image();
    await new Promise((res) => {
      img.onload = res;
      img.src = rawImage;
    });
    ctx.drawImage(img, left * k, top * k, drawW * k, drawH * k);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const save = async () => {
    if (busy || !user) return;
    setBusy(true);
    try {
      const imageData = rawImage ? await cropToSquare() : null;
      await saveProfile({
        status: user.status,
        color: user.color,
        avatar: (user.avatar ?? 1) as AvatarId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || '',
        ...(imageData ? { image: imageData } : {}),
        ...(dropImage ? { removeImage: true } : {}),
      });
      toast({ title: 'Анкета сохранена', description: 'Соседи уже видят изменения.' });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Не сохранилось',
        description: err instanceof Error ? err.message : 'Попробуй ещё раз',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const shown = isMe && user ? user : person;
  const fullName = [shown.firstName, shown.lastName].filter(Boolean).join(' ');
  const age = ageFrom(shown.birthDate);
  const fit = natural.w && natural.h ? Math.max(160 / natural.w, 160 / natural.h) * zoom : 1;
  const drawW = natural.w * fit;
  const drawH = natural.h * fit;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] border-2 border-foreground/40 bg-card p-0 text-card-foreground">
        <div className="flex flex-col items-center gap-3 border-b-2 border-foreground/35 px-5 py-5">
          <div className="relative shrink-0">
            <div
              onPointerDown={startDrag}
              onPointerMove={onDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={cn(
                'relative h-40 w-40 touch-none overflow-hidden rounded-full border-2 border-foreground/35 bg-muted',
                rawImage && 'cursor-grab active:cursor-grabbing',
              )}
            >
              {preview ? (
                rawImage ? (
                  <img
                    src={preview}
                    alt={shown.nick}
                    draggable={false}
                    style={{
                      position: 'absolute',
                      width: drawW,
                      height: drawH,
                      left: (160 - drawW) / 2 + offset.x,
                      top: (160 - drawH) / 2 + offset.y,
                      maxWidth: 'none',
                    }}
                    className="select-none"
                  />
                ) : (
                  <img src={preview} alt={shown.nick} className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Icon name="User" size={56} />
                </div>
              )}
            </div>
            {isMe && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Загрузить фото"
                aria-label="Загрузить фото"
                className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground/40 bg-background text-foreground transition-colors hover:border-secondary hover:text-secondary"
              >
                <Icon name="Camera" size={18} />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          {isMe && rawImage && (
            <div className="w-full max-w-[240px]">
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="zoom-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/25"
              />
            </div>
          )}

          <div className="min-w-0 text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Анкета жильца
            </p>
            <h3 className={cn('mt-0.5 truncate font-display text-xl font-extrabold', staffNickClass(shown.nick, nickColorClass[shown.color]))}>
              {shown.nick}
            </h3>
            {isMe && preview && (
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setRawImage(null);
                  setDropImage(true);
                }}
                className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
              >
                убрать фото
              </button>
            )}
          </div>
        </div>

        {isMe ? (
          <div className="space-y-3 px-5 pb-5 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Имя</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={40}
                  placeholder="Иван"
                  className="mt-1 w-full border-2 border-foreground/30 bg-background px-3 py-2 text-[0.95rem] outline-none focus:border-secondary"
                />
              </label>
              <label className="block">
                <span className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Фамилия</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={40}
                  placeholder="Петров"
                  className="mt-1 w-full border-2 border-foreground/30 bg-background px-3 py-2 text-[0.95rem] outline-none focus:border-secondary"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">Дата рождения</span>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full border-2 border-foreground/30 bg-background px-3 py-2 text-[0.95rem] outline-none focus:border-secondary"
              />
            </label>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="w-full border-2 border-foreground bg-secondary px-4 py-2.5 font-display text-[0.95rem] font-extrabold uppercase tracking-[0.06em] text-secondary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 px-5 pb-5 pt-4">
            <div className="flex items-baseline justify-between gap-3 border-b border-foreground/15 pb-2">
              <span className="text-[0.75rem] uppercase tracking-[0.14em] text-muted-foreground">Имя</span>
              <span className="text-right text-[0.95rem]">{fullName || '—'}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-foreground/15 pb-2">
              <span className="text-[0.75rem] uppercase tracking-[0.14em] text-muted-foreground">Дата рождения</span>
              <span className="text-right text-[0.95rem]">
                {humanDate(shown.birthDate) ?? '—'}
                {age !== null && <span className="ml-2 text-muted-foreground">· {age} {yearsWord(age)}</span>}
              </span>
            </div>
            {shown.status && (
              <div className="flex items-baseline justify-between gap-3 border-b border-foreground/15 pb-2">
                <span className="text-[0.75rem] uppercase tracking-[0.14em] text-muted-foreground">Статус</span>
                <span className="text-right text-[0.95rem]">{shown.status}</span>
              </div>
            )}
            {shown.since && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.75rem] uppercase tracking-[0.14em] text-muted-foreground">В общаге с</span>
                <span className="text-right text-[0.95rem]">{shown.since}</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserCardDialog;