import { useId } from 'react';

/** Dose mark — same geometry as scripts/make-icons.mjs and public/favicon.svg. */
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
        <linearGradient id={`${id}rim`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={`${id}drop`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FBF3C4" />
          <stop offset="1" stopColor="#ECD696" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}bg)`} />
      <circle cx="32" cy="33" r="20.4" fill="#fff" fillOpacity="0.2" stroke={`url(#${id}rim)`} strokeWidth="1.2" />
      <path d="M32 18 L40.66 33 A10 10 0 1 1 23.34 33 Z" fill={`url(#${id}drop)`} />
      <ellipse cx="28.6" cy="35" rx="1.6" ry="3.2" fill="#fff" fillOpacity="0.75" />
    </svg>
  );
}
