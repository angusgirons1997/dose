import type { ComponentProps, ReactNode } from 'react';

export function Glass({ className = '', ...p }: ComponentProps<'div'>) {
  return <div className={`glass card ${className}`} {...p} />;
}

export function IconButton({ label, children, className = '', ...p }: ComponentProps<'button'> & { label: string; children: ReactNode }) {
  return (
    <button type="button" className={`glass icon-btn ${className}`} aria-label={label} title={label} {...p}>
      {children}
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="glass seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="spread" style={{ cursor: 'pointer' }}>
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={() => onChange(!checked)} />
    </label>
  );
}
