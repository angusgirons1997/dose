import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { check, round1, round2, unitsToMg, vialRemaining } from '../lib/calc';
import { db, fmtDate, isoDate, saveJab, today, usePrefs, useSetting, type Jab, type SavedVial, type Vial } from '../lib/db';
import { Glass, IconButton, Toggle } from '../components/Glass';
import { PillButton } from '../components/PillButton';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { ChevronL, ChevronR, Plus, SyringeIcon, Vial as VialIcon } from '../components/Icons';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function Jabs() {
  const jabs = useLiveQuery(() => db.jabs.orderBy('date').reverse().toArray(), [], []);
  const vials = useLiveQuery(() => db.vials.toArray(), [], []);
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [editing, setEditing] = useState<{ date: string; jab?: Jab } | null>(null);

  const byDate = new Map<string, Jab>();
  for (const j of jabs) if (!byDate.has(j.date)) byDate.set(j.date, j);

  const active = vials.find((v) => v.active);
  const t = today();

  // Monday-first grid
  const lead = (month.getDay() + 6) % 7;
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: lead + daysIn }, (_, i) => (i < lead ? null : isoDate(new Date(month.getFullYear(), month.getMonth(), i - lead + 1))));
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <>
      <h1 className="title">Jabs</h1>

      <Glass>
        <div className="spread" style={{ marginBottom: 14 }}>
          <IconButton label="Previous month" onClick={() => shift(-1)}><ChevronL /></IconButton>
          <b style={{ fontSize: 18 }}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
          <IconButton label="Next month" onClick={() => shift(1)}><ChevronR /></IconButton>
        </div>
        <div className="cal-head">{DOW.map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="cal">
          {cells.map((iso, i) => {
            if (!iso) return <span key={i} className="day out" />;
            const j = byDate.get(iso);
            const cls = ['day', j && 'jab', jabs.some((x) => x.date === iso && x.newVial) && 'vial', iso === t && 'today', iso > t && 'future'].filter(Boolean).join(' ');
            return (
              <button
                key={iso}
                type="button"
                className={cls}
                aria-label={`${fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long' })}${j ? `, ${round1(j.units)} units` : ''}`}
                onClick={() => setEditing({ date: iso, jab: j })}
              >
                {Number(iso.slice(8))}
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--cream)' }} /> Jab</span>
          <span><i style={{ border: '2px solid var(--cream)' }} /> New vial</span>
        </div>
      </Glass>

      <PillButton block onClick={() => setEditing({ date: t, jab: byDate.get(t) })}>
        Log today’s jab <Plus />
      </PillButton>

      {jabs.length > 0 && (
        <>
          <div className="section-title">Recent</div>
          <div className="pills-scroll">
            {jabs.slice(0, 5).map((j) => (
              <button key={j.id} type="button" className="glass jab-pill" onClick={() => setEditing({ date: j.date, jab: j })}>
                <b>{round1(j.units)} u</b>
                <span>{fmtDate(j.date)} · {round2(j.doseMg)} mg</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Active vial</div>
      <ActiveVial vial={active} jabs={jabs} />

      {editing && <JabSheet {...editing} active={active} vials={vials} onClose={() => setEditing(null)} />}
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
  const used = jabs.filter((j) => j.vialId === vial.id);
  const dose = vial.doseMg ?? used[0]?.doseMg;
  const { remainingMg: remaining, jabsLeft: left, fraction } = vialRemaining(vial.vialMg, used.map((j) => j.doseMg), dose);
  return (
    <Glass className="tight stack">
      <div className="list-pill" style={{ padding: 0 }}>
        <span className="ico"><VialIcon /></span>
        <div>
          <div className="t">{vial.peptideName || 'Vial'} · {vial.vialMg} mg</div>
          <div className="s">Mixed {fmtDate(vial.createdAt)} · {vial.waterMl} mL · {round2(vial.concentrationMgPerMl)} mg/mL</div>
        </div>
      </div>
      <div className="spread" style={{ alignItems: 'flex-end' }}>
        <div>
          <div className="label">Remaining</div>
          <div className="big-num">{round2(remaining)}<span className="muted" style={{ fontSize: 18 }}> mg</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">Jabs left</div>
          <div className="big-num">{left ?? '—'}</div>
        </div>
      </div>
      <div className="meter"><div style={{ width: `${fraction * 100}%` }} /></div>
      <div className="small muted">{used.length} jab{used.length === 1 ? '' : 's'} from this vial{dose ? ` · at ${round2(dose)} mg each` : ''}</div>
    </Glass>
  );
}

function JabSheet({ date: initialDate, jab, active, vials, onClose }: { date: string; jab?: Jab; active?: Vial; vials: Vial[]; onClose: () => void }) {
  const prefs = usePrefs();
  const savedVial = useSetting<SavedVial | null>('savedVial', null);
  const [date, setDate] = useState(jab?.date ?? initialDate);
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

  // New entry: prefill units from the calculator's saved plan once it loads.
  const [prefilled, setPrefilled] = useState(!!jab);
  useEffect(() => {
    if (prefilled || !savedVial) return;
    const guess = check({ ...savedVial, syringeType: savedVial.syringeType })?.units;
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

      <PillButton block disabled={!valid || busy} onClick={save}>
        Save jab <SyringeIcon />
      </PillButton>
      {jab && <PillButton block variant="danger" onClick={remove}>Delete</PillButton>}
    </Sheet>
  );
}
