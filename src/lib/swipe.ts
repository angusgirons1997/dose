import { useEffect, useRef, type RefObject } from 'react';

/**
 * Swipe left/right anywhere on the page track to change tab. While the finger is down it writes a
 * fractional `--pos` (e.g. 1.4 = 40% of the way from tab 1 to tab 2) onto `root`; the track, the
 * tab-bar lens and the background colour layers all read `--pos`, so they follow the finger. On
 * release it commits to the next tab (past 25% of the width, or a quick flick) or springs back.
 */
export function useSwipe(
  track: RefObject<HTMLElement | null>,
  root: RefObject<HTMLElement | null>,
  index: number,
  count: number,
  onChange: (i: number) => void,
) {
  const idx = useRef(index);
  const cb = useRef(onChange);
  useEffect(() => {
    idx.current = index;
    cb.current = onChange;
  });

  useEffect(() => {
    const el = track.current;
    const app = root.current;
    if (!el || !app) return;
    let x0 = 0, y0 = 0, t0 = 0, dx = 0;
    let mode: 'idle' | 'h' | 'v' | 'skip' = 'idle';

    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      // leave text fields and sideways-scrolling rows alone
      mode = e.touches.length !== 1 || (e.target as Element).closest('input, textarea, select, .chips') ? 'skip' : 'idle';
      x0 = t.clientX; y0 = t.clientY; t0 = performance.now(); dx = 0;
    };
    const move = (e: TouchEvent) => {
      if (mode === 'skip' || mode === 'v') return;
      const t = e.touches[0];
      const mx = t.clientX - x0, my = t.clientY - y0;
      if (mode === 'idle') {
        if (Math.hypot(mx, my) < 8) return;
        mode = Math.abs(mx) > Math.abs(my) ? 'h' : 'v'; // decide once; vertical stays a normal scroll
        if (mode === 'v') return;
        app.classList.add('dragging');
      }
      e.preventDefault();
      const i = idx.current;
      const atEdge = (i === 0 && mx > 0) || (i === count - 1 && mx < 0);
      dx = atEdge ? mx * 0.3 : mx; // rubber-band past the first/last tab
      app.style.setProperty('--pos', String(i - dx / el.clientWidth));
    };
    const end = () => {
      if (mode !== 'h') { mode = 'idle'; return; }
      mode = 'idle';
      app.classList.remove('dragging');
      const w = el.clientWidth, i = idx.current;
      const speed = dx / Math.max(1, performance.now() - t0); // px per ms
      let next = i;
      if (dx < -w * 0.25 || speed < -0.4) next = i + 1;
      else if (dx > w * 0.25 || speed > 0.4) next = i - 1;
      next = Math.max(0, Math.min(count - 1, next));
      app.style.setProperty('--pos', String(next));
      if (next !== i) cb.current(next);
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [track, root, count]);
}
