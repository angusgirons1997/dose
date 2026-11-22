import { useId } from 'react';

// Same geometry as scripts/make-icons.mjs and public/favicon.svg: a clear glass "D" ring.
export const D_PATH =
  'M22 16H32A15 15 0 0 1 47 31V33A15 15 0 0 1 32 48H22A5 5 0 0 1 17 43V21A5 5 0 0 1 22 16Z' +
  'M24.5 23.5H32A7.5 7.5 0 0 1 39.5 31V33A7.5 7.5 0 0 1 32 40.5H24.5Z';

export function Logo({ size = 36 }: { size?: number }) {
  const id = 'lg' + useId().replace(/\W/g, ''); // plain id: safe inside url(#…)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}bg`} cx="0.85" cy="0.1" r="1.1">
          <stop offset="0" stopColor="#C98A3E" />
          <stop offset="0.65" stopColor="#8C4A32" />
          <stop offset="1" stopColor="#7E93A8" />
        </radialGradient>
        <linearGradient id={`${id}rim`} x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
        </linearGradient>
        <filter id={`${id}sh`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}bg)`} />
      <path d={D_PATH} fillRule="evenodd" fill="#28120a" fillOpacity="0.3" transform="translate(0.6 2.2)" filter={`url(#${id}sh)`} />
      <path d={D_PATH} fillRule="evenodd" fill="#fff" fillOpacity="0.16" stroke={`url(#${id}rim)`} strokeWidth="1.3" />
    </svg>
  );
}
