import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Glass';
import { Close } from './Icons';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="glass sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="handle" />
        <div className="spread" style={{ marginBottom: 18 }}>
          <h2>{title}</h2>
          <IconButton label="Close" onClick={onClose}><Close /></IconButton>
        </div>
        <div className="stack">{children}</div>
      </div>
    </>,
    document.getElementById('app') ?? document.body, // inside the app box so iOS positions it correctly
  );
}
