import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { api, PRIVATE_FILE_MAX, uploadPrivateFile } from '@/lib/api';
import { makeFastStart } from '@/lib/faststart';
import { isTouchInput } from '@/lib/touch';
import { nickColorClass, staffNickClass, isStaffNick } from '@/data/chat';
import { usePrivate } from '@/hooks/use-private';
import { useCrypto } from '@/hooks/use-crypto';
import EmojiPicker from '@/components/EmojiPicker';
import Avatar from '@/components/Avatar';
import UserCardDialog, { CardPerson } from '@/components/UserCardDialog';
import { useCall } from '@/hooks/use-call';
import PrivateFile from '@/components/PrivateFile';
import { playKnock } from '@/lib/notify-sound';
import { usePrivateHistory } from '@/hooks/use-private-history';
import { useVoiceRecorder, voiceSupported, formatVoiceTime } from '@/hooks/use-voice-recorder';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const FILE_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/*,.pdf,.txt,.zip,.rar,.doc,.docx,.xls,.xlsx,.ppt,.pptx';


const PrivateRoom = () => {
  const { user } = useAuth();
  const { active, peer, peerTyping, messages, leave, pushMessage } = usePrivate();
  const { enabled: cryptoOn, seal, reveal } = useCrypto();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastIncoming = useRef<number | null>(null);
  const typingSentAt = useRef(0);
  const [askClear, setAskClear] = useState(false);
  const [cardPerson, setCardPerson] = useState<CardPerson | null>(null);
  const { startCall, status: callStatus } = useCall();

  const openPeerCard = async () => {
    if (!peer) return;
    setCardPerson({ nick: peer.nick, color: peer.color, avatarUrl: peer.avatarUrl });
    try {
      const { residents } = await api.residents();
      const r = residents.find((x) => x.nick === peer.nick);
      if (r) setCardPerson((cur) => (cur && cur.nick === r.nick ? { ...cur, ...r } : cur));
    } catch {
      /* карточка остаётся с базовыми данными */
    }
  };
  const { items, saveOwn, clear, hasHistory } = usePrivateHistory({
    me: user?.nick,
    peer: peer?.nick,
    serverMessages: messages,
    reveal,
  });

  const stickBottom = useRef(true);
  const lastSeenId = useRef(0);

  const onFeedScroll = () => {
    const el = feedRef.current;
    if (el) stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const last = items.length ? items[items.length - 1] : null;
    const lastId = last?.id ?? 0;
    const fresh = lastId !== lastSeenId.current;
    const mine = fresh && last?.nick === user?.nick;
    lastSeenId.current = lastId;
    if (stickBottom.current || mine) {
      el.scrollTop = el.scrollHeight;
      stickBottom.current = true;
    }
  }, [items, user?.nick]);

  useEffect(() => {
    if (!active) {
      stickBottom.current = true;
      lastSeenId.current = 0;
    }
  }, [active]);

  useEffect(() => {
    if (!active) lastIncoming.current = null;
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const incoming = messages.filter((m) => m.nick !== user?.nick);
    const lastId = incoming.length ? incoming[incoming.length - 1].id : 0;
    if (lastIncoming.current !== null && lastId > lastIncoming.current) playKnock();
    lastIncoming.current = lastId;
  }, [messages, user?.nick, active]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !peer) return;
    setSending(true);
    try {
      const cipher = cryptoOn ? await seal(peer.nick, text) : null;
      const res = await api.privateSend(cipher ? { cipher } : { text });
      const shown = cipher ? { ...res.message, cipher, text: '' } : res.message;
      await saveOwn(shown, text);
      pushMessage(shown);
      setDraft('');
      typingSentAt.current = 0;
      if (isTouchInput()) inputRef.current?.blur();
      else inputRef.current?.focus();
    } catch (err) {
      toast({
        title: 'Сообщение не ушло',
        description: err instanceof Error ? err.message : 'Попробуй ещё раз',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const sendFile = async (file: File) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!peer || uploading) return;
    if (file.size > PRIVATE_FILE_MAX) {
      toast({
        title: 'Файл слишком большой',
        description: `Файлы можно пересылать размером до 100 МБ. Этот весит ${(file.size / 1024 / 1024).toFixed(0)} МБ`,
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const ready = await makeFastStart(file);
      const res = await uploadPrivateFile(ready, setProgress);
      await saveOwn(res.message, '', ready);
      pushMessage(res.message);
    } catch (err) {
      toast({
        title: 'Файл не ушёл',
        description: err instanceof Error ? err.message : 'Попробуй ещё раз',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const voice = useVoiceRecorder((f) => sendFile(f));
  const canVoice = voiceSupported();

  const startVoice = async () => {
    if (uploading || !user) return;
    try {
      await voice.start();
    } catch (err) {
      toast({
        title: 'Микрофон недоступен',
        description: err instanceof Error ? err.message : 'Попробуй ещё раз',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!active && voice.recording) voice.cancel();
  }, [active, voice]);

  useEffect(() => {
    if (!voice.recording) return;
    api.privateTyping('voice').catch(() => undefined);
    const t = window.setInterval(() => api.privateTyping('voice').catch(() => undefined), 4000);
    return () => {
      window.clearInterval(t);
      api.privateTyping('stop').catch(() => undefined);
    };
  }, [voice.recording]);

  if (!active || !peer) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-card">
      <div className="flex w-full min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background md:border-2 md:border-sky-400">
          <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-sky-400 bg-sky-400/10 px-4 py-3 md:px-5 md:py-4">
            <Logo size="sm" iconAsLetter className="hidden shrink-0 md:flex" />
            <div className="flex min-w-0 items-center gap-3 md:absolute md:left-1/2 md:top-1/2 md:max-w-[50%] md:-translate-x-1/2 md:-translate-y-1/2">
              <Icon name="Lock" size={16} className="shrink-0 text-sky-300 md:h-5 md:w-5" />
              <button
                type="button"
                onClick={openPeerCard}
                title={`Карточка: ${peer.nick}`}
                aria-label={`Карточка: ${peer.nick}`}
                className="shrink-0 transition-opacity hover:opacity-80"
              >
                <Avatar avatar={peer.avatar} avatarUrl={peer.avatarUrl} color={peer.color} size={30} />
              </button>
              <span className="truncate font-display text-[0.7rem] font-extrabold uppercase tracking-[-0.03em] sm:text-base md:text-lg">
                Приват ·{' '}
                <span className={cn(staffNickClass(peer.nick, nickColorClass[peer.color]))}>{peer.nick}</span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => startCall(peer.nick)}
                disabled={callStatus !== 'idle'}
                title={`Видеозвонок: ${peer.nick}`}
                aria-label={`Видеозвонок: ${peer.nick}`}
                className="flex items-center gap-1.5 border-2 border-foreground/35 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="Video" size={14} />
                <span className="hidden sm:inline">Звонок</span>
              </button>
              <button
                type="button"
                onClick={() => setAskClear(true)}
                disabled={!hasHistory && items.length === 0}
                title="Очистить переписку"
                className="flex items-center disabled:cursor-not-allowed disabled:opacity-40 gap-1.5 border-2 border-foreground/35 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Icon name="Trash2" size={14} />
                <span className="hidden sm:inline">Очистить</span>
              </button>
              <button
                type="button"
                onClick={leave}
                className="flex items-center gap-1.5 border-2 border-foreground/35 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Icon name="LogOut" size={14} />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>

          <div
            ref={feedRef}
            onScroll={onFeedScroll}
            onPointerDown={() => {
              if (isTouchInput() && document.activeElement === inputRef.current) inputRef.current?.blur();
            }}
            className="scrollbar-brut min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-5"
          >
            {hasHistory && (
              <p className="pb-2 text-center font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground/70">
                История хранится только на этом устройстве
              </p>
            )}
            {items.map((m) => (
              <div key={m.id} className="animate-fade-in leading-[1.3]">
                <p className="chat-font flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-mono text-[0.66rem] text-muted-foreground sm:text-[0.78rem]">[{m.time}]</span>
                  <span
                    className={cn(
                      'text-[0.82rem] font-normal sm:text-[0.92rem]',
                      isStaffNick(m.nick) ? 'font-bold text-red-500 [.day_&]:text-red-600' : nickColorClass[m.color],
                    )}
                  >
                    &lt;{m.nick}&gt;
                  </span>
                  {!m.file && (
                    <span className="text-[0.95rem] leading-[1.35] text-foreground sm:text-[0.94rem]">{m.text}</span>
                  )}
                </p>
                {m.file && (
                  <PrivateFile file={m.file} gone={m.fileGone} receiving={m.receiving} />
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={send}
            className="flex flex-row items-center gap-2 border-t-2 border-sky-400 px-3 py-2 sm:gap-2.5 sm:px-5 sm:py-2.5"
          >
            {voice.recording ? (
              <div className="flex h-9 flex-1 items-center gap-2.5 border-2 border-primary bg-input px-3">
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-primary" />
                <span className="font-mono text-[0.9rem] font-bold text-foreground">{formatVoiceTime(voice.seconds)}</span>
                <span className="truncate text-[0.8rem] text-muted-foreground">Идёт запись…</span>
              </div>
            ) : (
            <div className="flex h-9 flex-1 items-center gap-2 border-2 border-foreground/35 bg-input px-3 focus-within:border-sky-400">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const now = Date.now();
                  if (e.target.value && now - typingSentAt.current > 4000) {
                    typingSentAt.current = now;
                    api.privateTyping().catch(() => undefined);
                  }
                  if (!e.target.value && typingSentAt.current) {
                    typingSentAt.current = 0;
                    api.privateTyping('stop').catch(() => undefined);
                  }
                }}
                maxLength={480}
                placeholder={
                  peerTyping === 'voice'
                    ? `${peer.nick} записывает голосовое…`
                    : peerTyping
                      ? `${peer.nick} печатает…`
                      : `В привате с ${peer.nick}…`
                }
                className={cn(
                  'chat-font m-0 block h-full w-full min-w-0 self-stretch bg-transparent p-0 text-[0.95rem] leading-[normal] text-foreground outline-none sm:text-[0.94rem]',
                  peerTyping ? 'placeholder:text-sky-300' : 'placeholder:text-muted-foreground/70',
                )}
              />
              {peerTyping && draft && (
                <span
                  title={peerTyping === 'voice' ? `${peer.nick} записывает голосовое` : `${peer.nick} печатает`}
                  className="flex shrink-0 animate-pulse items-center gap-1 font-mono text-[0.66rem] text-sky-300"
                >
                  <Icon name={peerTyping === 'voice' ? 'Mic' : 'Pencil'} size={12} />
                  <span className="hidden sm:inline">{peerTyping === 'voice' ? 'записывает…' : 'печатает…'}</span>
                </span>
              )}
            </div>
            )}
            {voice.recording ? (
              <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={voice.cancel}
                  title="Отменить запись"
                  aria-label="Отменить запись"
                  className="flex h-9 w-9 items-center justify-center border-2 border-foreground/35 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon name="Trash2" size={16} />
                </button>
                <button
                  type="button"
                  onClick={voice.stop}
                  aria-label="Отправить голосовое"
                  className="btn-brut !h-9 !gap-1.5 !px-2.5 !py-0 !text-xs sm:!px-3"
                >
                  <Icon name="Send" size={14} />
                  <span className="hidden sm:inline">Отправить</span>
                </button>
              </div>
            ) : (
            <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
              <input
                ref={fileRef}
                type="file"
                accept={FILE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) sendFile(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !user}
                title={uploading ? `Загрузка: ${progress}%` : 'Отправить фото или файл (до 100 МБ)'}
                aria-label={uploading ? `Загрузка ${progress}%` : 'Прикрепить файл'}
                className={cn(
                  'relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border-2 transition-colors disabled:cursor-wait',
                  uploading
                    ? 'border-sky-400 text-foreground'
                    : 'border-foreground/35 text-muted-foreground active:border-secondary active:text-secondary disabled:opacity-60 [@media(hover:hover)]:hover:border-secondary [@media(hover:hover)]:hover:text-secondary',
                )}
              >
                {uploading ? (
                  <>
                    <span
                      className="absolute inset-x-0 bottom-0 bg-sky-400/35 transition-[height] duration-200"
                      style={{ height: `${progress}%` }}
                    />
                    <span className="relative font-mono text-[0.62rem] font-bold leading-none">{progress}%</span>
                  </>
                ) : (
                  <Icon name="Paperclip" size={18} />
                )}
              </button>
              <EmojiPicker onPick={(em) => setDraft((prev) => (prev + em).slice(0, 480))} />
              {canVoice && !draft.trim() ? (
                <button
                  type="button"
                  onClick={startVoice}
                  disabled={uploading || !user}
                  title="Записать голосовое (до 5 минут)"
                  aria-label="Записать голосовое"
                  className="btn-brut !h-9 !gap-1.5 !px-2.5 !py-0 !text-xs disabled:opacity-60 sm:!px-3"
                >
                  <Icon name="Mic" size={14} />
                  <span className="hidden sm:inline">Голосовое</span>
                </button>
              ) : (
              <button
                type="submit"
                disabled={sending || !user}
                aria-label="Отправить"
                className="btn-brut !h-9 !gap-1.5 !px-2.5 !py-0 !text-xs disabled:opacity-60 sm:!px-3"
              >
                <Icon name="Send" size={14} />
                <span className="hidden sm:inline">{sending ? 'Шлём…' : 'Отправить'}</span>
              </button>
              )}
            </div>
            )}
          </form>
        </div>
      </div>
      <AlertDialog open={askClear} onOpenChange={setAskClear}>
        <AlertDialogContent
          overlayClassName="z-[70]"
          className="z-[70] w-[calc(100vw-1.5rem)] max-w-[420px] rounded-none border-2 border-sky-400 bg-card sm:rounded-none"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-extrabold uppercase tracking-[-0.02em]">
              Очистить переписку?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Вся переписка с {peer.nick} будет стёрта с этого устройства. Восстановить её будет нельзя.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-2">
            <AlertDialogCancel className="btn-ghost-brut mt-0 rounded-none">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="btn-brut rounded-none"
              onClick={async () => {
                await clear();
                toast({ title: 'История очищена', description: 'Переписка удалена с этого устройства' });
              }}
            >
              <Icon name="Trash2" size={16} />
              Очистить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserCardDialog person={cardPerson} layered onOpenChange={(v) => !v && setCardPerson(null)} />
    </div>
  );
};

export default PrivateRoom;