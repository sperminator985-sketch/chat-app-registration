import { api, CallSignal } from '@/lib/api';

type Handler = (s: CallSignal) => void | Promise<void>;

let callHandler: Handler | null = null;
let voiceHandler: Handler | null = null;
const seen = new Set<number>();

export const isVoiceSignal = (s: CallSignal) => s.callId.startsWith('vm-');

export const onCallSignal = (h: Handler) => {
  callHandler = h;
  return () => {
    if (callHandler === h) callHandler = null;
  };
};

export const onVoiceSignal = (h: Handler) => {
  voiceHandler = h;
  return () => {
    if (voiceHandler === h) voiceHandler = null;
  };
};

export const routeSignals = async (list: CallSignal[]) => {
  for (const s of list) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    if (seen.size > 500) seen.delete(seen.values().next().value as number);
    try {
      if (isVoiceSignal(s)) await voiceHandler?.(s);
      else await callHandler?.(s);
    } catch {
      /* тихо */
    }
  }
};

let fastUntil = 0;
let running = false;

export const pollFast = (ms: number) => {
  fastUntil = Math.max(fastUntil, Date.now() + ms);
  if (running) return;
  running = true;
  (async () => {
    while (Date.now() < fastUntil) {
      try {
        const res = await api.callPoll();
        await routeSignals(res.signals);
      } catch {
        /* тихо */
      }
      await new Promise((r) => setTimeout(r, 700));
    }
    running = false;
  })();
};

export const stopFastPoll = () => {
  fastUntil = 0;
};
