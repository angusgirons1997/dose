import type { ComponentProps } from 'react';

export function PillButton({ variant = 'primary', block, className = '', ...p }: ComponentProps<'button'> & { variant?: 'primary' | 'ghost' | 'danger'; block?: boolean }) {
  return <button type="button" className={`pill-btn ${variant === 'primary' ? '' : variant} ${block ? 'block' : ''} ${className}`} {...p} />;
}
