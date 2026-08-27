import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { api, CallSignal } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { startRinging } from '@/lib/notify-sound';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'active';

type CallState = {
  status: CallStatus;
  peerNick: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  startCall: (nick: string) => void;
  acceptCall: () => void;
  declineCall: () => void;
  hangUp: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
};

const CallContext = createContext<CallState | null>(null);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user, openAuth } = useAuth();
  const [status, setStatus] = useState<CallStatus>('idle');
  const [peerNick, setPeerNick] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

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
    if (nick && isCallerRef.current) {
      if (started) {
        const sec = Math.max(1, Math.round((Date.now() - started) / 1000));
        const mm = Math.floor(sec / 60);
        const ss = sec % 60;
        const dur = mm > 0 ? `${mm} мин ${ss} с` : `${ss} с`;
        logCall(nick, `Видеозвонок — ${dur}`);
      } else {
        logCall(nick, 'Видеозвонок без ответа');
      }
    }
    startedAtRef.current = null;
    isCallerRef.current = false;
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
    callIdRef.current = '';
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
  }, [logCall]);

  const send = useCallback(
    (nick: string, kind: 'offer' | 'answer' | 'ice' | 'hangup' | 'decline', payload?: unknown) =>
      api.callSignal({ nick, callId: callIdRef.current, kind, payload }).catch(() => undefined),
    [],
  );

  const getMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const buildPc = useCallback(
    (stream: MediaStream, nick: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const remote = new MediaStream();
      setRemoteStream(remote);
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((t) => remote.addTrack(t));
        setRemoteStream(new MediaStream(remote.getTracks()));
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) send(nick, 'ice', e.candidate.toJSON());
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          if (!startedAtRef.current) startedAtRef.current = Date.now();
          setStatus('active');
        }
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          toast({ title: 'Связь оборвалась', description: 'Провод в общаге опять барахлит' });
          cleanup();
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [send, cleanup],
  );

  const startCall = useCallback(
    async (nick: string) => {
      if (!user) {
        openAuth('register');
        return;
      }
      if (statusRef.current !== 'idle') return;
      loggedRef.current = false;
      isCallerRef.current = true;
      startedAtRef.current = null;
      callIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setPeerNick(nick);
      setStatus('calling');
      try {
        const stream = await getMedia();
        const pc = buildPc(stream, nick);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await send(nick, 'offer', offer);
      } catch {
        toast({
          title: 'Камера не открылась',
          description: 'Разреши доступ к камере и микрофону в браузере',
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
      const stream = await getMedia();
      const pc = buildPc(stream, nick);
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
        title: 'Камера не открылась',
        description: 'Разреши доступ к камере и микрофону в браузере',
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
        pendingOfferRef.current = s.payload as RTCSessionDescriptionInit;
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
        if (isCallerRef.current) logCall(s.from.nick, 'Видеозвонок отклонён');
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
    const timer = window.setInterval(poll, 2500);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [user, handleSignal]);

  useEffect(() => () => cleanup(), [cleanup]);

  const value = useMemo(
    () => ({
      status, peerNick, localStream, remoteStream, micOn, camOn,
      startCall, acceptCall, declineCall, hangUp, toggleMic, toggleCam,
    }),
    [status, peerNick, localStream, remoteStream, micOn, camOn, startCall, acceptCall, declineCall, hangUp, toggleMic, toggleCam],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall должен использоваться внутри CallProvider');
  return ctx;
};

export default CallProvider;