import type { ReactNode } from 'react';

const I = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const CalcIcon = () => (
  <I>
    <rect x="5" y="3" width="14" height="18" rx="3" />
    <path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" />
  </I>
);
export const SyringeIcon = () => (
  <I>
    <path d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 0 1 0-1.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6" />
  </I>
);
export const BodyIcon = () => (
  <I>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <path d="M8 9a6 6 0 0 1 8 0l-2 3h-4z" />
  </I>
);
export const GearIcon = () => (
  <I>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </I>
);
export const Plus = () => <I><path d="M12 5v14M5 12h14" /></I>;
export const Minus = () => <I><path d="M5 12h14" /></I>;
export const ChevronL = () => <I><path d="m15 18-6-6 6-6" /></I>;
export const ChevronR = () => <I><path d="m9 18 6-6-6-6" /></I>;
export const Check = () => <I><path d="M20 6 9 17l-5-5" /></I>;
export const Close = () => <I><path d="M18 6 6 18M6 6l12 12" /></I>;
export const Camera = () => (
  <I>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="3" />
  </I>
);
export const Image = () => (
  <I>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </I>
);
export const Download = () => <I><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></I>;
export const Upload = () => <I><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></I>;
export const Vial = () => <I><path d="M9 3h6M10 3v4l-4 9a3 3 0 0 0 2.7 4h6.6A3 3 0 0 0 18 16l-4-9V3M7.5 13h9" /></I>;
export const Save = () => (
  <I>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </I>
);
export const Compare = () => <I><path d="M12 3v18M5 7h4v10H5zM15 7h4v10h-4z" /></I>;
