import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { check, round1, round2, unitsToMg, vialRemaining } from '../lib/calc';
import { db, fmtDate, saveJab, today, usePrefs, useSetting, type Jab, type SavedVial, type Vial } from '../lib/db';
import { Glass, Toggle } from '../components/Glass';
import { PillButton } from '../components/PillButton';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { Plus, SyringeIcon, Vial as VialIcon } from '../components/Icons';

export const useJabData = () => {
  const jabs = useLiveQuery(() => db.jabs.orderBy('date').reverse().toArray(), [], []);
  const vials = useLiveQuery(() => db.vials.toArray(), [], []);
  return { jabs, vials, active: vials.find((v) => v.active) };
};

export function vialStatus(vial: Vial, jabs: Jab[]) {
  const used = jabs.filter((j) => j.vialId === vial.id);
  const dose = vial.doseMg ?? used[0]?.doseMg;
  return { used, dose, ...vialRemaining(vial.vialMg, used.map((j) => j.doseMg), dose) };
}

export function Jabs() {
  const { jabs, vials, active } = useJabData();
  const [editing, setEditing] = useState<Jab | 'new' | null>(null);

  // group by month, newest first
  const months = new Map<string, Jab[]>();
  for (const j of jabs) {
    const k = j.date.slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), j]);
  }

  return (
    <>
      <h1 className="title">Jabs</h1>

      <ActiveVial vial={active} jabs={jabs} />

      <PillButton block onClick={() => setEditing('new')}>
        Log a jab <Plus />
      </PillButton>

      {jabs.length === 0 && <div className="empty">No jabs logged yet.</div>}
      {[...months].map(([month, list]) => (
        <section key={month} className="stack" style={{ gap: 8 }}>
          <div className="section-title">{fmtDate(month + '-01', { month: 'long', year: 'numeric' })}</div>
          {list.map((j) => (
            <button key={j.id} type="button" className="glass list-pill" onClick={() => setEditing(j)}>
              <span className={`ico ${j.newVial ? 'ring' : ''}`}>{j.newVial ? <VialIcon /> : <SyringeIcon />}</span>
              <div>
                <div className="t">{round1(j.units)} units</div>
                <div className="s">
                  {fmtDate(j.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                  {j.newVial ? ' · New vial' : ''}
                </div>
              </div>
              <span className="end"><b>{round2(j.doseMg)}</b> <span className="muted small">mg</span></span>
            </button>
          ))}
        </section>
      ))}

      {editing && <JabSheet jab={editing === 'new' ? undefined : editing} active={active} vials={vials} onClose={() => setEditing(null)} />}
    </>
  );
}

function ActiveVial({ vial, jabs }: { vial?: Vial; jabs: Jab[] }) {
  if (!vial)
    return (
      <Glass className="tight">
        <div className="empty">No active vial. Log a jab with “Reconstituted a new vial today” switched on.</div>
      </Glass>
    );
  const { used, dose, remainingMg, jabsLeft, fraction } = vialStatus(vial, jabs);
  return (
    <Glass className="tight stack">
      <div className="list-pill" style={{ padding: 0 }}>
        <span className="ico"><VialIcon /></span>
        <div>
          <div className="t">{vial.peptideName || 'Active vial'} · {vial.vialMg} mg</div>
          <div className="s">Mixed {fmtDate(vial.createdAt)} · {vial.waterMl} mL · {round2(vial.concentrationMgPerMl)} mg/mL</div>
        </div>
      </div>
      <div className="spread" style={{ alignItems: 'flex-end' }}>
        <div>
          <div className="label">Remaining</div>
          <div className="big-num">{round2(remainingMg)}<span className="muted" style={{ fontSize: 18 }}> mg</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">Jabs left</div>
          <div className="big-num">{jabsLeft ?? '—'}</div>
        </div>
      </div>
      <div className="meter"><div style={{ width: `${fraction * 100}%` }} /></div>
      <div className="small muted">{used.length} jab{used.length === 1 ? '' : 's'} from this vial{dose ? ` · ${round2(dose)} mg each` : ''}</div>
    </Glass>
  );
}

export function JabSheet({ jab, active, vials, onClose }: { jab?: Jab; active?: Vial; vials: Vial[]; onClose: () => void }) {
  const prefs = usePrefs();
  const savedVial = useSetting<SavedVial | null>('savedVial', null);
  const [date, setDate] = useState(jab?.date ?? today());
  const [units, setUnits] = useState(jab?.units ?? 0);
  const [doseOverride, setDoseOverride] = useState<number | null>(jab ? jab.doseMg : null);
  const [newVial, setNewVial] = useState(jab?.newVial ?? !active);
  const [nv, setNv] = useState<Partial<SavedVial>>({});
  const [busy, setBusy] = useState(false);

  // New-vial fields: whatever the user typed, else the calculator's saved vial.
  const nvVal = { peptideName: '', vialMg: 5, waterMl: 1, syringeType: prefs.syringeType, ...savedVial, ...nv };
  const vial = jab ? vials.find((v) => v.id === jab.vialId) : newVial ? undefined : active;
  const nvConc = check({ vialMg: nvVal.vialMg, waterMl: nvVal.waterMl, doseMg: 1, syringeType: nvVal.syringeType })?.concentration;
  const conc = newVial && !jab ? nvConc : vial?.concentrationMgPerMl;
  const syringe = newVial && !jab ? nvVal.syringeType : (vial?.syringeType ?? prefs.syringeType);
  const autoDose = conc && units > 0 ? unitsToMg(units, conc, syringe) : NaN;
  const doseMg = doseOverride ?? autoDose;

  // New entry: prefill units from the calculator's saved vial once it loads.
  const [prefilled, setPrefilled] = useState(!!jab);
  useEffect(() => {
    if (prefilled || !savedVial) return;
    const guess = check(savedVial)?.units;
    if (guess) setUnits(round1(guess));
    setPrefilled(true);
  }, [savedVial, prefilled]);

  const valid = units > 0 && Number.isFinite(doseMg) && doseMg > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date) && (!newVial || jab || nvConc != null);

  const save = async () => {
    setBusy(true);
    await saveJab(
      { ...jab, date, units, doseMg, newVial, vialId: jab?.vialId },
      newVial && !jab
        ? {
            peptideName: nvVal.peptideName,
            vialMg: nvVal.vialMg,
            waterMl: nvVal.waterMl,
            concentrationMgPerMl: nvConc!,
            syringeType: nvVal.syringeType,
            doseMg: savedVial?.doseMg ?? doseMg,
          }
        : undefined,
    );
    onClose();
  };
  const remove = async () => {
    if (!confirm('Delete this jab?')) return;
    await db.jabs.delete(jab!.id!);
    onClose();
  };

  return (
    <Sheet title={jab ? 'Edit jab' : 'Log jab'} onClose={onClose}>
      <div className="field">
        <label className="label" htmlFor="jd">Date</label>
        <input id="jd" type="date" className="text-input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Stepper label="Units taken" unit="u" step={1} value={units} onChange={setUnits} chips={[10, 20, 30, 40, 50]} />
      <Stepper label={doseOverride == null ? 'Dose (auto from vial)' : 'Dose (edited)'} unit="mg" step={0.05} value={doseMg} onChange={setDoseOverride} />
      {doseOverride != null && Number.isFinite(autoDose) && (
        <button type="button" className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => setDoseOverride(null)}>
          Use calculated {round2(autoDose)} mg
        </button>
      )}
      {!conc && <div className="warn">No vial concentration known — enter the dose in mg, or switch on “new vial”.</div>}

      {jab ? (
        jab.newVial && <div className="small muted">Started a new vial on this day.</div>
      ) : (
        <Glass className="tight stack">
          <Toggle label="Reconstituted a new vial today" checked={newVial} onChange={setNewVial} />
          {newVial && (
            <>
              <div className="small muted">{savedVial ? 'Prefilled from “Save as my vial”.' : 'Tip: use “Save as my vial” on the calculator to prefill this.'}</div>
              <input className="text-input" placeholder="Peptide (optional)" value={nvVal.peptideName} onChange={(e) => setNv({ ...nv, peptideName: e.target.value })} />
              <Stepper label="Vial size" unit="mg" step={0.5} value={nvVal.vialMg} onChange={(vialMg) => setNv({ ...nv, vialMg })} />
              <Stepper label="Water added" unit="mL" step={0.1} value={nvVal.waterMl} onChange={(waterMl) => setNv({ ...nv, waterMl })} />
            </>
          )}
        </Glass>
      )}

      <PillButton block disabled={!valid || busy} onClick={save} data-sound="success">
        Save jab <SyringeIcon />
      </PillButton>
      {jab && <PillButton block variant="danger" onClick={remove}>Delete</PillButton>}
    </Sheet>
  );
}
