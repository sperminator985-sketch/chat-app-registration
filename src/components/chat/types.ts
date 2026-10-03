import { ApiMessage } from '@/lib/api';
import { rooms } from '@/data/chat';
import { useAuth } from '@/hooks/use-auth';

export type OnlineItem = {
  nick: string;
  color: number;
  status: string;
  avatar?: number;
  avatarUrl?: string | null;
  seenAgo?: number | null;
  inPrivate?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  gender?: 'm' | 'f' | null;
  since?: string | null;
};

export type VisibleMessage = ApiMessage & {
  key: string;
  private: boolean;
  peer: string;
  outgoing: boolean;
};

export type ChatRoom = (typeof rooms)[number];

export type ChatUser = NonNullable<ReturnType<typeof useAuth>['user']>;
