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

// Haptics: iOS 18+ Safari gives a system haptic tick when a native <input switch> toggles, and a
// label click toggles it. Elsewhere this is a harmless no-op. shortcut: relies on that WebKit behaviour.
let hapticsOn = true;
let hapticLabel: HTMLLabelElement | null = null;
export const setHapticsEnabled = (on: boolean) => { hapticsOn = on; };
function haptic() {
  if (!hapticLabel) {
    const input = Object.assign(document.createElement('input'), { type: 'checkbox', id: 'dose-haptic', tabIndex: -1 });
    input.setAttribute('switch', '');
    input.setAttribute('aria-hidden', 'true');
    hapticLabel = Object.assign(document.createElement('label'), { htmlFor: 'dose-haptic' });
    hapticLabel.setAttribute('aria-hidden', 'true');
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    box.append(input, hapticLabel);
    document.body.append(box);
  }
  hapticLabel.click();
}

/** One delegated listener: any button gives a haptic tick and plays its data-sound (default "tap"; "none" skips). */
export function installClickSounds() {
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element).closest<HTMLElement>('button, label.pill-btn, [role="switch"]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    if (hapticsOn) haptic();
    if (!enabled) return;
    const name = (el.dataset.sound ?? 'tap') as SoundName | 'none';
    if (name !== 'none') sounds[name]?.();
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
