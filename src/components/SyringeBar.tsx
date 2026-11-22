import { round1 } from '../lib/calc';

/** Glass capsule with cream fill. Ticks every 10 units (every 5 for small capacities). */
export function SyringeBar({ units, capacityUnits }: { units: number; capacityUnits: number }) {
  const frac = units / capacityUnits;
  const every = capacityUnits <= 40 ? 5 : 10;
  const ticks = [];
  for (let u = every; u < capacityUnits - 1e-9; u += every) ticks.push(u);
  return (
    <div>
      <div
        className={`glass syringe ${frac > 1 ? 'over' : ''}`}
        role="meter"
        aria-label="Syringe fill"
        aria-valuemin={0}
        aria-valuemax={capacityUnits}
        aria-valuenow={round1(units)}
      >
        <div className="fill" style={{ width: `${Math.min(1, Math.max(0, frac)) * 100}%` }} />
        <div className="ticks">
          {ticks.map((u) => <i key={u} style={{ left: `${(u / capacityUnits) * 100}%` }} />)}
        </div>
      </div>
      <div className="syringe-scale">
        <span>0</span>
        <span>{round1(capacityUnits / 2)}</span>
        <span>{round1(capacityUnits)} u</span>
      </div>
    </div>
  );
}
