let ctx: AudioContext | null = null;

const getCtx = () => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
};

const ring = (audio: AudioContext, start: number) => {
  [0, 0.42].forEach((offset) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, start + offset);
    osc.frequency.setValueAtTime(660, start + offset + 0.16);
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.16, start + offset + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.34);
    osc.connect(gain).connect(audio.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 0.36);
  });
};

export const startRinging = () => {
  const audio = getCtx();
  if (!audio) return () => undefined;
  if (audio.state === 'suspended') audio.resume().catch(() => undefined);

  ring(audio, audio.currentTime);
  const timer = window.setInterval(() => ring(audio, audio.currentTime), 2000);
  return () => window.clearInterval(timer);
};

export const playKnock = () => {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume().catch(() => undefined);

  const now = audio.currentTime;
  [0, 0.13].forEach((offset, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(i === 0 ? 660 : 880, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.09, now + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.11);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.13);
  });
};