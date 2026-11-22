// Tiny synthesized UI sounds (Web Audio, no files, no network).
let ctx: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (on: boolean) => { enabled = on; };

function ac(): AudioContext | null {
  if (!ctx) {
    // iOS 17+: 'ambient' respects the silent switch and doesn't duck music
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'ambient';
    try { ctx = new AudioContext(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, { type = 'sine' as OscillatorType, gain = 0.06, to = freq, delay = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sounds = {
  tap: () => tone(1400, 0.04, { type: 'triangle', gain: 0.045, to: 900 }),
  tab: () => tone(520, 0.12, { gain: 0.05, to: 780 }),
  success: () => {
    tone(880, 0.12, { gain: 0.05 });
    tone(1320, 0.18, { gain: 0.045, delay: 0.08 });
  },
} as const;

export type SoundName = keyof typeof sounds;

/** One delegated listener: any button plays its data-sound (default "tap"), "none" to skip. */
export function installClickSounds() {
  const onClick = (e: MouseEvent) => {
    if (!enabled) return;
    const el = (e.target as Element).closest<HTMLElement>('button, label.pill-btn, [role="switch"]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const name = (el.dataset.sound ?? 'tap') as SoundName | 'none';
    if (name !== 'none') sounds[name]?.();
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
