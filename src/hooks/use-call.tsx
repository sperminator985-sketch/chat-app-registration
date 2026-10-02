import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { api, CallSignal } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { startRinging } from '@/lib/notify-sound';
import { isPageVisible } from '@/hooks/use-polling';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'active';
export type CallMode = 'video' | 'audio';
export type CallLink = 'connecting' | 'connected' | 'stuck';

type CallState = {
  status: CallStatus;
  peerNick: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  mode: CallMode;
  link: CallLink;
  startCall: (nick: string, mode?: CallMode) => void;
  acceptCall: () => void;
  declineCall: () => void;
  hangUp: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
};

const CallContext = createContext<CallState | null>(null);

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let iceCache: { at: number; servers: RTCIceServer[] } | null = null;

const loadIce = async (): Promise<RTCIceServer[]> => {
  if (iceCache && Date.now() - iceCache.at < 30 * 60 * 1000) return iceCache.servers;
  try {
    const res = await Promise.race([
      api.callIce(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
    if (res.iceServers?.length) {
      iceCache = { at: Date.now(), servers: res.iceServers };
      return res.iceServers;
    }
  } catch {
    /* старый сервер без TURN — звоним напрямую */
  }
  return FALLBACK_ICE;
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user, openAuth } = useAuth();
  const [status, setStatus] = useState<CallStatus>('idle');
  const [peerNick, setPeerNick] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mode, setMode] = useState<CallMode>('video');
  const modeRef = useRef<CallMode>('video');
  const [link, setLink] = useState<CallLink>('connecting');
  const dropTimerRef = useRef<number | null>(null);
  const stuckTimerRef = useRef<number | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string>('');
  const peerRef = useRef<string | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const statusRef = useRef<CallStatus>('idle');
  const startedAtRef = useRef<number | null>(null);
  const loggedRef = useRef(false);
  const isCallerRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status !== 'incoming' && status !== 'calling') return;
    const stop = startRinging();
    return () => stop();
  }, [status]);

  useEffect(() => {
    const base = document.title.replace(/^Звонит .*? · /, '');
    if (status === 'incoming' && peerNick) document.title = `Звонит ${peerNick} · ${base}`;
    return () => {
      document.title = document.title.replace(/^Звонит .*? · /, '');
    };
  }, [status, peerNick]);

  useEffect(() => {
    peerRef.current = peerNick;
  }, [peerNick]);

  const logCall = useCallback((nick: string, text: string) => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    api.dmSend({ nick, text }).catch(() => undefined);
  }, []);

  const cleanup = useCallback(() => {
    const nick = peerRef.current;
    const started = startedAtRef.current;
    const label = modeRef.current === 'audio' ? 'Аудиозвонок' : 'Видеозвонок';
    if (nick && isCallerRef.current) {
      if (started) {
        const sec = Math.max(1, Math.round((Date.now() - started) / 1000));
        const mm = Math.floor(sec / 60);
        const ss = sec % 60;
        const dur = mm > 0 ? `${mm} мин ${ss} с` : `${ss} с`;
        logCall(nick, `${label} — ${dur}`);
      } else {
        logCall(nick, `${label} без ответа`);
      }
    }
    startedAtRef.current = null;
    isCallerRef.current = false;
    if (dropTimerRef.current) window.clearTimeout(dropTimerRef.current);
    if (stuckTimerRef.current) window.clearTimeout(stuckTimerRef.current);
    dropTimerRef.current = null;
    stuckTimerRef.current = null;
    setLink('connecting');
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setPeerNick(null);
    setStatus('idle');
    setMicOn(true);
    setCamOn(true);
    modeRef.current = 'video';
    setMode('video');
    callIdRef.current = '';
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
  }, [logCall]);

  const send = useCallback(
    (nick: string, kind: 'offer' | 'answer' | 'ice' | 'hangup' | 'decline', payload?: unknown) =>
      api.callSignal({ nick, callId: callIdRef.current, kind, payload }).catch(() => undefined),
    [],
  );

  const getMedia = useCallback(async (kind: CallMode) => {
    const stream = await navigator.mediaDevices.getUserMedia(
      kind === 'audio' ? { video: false, audio: true } : { video: true, audio: true },
    );
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const buildPc = useCallback(
    (stream: MediaStream, nick: string, iceServers: RTCIceServer[]) => {
      const pc = new RTCPeerConnection({ iceServers });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const remote = new MediaStream();
      setRemoteStream(remote);
      pc.ontrack = (e) => {
        const tracks = e.streams[0] ? e.streams[0].getTracks() : [e.track];
        tracks.forEach((t) => {
          if (!remote.getTracks().includes(t)) remote.addTrack(t);
        });
        setRemoteStream(new MediaStream(remote.getTracks()));
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) send(nick, 'ice', e.candidate.toJSON());
      };
      if (stuckTimerRef.current) window.clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = window.setTimeout(() => {
        if (pcRef.current === pc && pc.connectionState !== 'connected') setLink('stuck');
      }, 25000);
      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;
        const st = pc.connectionState;
        if (st === 'connected') {
          if (dropTimerRef.current) window.clearTimeout(dropTimerRef.current);
          dropTimerRef.current = null;
          if (!startedAtRef.current) startedAtRef.current = Date.now();
          setLink('connected');
          setStatus('active');
        }
        if (st === 'disconnected' && !dropTimerRef.current) {
          setLink('connecting');
          dropTimerRef.current = window.setTimeout(() => {
            if (pcRef.current === pc && pc.connectionState !== 'connected') {
              toast({ title: 'Связь оборвалась', description: 'Провод в общаге опять барахлит' });
              cleanup();
            }
          }, 10000);
        }
        if (st === 'failed') {
          toast({
            title: 'Не удалось соединиться',
            description: 'Сети не пропускают видео напрямую — попробуйте с Wi‑Fi или позже',
            variant: 'destructive',
          });
          cleanup();
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [send, cleanup],
  );

  const startCall = useCallback(
    async (nick: string, kind: CallMode = 'video') => {
      if (!user) {
        openAuth('register');
        return;
      }
      if (statusRef.current !== 'idle') return;
      loggedRef.current = false;
      isCallerRef.current = true;
      startedAtRef.current = null;
      callIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      modeRef.current = kind;
      setMode(kind);
      setCamOn(kind === 'video');
      setPeerNick(nick);
      setStatus('calling');
      try {
        const [stream, ice] = await Promise.all([getMedia(kind), loadIce()]);
        const pc = buildPc(stream, nick, ice);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await send(nick, 'offer', { ...offer, callMode: kind });
      } catch {
        toast({
          title: kind === 'audio' ? 'Микрофон не открылся' : 'Камера не открылась',
          description:
            kind === 'audio'
              ? 'Разреши доступ к микрофону в браузере'
              : 'Разреши доступ к камере и микрофону в браузере',
          variant: 'destructive',
        });
        cleanup();
      }
    },
    [user, openAuth, getMedia, buildPc, send, cleanup],
  );

  const acceptCall = useCallback(async () => {
    const nick = peerRef.current;
    const offer = pendingOfferRef.current;
    if (!nick || !offer) return;
    try {
      const [stream, ice] = await Promise.all([getMedia(modeRef.current), loadIce()]);
      const pc = buildPc(stream, nick, ice);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      for (const c of pendingIceRef.current) await pc.addIceCandidate(new RTCIceCandidate(c));
      pendingIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await send(nick, 'answer', answer);
      startedAtRef.current = Date.now();
      setStatus('active');
    } catch {
      toast({
        title: modeRef.current === 'audio' ? 'Микрофон не открылся' : 'Камера не открылась',
        description:
          modeRef.current === 'audio'
            ? 'Разреши доступ к микрофону в браузере'
            : 'Разреши доступ к камере и микрофону в браузере',
        variant: 'destructive',
      });
      cleanup();
    }
  }, [getMedia, buildPc, send, cleanup]);

  const declineCall = useCallback(() => {
    const nick = peerRef.current;
    if (nick) send(nick, 'decline');
    cleanup();
  }, [send, cleanup]);

  const hangUp = useCallback(() => {
    const nick = peerRef.current;
    if (nick) send(nick, 'hangup');
    cleanup();
  }, [send, cleanup]);

  const toggleMic = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  const toggleCam = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }, []);

  const handleSignal = useCallback(
    async (s: CallSignal) => {
      const pc = pcRef.current;
      if (s.kind === 'offer') {
        if (statusRef.current !== 'idle') {
          callIdRef.current = s.callId;
          await api.callSignal({ nick: s.from.nick, callId: s.callId, kind: 'decline' }).catch(() => undefined);
          return;
        }
        callIdRef.current = s.callId;
        loggedRef.current = false;
        isCallerRef.current = false;
        startedAtRef.current = null;
        const payload = s.payload as RTCSessionDescriptionInit & { callMode?: CallMode };
        pendingOfferRef.current = payload;
        modeRef.current = payload?.callMode === 'audio' ? 'audio' : 'video';
        setMode(modeRef.current);
        setCamOn(modeRef.current === 'video');
        setPeerNick(s.from.nick);
        setStatus('incoming');
        return;
      }
      if (s.callId !== callIdRef.current) return;
      if (s.kind === 'answer' && pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(s.payload as RTCSessionDescriptionInit));
        for (const c of pendingIceRef.current) await pc.addIceCandidate(new RTCIceCandidate(c));
        pendingIceRef.current = [];
        startedAtRef.current = Date.now();
        setStatus('active');
        return;
      }
      if (s.kind === 'ice') {
        const cand = s.payload as RTCIceCandidateInit;
        if (pc && pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => undefined);
        else pendingIceRef.current.push(cand);
        return;
      }
      if (s.kind === 'decline') {
        toast({ title: 'Не берут трубку', description: `${s.from.nick} сейчас не может говорить` });
        if (isCallerRef.current)
          logCall(s.from.nick, `${modeRef.current === 'audio' ? 'Аудиозвонок' : 'Видеозвонок'} отклонён`);
        cleanup();
        return;
      }
      if (s.kind === 'hangup') {
        toast({ title: 'Звонок завершён', description: `${s.from.nick} положил трубку` });
        cleanup();
      }
    },
    [cleanup, logCall],
  );

  useEffect(() => {
    if (!user) return;
    let stop = false;
    const poll = async () => {
      try {
        const res = await api.callPoll();
        if (stop) return;
        for (const s of res.signals) await handleSignal(s);
      } catch {
        /* тихо */
      }
    };
    poll();
    let timer = window.setInterval(poll, 5000);
    const onVisibility = () => {
      window.clearInterval(timer);
      timer = window.setInterval(poll, isPageVisible() ? 5000 : 20000);
      if (isPageVisible()) poll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, handleSignal]);

  useEffect(() => () => cleanup(), [cleanup]);

  const value = useMemo(
    () => ({
      status, peerNick, localStream, remoteStream, micOn, camOn, mode, link,
      startCall, acceptCall, declineCall, hangUp, toggleMic, toggleCam,
    }),
    [status, peerNick, localStream, remoteStream, micOn, camOn, mode, link, startCall, acceptCall, declineCall, hangUp, toggleMic, toggleCam],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall должен использоваться внутри CallProvider');
  return ctx;
};

export default CallProvider;