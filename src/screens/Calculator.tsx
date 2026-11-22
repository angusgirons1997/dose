import { useEffect, useState } from 'react';
import { capacityUnits, check, round1, round2, unitsPerMl, vialSplit, warnings } from '../lib/calc';
import { getSetting, setSetting, usePrefs, type SavedVial } from '../lib/db';
import { Glass } from '../components/Glass';
import { PillButton } from '../components/PillButton';
import { Stepper } from '../components/Stepper';
import { SyringeBar } from '../components/SyringeBar';
import { Check, Save } from '../components/Icons';

interface Draft {
  peptideName: string;
  vialMg: number;
  doseMg: number;
  waterMl: number;
}
const defaults: Draft = { peptideName: '', vialMg: 5, doseMg: 2, waterMl: 1 };

export function Calculator() {
  const { syringeType, capacityMl } = usePrefs();
  const [d, setD] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting<Partial<Draft>>('calc', {}).then((x) => setD({ ...defaults, ...x }));
  }, []);

  if (!d) return null;

  const update = (patch: Partial<Draft>) => {
    const next = { ...d, ...patch };
    setD(next);
    setSaved(false);
    // JSON can't hold NaN; persist only valid numbers
    setSetting('calc', Object.fromEntries(Object.entries(next).filter(([, v]) => typeof v !== 'number' || Number.isFinite(v))));
  };

  const r = check({ vialMg: d.vialMg, waterMl: d.waterMl, doseMg: d.doseMg, syringeType });
  const split = r && vialSplit(d.vialMg, d.doseMg, r.mgPerUnit);
  const warns = r ? warnings({ units: r.units, waterMl: r.waterMl, capacityMl, syringeType }) : [];
  const upm = unitsPerMl(syringeType);
  const mgPerUnit = r ? +r.mgPerUnit.toPrecision(3) : 0;

  const saveVial = async () => {
    if (!r) return;
    const v: SavedVial = {
      peptideName: d.peptideName.trim(),
      vialMg: d.vialMg,
      waterMl: d.waterMl,
      doseMg: d.doseMg,
      concentrationMgPerMl: r.concentration,
      syringeType,
    };
    await setSetting('savedVial', v);
    setSaved(true);
  };

  return (
    <>
      <h1 className="title">Calculator</h1>

      <Glass>
        <div aria-live="polite">
          {r ? (
            <>
              <div className="label">Draw</div>
              <div className="hero" key={round1(r.units)}>
                {round1(r.units)}
                <small>units</small>
              </div>
              <p className="small muted" style={{ margin: '10px 0 16px' }}>
                {d.vialMg} mg ÷ {d.waterMl} mL = {round2(r.concentration)} mg/mL · ÷ {upm} = {mgPerUnit} mg/unit · {d.doseMg} mg ÷ {mgPerUnit} ={' '}
                {round1(r.units)} u
              </p>
              <SyringeBar units={r.units} capacityUnits={capacityUnits(capacityMl, syringeType)} />
              <div className="stats three" style={{ marginTop: 18 }}>
                <div>
                  <span className="label">Strength</span>
                  <b>{round2(r.concentration)} mg/mL</b>
                </div>
                <div>
                  <span className="label">Full doses</span>
                  <b>{split!.fullDoses}</b>
                </div>
                <div>
                  <span className="label">Leftover</span>
                  <b>{split!.leftoverMg ? `${round2(split!.leftoverMg)} mg` : 'None'}</b>
                  {split!.leftoverMg > 0 && <span className="label">{round1(split!.leftoverUnits)} u</span>}
                </div>
              </div>
              {warns.map((w) => (
                <div key={w} className="warn" role="status" style={{ marginTop: 12 }}>{w}</div>
              ))}
            </>
          ) : (
            <div className="empty">Enter numbers above zero to see the result.</div>
          )}
        </div>

        <div className="divider" />

        <div className="stack">
          <Stepper label="Vial size" unit="mg" step={0.5} value={d.vialMg} onChange={(vialMg) => update({ vialMg })} />
          <Stepper label="Water added" unit="mL" step={0.1} value={d.waterMl} onChange={(waterMl) => update({ waterMl })} />
          <Stepper label="Dose" unit="mg" step={0.25} value={d.doseMg} onChange={(doseMg) => update({ doseMg })} />
          <input
            className="text-input"
            aria-label="Peptide name (optional)"
            value={d.peptideName}
            placeholder="Peptide name (optional)"
            onChange={(e) => update({ peptideName: e.target.value })}
          />
        </div>
      </Glass>

      <PillButton block disabled={!r} onClick={saveVial} data-sound="success">
        {saved ? <>Saved as my vial <Check /></> : <>Save as my vial <Save /></>}
      </PillButton>
    </>
  );
}
