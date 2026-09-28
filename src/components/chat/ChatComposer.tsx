import type { RefObject } from 'react';
import Icon from '@/components/ui/icon';
import EmojiPicker from '@/components/EmojiPicker';
import type { Account } from '@/hooks/use-auth';

type ChatComposerProps = {
  privateTo: string | null;
  onCancelPrivate: () => void;
  othersTyping: { nick: string; color: number }[];
  onSubmit: (e: React.FormEvent) => void;
  inputRef: RefObject<HTMLInputElement>;
  draft: string;
  onDraftChange: (value: string) => void;
  onEmoji: (emoji: string) => void;
  user: Account | null;
  sending: boolean;
};

const ChatComposer = ({
  privateTo,
  onCancelPrivate,
  othersTyping,
  onSubmit,
  inputRef,
  draft,
  onDraftChange,
  onEmoji,
  user,
  sending,
}: ChatComposerProps) => (
  <>
    {privateTo && (
      <div className="flex items-center gap-2 border-t-2 border-sky-400 bg-sky-400/15 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-sky-200 sm:px-5 sm:text-[0.78rem]">
        <Icon name="Lock" size={13} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          <span className="hidden sm:inline">Личное сообщение для </span>
          <span className="sm:hidden">Лично: </span>
          {privateTo}
        </span>
        <button
          type="button"
          onClick={onCancelPrivate}
          className="btn-cancel-brut ml-auto shrink-0 px-2 py-0.5 text-[0.66rem]"
        >
          Отмена
        </button>
      </div>
    )}

    {othersTyping.length > 0 && (
      <div className="border-t-2 border-foreground/20 px-4 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.06em] text-secondary sm:px-5 sm:text-[0.72rem]">
        <span className="animate-pulse">
          {othersTyping.map((t) => t.nick).join(', ')}{' '}
          {othersTyping.length > 1 ? 'печатают…' : 'печатает…'}
        </span>
      </div>
    )}

    <form onSubmit={onSubmit} className="flex flex-row items-center gap-2 border-t-2 border-foreground/35 px-3 py-2 sm:gap-2.5 sm:px-5 sm:py-2.5">
      <div className="flex flex-1 items-center gap-2 border-2 border-foreground/35 bg-input px-3 py-1.5 focus-within:border-secondary">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          maxLength={480}
          placeholder={
            !user
              ? 'Займи ник, чтобы писать'
              : privateTo
                ? `Лично для ${privateTo}…`
                : 'Напиши что-нибудь…'
          }
          className="chat-font w-full min-w-0 bg-transparent text-[0.95rem] text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-[0.94rem]"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <EmojiPicker onPick={onEmoji} />
        <button
          type="submit"
          disabled={sending}
          aria-label="Отправить"
          className="btn-brut !gap-1.5 !px-2.5 !py-2 !text-xs disabled:opacity-60 sm:!px-3"
        >
          <Icon name="Send" size={14} />
          <span className="hidden sm:inline">{sending ? 'Шлём…' : 'Отправить'}</span>
        </button>
      </div>
    </form>
  </>
);

export default ChatComposer;
