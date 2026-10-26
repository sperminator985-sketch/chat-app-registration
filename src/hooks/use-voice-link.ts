import { useCallback, useEffect, useRef } from 'react';
import { api, CallSignal } from '@/lib/api';
import { loadIce } from '@/lib/ice';
import { onVoiceSignal, pollFast } from '@/lib/signal-bus';

export type VoiceMeta = { name: string; size: number; mime: string; ts: number };

const CHUNK = 16 * 1024;
const SEND_TIMEOUT = 75_000;

const gather = (pc: RTCPeerConnection) =>
  new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const t = window.setTimeout(resolve, 4000);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        window.clearTimeout(t);
        resolve();
      }
    });
  });

const signal = (nick: string, callId: string, kind: 'offer' | 'answer' | 'decline' | 'hangup', payload?: unknown) =>
  api.callSignal({ nick, callId, kind, payload });

export class VoiceSendError extends Error {}

type Options = {
  peerNick?: string;
  onReceived: (from: string, blob: Blob, meta: VoiceMeta) => void | Promise<void>;
};

export const useVoiceLink = ({ peerNick, onReceived }: Options) => {
  const peerRef = useRef(peerNick);
  peerRef.current = peerNick;
  const receivedRef = useRef(onReceived);
  receivedRef.current = onReceived;
  const waiters = useRef(new Map<string, (s: CallSignal) => void>());
  const pcs = useRef(new Set<RTCPeerConnection>());

  const handle = useCallback(async (s: CallSignal) => {
    if (s.kind !== 'offer') {
      waiters.current.get(s.callId)?.(s);
      return;
    }
    const from = s.from.nick;
    const peer = peerRef.current;
    if (!peer || peer.toLowerCase() !== from.toLowerCase()) {
      signal(from, s.callId, 'decline').catch(() => undefined);
      return;
    }
    const payload = s.payload as RTCSessionDescriptionInit & { meta: VoiceMeta };
    const meta = payload.meta;
    const pc = new RTCPeerConnection({ iceServers: await loadIce() });
    pcs.current.add(pc);
    const close = () => {
      pcs.current.delete(pc);
      pc.close();
    };
    const timer = window.setTimeout(close, SEND_TIMEOUT);
    pc.ondatachannel = (e) => {
      const ch = e.channel;
      ch.binaryType = 'arraybuffer';
      const parts: ArrayBuffer[] = [];
      let got = 0;
      ch.onmessage = async (ev) => {
        if (typeof ev.data !== 'string') {
          parts.push(ev.data as ArrayBuffer);
          got += (ev.data as ArrayBuffer).byteLength;
          return;
        }
        if (ev.data !== 'done') return;
        if (got !== meta.size) {
          ch.send('bad');
          return;
        }
        const blob = new Blob(parts, { type: meta.mime });
        try {
          await receivedRef.current(from, blob, meta);
          ch.send('ok');
        } catch {
          ch.send('bad');
        }
        window.setTimeout(() => {
          window.clearTimeout(timer);
          close();
        }, 1500);
      };
    };
    await pc.setRemoteDescription({ type: payload.type, sdp: payload.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await gather(pc);
    pollFast(20_000);
    await signal(from, s.callId, 'answer', { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp });
  }, []);

  useEffect(() => onVoiceSignal(handle), [handle]);

  useEffect(
    () => () => {
      pcs.current.forEach((pc) => pc.close());
      pcs.current.clear();
    },
    [],
  );

  const sendVoice = useCallback(async (nick: string, file: File, ts: number, onProgress?: (p: number) => void) => {
    const ice = await Promise.race([
      api.callIce(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]).catch(() => null);
    if (ice?.maintenance) throw new VoiceSendError('Технические работы на сервере связи — голосовые временно не отправляются');
    const callId = `vm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pc = new RTCPeerConnection({ iceServers: ice?.iceServers?.length ? ice.iceServers : await loadIce() });
    pcs.current.add(pc);
    const ch = pc.createDataChannel('voice', { ordered: true });
    ch.binaryType = 'arraybuffer';
    const meta: VoiceMeta = { name: file.name, size: file.size, mime: file.type || 'audio/webm', ts };

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (err?: Error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          waiters.current.delete(callId);
          if (err) reject(err);
          else resolve();
        };
        const timer = window.setTimeout(
          () => finish(new VoiceSendError('Собеседник не ответил — возможно, у него пропала связь')),
          SEND_TIMEOUT,
        );

        waiters.current.set(callId, (s) => {
          if (s.kind === 'decline') finish(new VoiceSendError(`${nick} уже не в привате с вами`));
          if (s.kind === 'answer') {
            const d = s.payload as RTCSessionDescriptionInit;
            pc.setRemoteDescription({ type: d.type, sdp: d.sdp }).catch(() =>
              finish(new VoiceSendError('Не удалось связаться с устройством собеседника')),
            );
          }
        });

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed')
            finish(new VoiceSendError('Не удалось связаться с устройством собеседника'));
        };

        ch.onmessage = (ev) => {
          if (ev.data === 'ok') finish();
          if (ev.data === 'bad') finish(new VoiceSendError('Голосовое дошло с ошибкой, отправьте ещё раз'));
        };

        ch.onopen = async () => {
          const buf = await file.arrayBuffer();
          ch.bufferedAmountLowThreshold = CHUNK * 8;
          for (let off = 0; off < buf.byteLength; off += CHUNK) {
            if (settled) return;
            if (ch.bufferedAmount > CHUNK * 32) {
              await new Promise<void>((r) => {
                ch.onbufferedamountlow = () => r();
              });
            }
            ch.send(buf.slice(off, off + CHUNK));
            onProgress?.(Math.min(99, Math.round(((off + CHUNK) / buf.byteLength) * 100)));
          }
          ch.send('done');
        };

        (async () => {
          await pc.setLocalDescription(await pc.createOffer());
          await gather(pc);
          if (settled) return;
          await signal(nick, callId, 'offer', {
            type: pc.localDescription!.type,
            sdp: pc.localDescription!.sdp,
            meta,
          });
          pollFast(SEND_TIMEOUT);
        })().catch((e) =>
          finish(e instanceof VoiceSendError ? e : new VoiceSendError('Не получилось начать отправку голосового')),
        );
      });
      onProgress?.(100);
    } finally {
      window.setTimeout(() => {
        pcs.current.delete(pc);
        pc.close();
      }, 1000);
    }
  }, []);

  return { sendVoice };
};
