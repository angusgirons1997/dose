import { useEffect, useState } from 'react';
import { capacityUnits, check, plan, round1, round2, steps, unitsPerMl, vialSplit, vialsPerBottle, warnings, type CapacityMl, type SyringeType } from '../lib/calc';
import { getSetting, setSetting, usePrefs, type Prefs, type SavedVial } from '../lib/db';
import { Glass, Segmented } from '../components/Glass';
import { PillButton } from '../components/PillButton';
import { Stepper } from '../components/Stepper';
import { SyringeBar } from '../components/SyringeBar';
import { Check, Save } from '../components/Icons';

type Mode = 'plan' | 'check';
interface Draft {
  mode: Mode;
  peptideName: string;
  vialMg: number;
  doseMg: number;
  targetUnits: number;
  waterMl: number;
}
const defaults: Draft = { mode: 'plan', peptideName: '', vialMg: 5, doseMg: 2, targetUnits: 40, waterMl: 1 };

export function Calculator() {
  const prefs = usePrefs();
  const { syringeType, capacityMl, bottleMl } = prefs;
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
  const setPref = (patch: Partial<Prefs>) => setSetting('prefs', { ...prefs, ...patch });

  const r =
    d.mode === 'plan'
      ? plan({ vialMg: d.vialMg, doseMg: d.doseMg, targetUnits: d.targetUnits, syringeType })
      : check({ vialMg: d.vialMg, waterMl: d.waterMl, doseMg: d.doseMg, syringeType });

  const cap = capacityUnits(capacityMl, syringeType);
  const split = r && vialSplit(d.vialMg, d.doseMg, r.mgPerUnit);
  const warns = r ? warnings({ units: r.units, waterMl: r.waterMl, capacityMl, syringeType, bottleMl }) : [];
  const upm = unitsPerMl(syringeType);

  const saveVial = async () => {
    if (!r) return;
    const v: SavedVial = {
      peptideName: d.peptideName.trim(),
      vialMg: d.vialMg,
      waterMl: r.waterMl,
      doseMg: d.doseMg,
      concentrationMgPerMl: r.concentration,
      syringeType,
    };
    await setSetting('savedVial', v);
    setSaved(true);
  };

  return (
    <>
      <h1 className="title">Reconstitute</h1>
      <p className="subtitle">{d.mode === 'plan' ? 'How much water should I add?' : 'How many units do I draw?'}</p>

      <Segmented<Mode>
        label="Mode"
        value={d.mode}
        onChange={(mode) => update({ mode })}
        options={[
          { value: 'plan', label: 'Plan' },
          { value: 'check', label: 'Check' },
        ]}
      />

      {/* Result first: one hero thing per screen */}
      <Glass aria-live="polite">
        {r ? (
          <>
            <div className="label">{d.mode === 'plan' ? 'Add BAC water' : 'Draw'}</div>
            <div className="hero" key={d.mode + (d.mode === 'plan' ? round2(r.waterMl) : round1(r.units))}>
              {d.mode === 'plan' ? round2(r.waterMl).toFixed(2) : round1(r.units)}
              <small>{d.mode === 'plan' ? 'mL' : 'units'}</small>
            </div>
            <p className="small muted" style={{ margin: '10px 0 16px' }}>
              {d.mode === 'plan' ? (
                <>
                  {d.doseMg} mg ÷ ({d.targetUnits} u ÷ {upm}) = {round2(r.concentration)} mg/mL · {d.vialMg} mg ÷ {round2(r.concentration)} mg/mL ={' '}
                  {round2(r.waterMl)} mL
                </>
              ) : (
                <>
                  {d.vialMg} mg ÷ {d.waterMl} mL = {round2(r.concentration)} mg/mL · ÷ {upm} = {+r.mgPerUnit.toPrecision(3)} mg/unit · {d.doseMg} mg ÷{' '}
                  {+r.mgPerUnit.toPrecision(3)} = {round1(r.units)} u
                </>
              )}
            </p>

            <SyringeBar units={r.units} capacityUnits={cap} />

            <div className="divider" />
            <div className="stats">
              <div>
                <span className="label">Dose</span>
                <b>{round1(r.units)} u = {round2(d.doseMg)} mg</b>
              </div>
              <div>
                <span className="label">Concentration</span>
                <b>{round2(r.concentration)} mg/mL</b>
              </div>
              <div>
                <span className="label">Doses per vial</span>
                <b>{split!.fullDoses} full</b>
              </div>
              <div>
                <span className="label">Leftover</span>
                <b>{split!.leftoverMg ? `${round2(split!.leftoverMg)} mg (${round1(split!.leftoverUnits)} u)` : 'None'}</b>
              </div>
              {bottleMl > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span className="label">Bottle ({bottleMl} mL)</span>
                  <b>Enough for {vialsPerBottle(bottleMl, r.waterMl)} vial{vialsPerBottle(bottleMl, r.waterMl) === 1 ? '' : 's'}</b>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty">Enter numbers above zero to see the result.</div>
        )}
      </Glass>

      {warns.map((w) => (
        <div key={w} className="warn" role="status">{w}</div>
      ))}

      <Glass className="stack">
        <div className="field">
          <label className="label" htmlFor="pep">Peptide (optional)</label>
          <input id="pep" className="text-input" value={d.peptideName} placeholder="e.g. Retatrutide" onChange={(e) => update({ peptideName: e.target.value })} />
        </div>
        <Stepper label="Vial size" unit="mg" step={0.5} value={d.vialMg} onChange={(vialMg) => update({ vialMg })} chips={[5, 10, 15, 20, 30]} />
        {d.mode === 'check' && <Stepper label="Water already added" unit="mL" step={0.1} value={d.waterMl} onChange={(waterMl) => update({ waterMl })} />}
        <Stepper label="Target dose" unit="mg" step={0.25} value={d.doseMg} onChange={(doseMg) => update({ doseMg })} chips={[0.5, 1, 1.5, 2, 2.5]} />
        {d.mode === 'plan' && (
          <Stepper label="Units per dose" unit="u" step={1} value={d.targetUnits} onChange={(targetUnits) => update({ targetUnits })} chips={[10, 20, 30, 40, 50]} />
        )}
      </Glass>

      <Glass className="stack tight">
        <div className="label">Syringe</div>
        <Segmented<SyringeType>
          label="Syringe type"
          value={syringeType}
          onChange={(syringeType) => setPref({ syringeType })}
          options={[
            { value: 'U-100', label: 'U-100' },
            { value: 'U-40', label: 'U-40' },
          ]}
        />
        <Segmented<CapacityMl>
          label="Syringe capacity"
          value={capacityMl}
          onChange={(capacityMl) => setPref({ capacityMl })}
          options={[
            { value: 0.3, label: `0.3 mL` },
            { value: 0.5, label: `0.5 mL` },
            { value: 1, label: `1 mL` },
          ]}
        />
        <Stepper label="BAC water bottle" unit="mL" step={1} value={bottleMl} onChange={(v) => setPref({ bottleMl: Number.isFinite(v) ? v : 0 })} chips={[3, 5, 10, 30]} />
      </Glass>

      <PillButton block disabled={!r} onClick={saveVial}>
        {saved ? <>Saved as my vial <Check /></> : <>Save as my vial <Save /></>}
      </PillButton>

      {r && (
        <Glass className="tight">
          <div className="label" style={{ marginBottom: 8 }}>Steps</div>
          <ol className="steps">
            {steps({ waterMl: r.waterMl, units: r.units, doseMg: d.doseMg, capacityMl, syringeType }).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Glass>
      )}

      <p className="disclaimer">Calculator only — not medical advice. Check your maths.</p>
    </>
  );
}
