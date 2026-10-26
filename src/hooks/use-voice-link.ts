import { useCallback, useEffect, useRef } from 'react';
import { api, CallSignal } from '@/lib/api';
import { loadIce } from '@/lib/ice';
import { onVoiceSignal, pollFast } from '@/lib/signal-bus';

export type VoiceMeta = { name: string; size: number; mime: string; ts: number };

const CHUNK = 16 * 1024;
const SEND_TIMEOUT = 75_000;

const signal = (
  nick: string,
  callId: string,
  kind: 'offer' | 'answer' | 'ice' | 'decline' | 'hangup',
  payload?: unknown,
) => api.callSignal({ nick, callId, kind, payload });

const trickle = (pc: RTCPeerConnection, nick: string, callId: string) => {
  pc.onicecandidate = (e) => {
    if (e.candidate) signal(nick, callId, 'ice', e.candidate.toJSON()).catch(() => undefined);
  };
};

const addIce = (pc: RTCPeerConnection, queue: RTCIceCandidateInit[], c: RTCIceCandidateInit) => {
  if (pc.remoteDescription) pc.addIceCandidate(c).catch(() => undefined);
  else queue.push(c);
};

const flushIce = async (pc: RTCPeerConnection, queue: RTCIceCandidateInit[]) => {
  const list = queue.splice(0);
  for (const c of list) await pc.addIceCandidate(c).catch(() => undefined);
};

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
  const early = useRef(new Map<string, CallSignal[]>());
  const pcs = useRef(new Set<RTCPeerConnection>());

  const handle = useCallback(async (s: CallSignal) => {
    if (s.kind !== 'offer') {
      const w = waiters.current.get(s.callId);
      if (w) w(s);
      else if (s.kind === 'ice') {
        const list = early.current.get(s.callId) ?? [];
        list.push(s);
        early.current.set(s.callId, list);
        if (early.current.size > 20) early.current.delete(early.current.keys().next().value as string);
      }
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
    const queue: RTCIceCandidateInit[] = [];
    const close = () => {
      waiters.current.delete(s.callId);
      pcs.current.delete(pc);
      pc.close();
    };
    waiters.current.set(s.callId, (x) => {
      if (x.kind === 'ice') addIce(pc, queue, x.payload as RTCIceCandidateInit);
      if (x.kind === 'hangup') close();
    });
    (early.current.get(s.callId) ?? []).forEach((x) => addIce(pc, queue, x.payload as RTCIceCandidateInit));
    early.current.delete(s.callId);
    trickle(pc, from, s.callId);
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
    await flushIce(pc, queue);
    await pc.setLocalDescription(await pc.createAnswer());
    pollFast(30_000);
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

  const sendVoice = useCallback(async (
    nick: string,
    file: File,
    ts: number,
    onProgress?: (p: number) => void,
    onStage?: (stage: 'connecting' | 'sending') => void,
  ) => {
    onStage?.('connecting');
    const ice = await Promise.race([
      api.callIce(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]).catch(() => null);
    if (ice?.maintenance) throw new VoiceSendError('Технические работы на сервере связи — голосовые временно не отправляются');
    const callId = `vm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pc = new RTCPeerConnection({ iceServers: ice?.iceServers?.length ? ice.iceServers : await loadIce() });
    pcs.current.add(pc);
    const queue: RTCIceCandidateInit[] = [];
    trickle(pc, nick, callId);
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
          window.clearTimeout(answerTimer);
          window.clearTimeout(openTimer);
          waiters.current.delete(callId);
          if (err) reject(err);
          else resolve();
        };
        let answered = false;
        let opened = false;
        const timer = window.setTimeout(
          () =>
            finish(
              new VoiceSendError(
                !answered
                  ? 'Собеседник не ответил — возможно, у него пропала связь или открыта старая версия сайта'
                  : !opened
                    ? 'Не удалось связаться с устройством собеседника — проверьте сервер для звонков'
                    : 'Передача оборвалась, отправьте ещё раз',
              ),
            ),
          SEND_TIMEOUT,
        );

        const answerTimer = window.setTimeout(() => {
          if (!answered)
            finish(
              new VoiceSendError(
                'Собеседник не ответил — возможно, у него пропала связь или открыта старая версия сайта (пусть обновит страницу)',
              ),
            );
        }, 35_000);
        const openTimer = window.setTimeout(() => {
          if (!opened) finish(new VoiceSendError('Не удалось связаться с устройством собеседника — проверьте сервер для звонков'));
        }, 50_000);

        waiters.current.set(callId, (s) => {
          if (s.kind === 'decline') finish(new VoiceSendError(`${nick} уже не в привате с вами`));
          if (s.kind === 'ice') addIce(pc, queue, s.payload as RTCIceCandidateInit);
          if (s.kind === 'answer' && !answered) {
            answered = true;
            const d = s.payload as RTCSessionDescriptionInit;
            pc.setRemoteDescription({ type: d.type, sdp: d.sdp })
              .then(() => flushIce(pc, queue))
              .catch(() => finish(new VoiceSendError('Не удалось связаться с устройством собеседника')));
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
          opened = true;
          onStage?.('sending');
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
    } catch (e) {
      if (!(e instanceof VoiceSendError)) throw e;
      signal(nick, callId, 'hangup').catch(() => undefined);
      throw e;
    } finally {
      window.setTimeout(() => {
        pcs.current.delete(pc);
        pc.close();
      }, 1000);
    }
  }, []);

  return { sendVoice };
};
