import { useEffect, useId, useState } from 'react';
import { IconButton } from './Glass';
import { Minus, Plus } from './Icons';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  unit: string;
  chips?: number[];
  min?: number;
}

/** Big numeric field with −/+ and quick-pick chips. Empty/invalid text reports NaN so calc returns null. */
export function Stepper({ label, value, onChange, step, unit, chips, min = 0 }: Props) {
  const id = useId();
  const [text, setText] = useState(fmt(value));
  // follow external changes (steppers, chips) without clobbering half-typed input like "1."
  useEffect(() => {
    if (parse(text) !== value) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const bump = (dir: 1 | -1) => {
    const base = Number.isFinite(value) ? value : 0;
    const next = Math.max(min, Math.round((base + dir * step) / step) * step);
    onChange(Number(next.toFixed(4)));
  };

  return (
    <div className="field">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="stepper">
        <IconButton label={`Decrease ${label}`} onClick={() => bump(-1)}><Minus /></IconButton>
        <input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            const t = e.target.value.replace(',', '.');
            setText(t);
            onChange(parse(t));
          }}
          onFocus={(e) => e.target.select()}
        />
        <IconButton label={`Increase ${label}`} onClick={() => bump(1)}><Plus /></IconButton>
        <span className="unit">{unit}</span>
      </div>
      {chips && (
        <div className="chips">
          {chips.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={c === value} onClick={() => onChange(c)}>
              {c} {unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const parse = (t: string) => (t.trim() === '' ? NaN : Number(t));
const fmt = (v: number) => (Number.isFinite(v) ? String(v) : '');
