import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { nextJab, round1, round2 } from '../lib/calc';
import { DEFAULT_PEPTIDE, daysAgo, db, fmtDate, intervalFor, today, useIntervals, type Weight } from '../lib/db';
import { Glass, IconButton } from '../components/Glass';
import { PillButton } from '../components/PillButton';
import { CalcIcon, ChevronR, GearIcon, Plus } from '../components/Icons';
import type { Tab } from '../components/TabBar';
import { JabSheet, useJabData, vialStatus } from './Jabs';
import { WeightSheet } from './Body';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
const ago = (iso: string) => {
  const d = daysAgo(iso);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
};

/** The countdown as [big figure, caption] for inside the dial. */
const countdown = (n: number): [string, string] =>
  n > 1 ? [String(n), 'days to go'] : n === 1 ? ['1', 'day to go'] : n === 0 ? ['Today', 'jab day'] : [String(-n), `day${n === -1 ? '' : 's'} late`];

/** Ring that fills as jab day approaches, with the countdown in the middle. */
function Dial({ fraction, children }: { fraction: number; children: React.ReactNode }) {
  const c = 2 * Math.PI * 76;
  return (
    <div className="dial">
      <svg viewBox="0 0 168 168" aria-hidden="true">
        <circle cx="84" cy="84" r="76" />
        <circle cx="84" cy="84" r="76" className="v" strokeDasharray={`${fraction * c} ${c}`} />
      </svg>
      <div className="in">{children}</div>
    </div>
  );
}

export function Home({ go, openSettings }: { go: (t: Tab) => void; openSettings: () => void }) {
  const { jabs, vials, active } = useJabData();
  const intervals = useIntervals();
  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray(), [], [] as Weight[]);
  const [sheet, setSheet] = useState<'jab' | 'weight' | null>(null);

  const last = jabs[0];
  const status = active && vialStatus(active, jabs);
  const peptide = active?.peptideName || vials.find((v) => v.id === last?.vialId)?.peptideName || DEFAULT_PEPTIDE;
  const every = intervalFor(intervals, peptide);
  const next = last && nextJab(last.date, today(), every);
  const latest = weights[weights.length - 1];
  const change = weights.length > 1 ? latest.kg - weights[0].kg : 0;

  const [fig, cap] = next ? countdown(next.daysLeft) : ['—', 'not started'];

  return (
    <div className="home">
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="title">{greeting()}</h1>
          <div className="label">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <IconButton label="Settings" onClick={openSettings}><GearIcon /></IconButton>
      </div>

      <Glass className="hero-card">
        <div className="label">Next jab · {peptide}</div>
        <Dial fraction={next ? next.fraction : 0}>
          <span className={`n ${next && next.daysLeft < 0 ? 'late' : ''}`}>{fig}</span>
          <span className="u">{cap}</span>
        </Dial>
        <div className="small muted">
          {next
            ? <>Due {fmtDate(next.dueIso, { weekday: 'short', day: 'numeric', month: 'short' })} · every {every} day{every === 1 ? '' : 's'}<br />Last {ago(last.date).toLowerCase()}, {round1(last.units)} u / {round2(last.doseMg)} mg</>
            : 'Log your first jab to start the countdown.'}
        </div>
        <PillButton block onClick={() => setSheet('jab')}>Log a jab <Plus /></PillButton>
      </Glass>

      <div className="tiles">
        <button type="button" className="glass tile" onClick={() => setSheet('weight')}>
          <span className="label">Weight</span>
          <span className="v">{latest ? round1(latest.kg) : '—'}<small> kg</small></span>
          {weights.length > 1 && <span className="small muted">{change > 0 ? '+' : change < 0 ? '−' : ''}{round1(Math.abs(change))} kg overall</span>}
          <span className="foot">Log weight <Plus /></span>
        </button>
        {active && status ? (
          <button type="button" className="glass tile" onClick={() => go('jabs')}>
            <span className="label">{active.peptideName || 'Vial'}</span>
            <span className="v">{round2(status.remainingMg)}<small> mg left</small></span>
            <span className="meter"><span style={{ width: `${status.fraction * 100}%` }} /></span>
            <span className="foot">{status.jabsLeft ?? '—'} jabs left <ChevronR /></span>
          </button>
        ) : (
          <button type="button" className="glass tile" onClick={() => go('calc')}>
            <span className="label">Vial</span>
            <span className="v">None</span>
            <span className="small muted">Work out a mix and save it</span>
            <span className="foot">Calculator <ChevronR /></span>
          </button>
        )}
      </div>

      <button type="button" className="glass list-pill" onClick={() => go('calc')}>
        <span className="ico"><CalcIcon /></span>
        <div>
          <div className="t">Calculator</div>
          <div className="s">How many units to draw</div>
        </div>
        <span className="end"><ChevronR /></span>
      </button>

      {sheet === 'jab' && <JabSheet active={active} vials={vials} onClose={() => setSheet(null)} />}
      {sheet === 'weight' && <WeightSheet lastKg={latest?.kg} onClose={() => setSheet(null)} />}
    </div>
  );
}
