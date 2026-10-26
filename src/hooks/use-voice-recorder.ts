import { useCallback, useEffect, useRef, useState } from 'react';

export const VOICE_MAX_SEC = 300;

const pickMime = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  const list = [
    { mime: 'audio/webm;codecs=opus', ext: 'webm' },
    { mime: 'audio/webm', ext: 'webm' },
    { mime: 'audio/mp4', ext: 'm4a' },
    { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  ];
  return list.find((x) => MediaRecorder.isTypeSupported(x.mime)) ?? { mime: '', ext: 'webm' };
};

export const voiceSupported = () =>
  typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export const useVoiceRecorder = (onReady: (file: File) => void) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const cancelled = useRef(false);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  const cleanup = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
    setRecording(false);
    setSeconds(0);
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    stop();
  }, [stop]);

  const start = useCallback(async () => {
    if (recRef.current) return;
    const kind = pickMime();
    if (!kind || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Этот браузер не умеет записывать голос');
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      throw new Error('Нет доступа к микрофону — разрешите его в настройках браузера');
    }
    const rec = kind.mime ? new MediaRecorder(stream, { mimeType: kind.mime }) : new MediaRecorder(stream);
    streamRef.current = stream;
    recRef.current = rec;
    chunks.current = [];
    cancelled.current = false;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const sec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      const type = rec.mimeType || kind.mime || 'audio/webm';
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : kind.ext;
      const blob = new Blob(chunks.current, { type: type.split(';')[0] });
      chunks.current = [];
      const wasCancelled = cancelled.current;
      cleanup();
      if (wasCancelled || blob.size < 1000) return;
      readyRef.current(new File([blob], `voice-${sec}s-${Date.now()}.${ext}`, { type: blob.type }));
    };
    startedAt.current = Date.now();
    rec.start(250);
    setRecording(true);
    setSeconds(0);
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= VOICE_MAX_SEC) stop();
    }, 250);
  }, [cleanup, stop]);

  useEffect(
    () => () => {
      cancelled.current = true;
      const rec = recRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) window.clearInterval(timer.current);
    },
    [],
  );

  return { recording, seconds, start, stop, cancel };
};

export const voiceDuration = (name: string) => {
  const m = /^voice-(\d+)s-/.exec(name);
  return m ? Number(m[1]) : null;
};

export const formatVoiceTime = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};
