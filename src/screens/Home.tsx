import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { nextJab, round1, round2 } from '../lib/calc';
import { DEFAULT_PEPTIDE, daysAgo, db, fmtDate, intervalFor, today, useIntervals, type Weight } from '../lib/db';
import { Glass, IconButton } from '../components/Glass';
import { PillButton } from '../components/PillButton';
import { CalcIcon, ChevronR, GearIcon, Plus } from '../components/Icons';
import type { Tab } from '../components/TabBar';
import { JabSheet, useJabData, vialStatus } from './Jabs';
import { Chart, WeightSheet } from './Body';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
const ago = (iso: string) => {
  const d = daysAgo(iso);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
};

const countdownText = (n: number) =>
  n > 1 ? `${n} days` : n === 1 ? 'Tomorrow' : n === 0 ? 'Today' : `${-n} day${n === -1 ? '' : 's'} late`;

/** Glass ring showing how far through the jab interval we are. */
function Ring({ fraction }: { fraction: number }) {
  const c = 2 * Math.PI * 26;
  return (
    <svg className="ring" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <circle cx="32" cy="32" r="26" />
      <circle cx="32" cy="32" r="26" className="v" strokeDasharray={`${fraction * c} ${c}`} />
    </svg>
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

  return (
    <>
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="title">{greeting()}</h1>
          <div className="label">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <IconButton label="Settings" onClick={openSettings}><GearIcon /></IconButton>
      </div>

      <Glass className="stack">
        <div className="spread">
          <div>
            <div className="label">Next jab · {peptide} · every {every} day{every === 1 ? '' : 's'}</div>
            <div className={`big-num ${next && next.daysLeft < 0 ? 'late' : ''}`}>{next ? countdownText(next.daysLeft) : 'Not started'}</div>
            <div className="small muted" style={{ marginTop: 6 }}>
              {next
                ? <>Due {fmtDate(next.dueIso, { weekday: 'short', day: 'numeric', month: 'short' })} · last {ago(last.date).toLowerCase()}, {round1(last.units)} u / {round2(last.doseMg)} mg</>
                : 'Log your first jab to start the countdown.'}
            </div>
          </div>
          {next && <Ring fraction={next.fraction} />}
        </div>
        {active && status && (
          <>
            <div className="spread small">
              <span>{active.peptideName || 'Vial'} · {round2(status.remainingMg)} mg left</span>
              <span className="muted">{status.jabsLeft ?? '—'} jabs left</span>
            </div>
            <div className="meter"><div style={{ width: `${status.fraction * 100}%` }} /></div>
          </>
        )}
        <PillButton block onClick={() => setSheet('jab')}>Log a jab <Plus /></PillButton>
      </Glass>

      <Glass className="stack">
        <div className="spread" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="label">Weight</div>
            <div className="big-num">{latest ? round1(latest.kg) : '—'}<span className="muted" style={{ fontSize: 14 }}> kg</span></div>
          </div>
          {weights.length > 1 && (
            <div style={{ fontSize: 15, fontWeight: 500 }}>{change > 0 ? '+' : change < 0 ? '−' : ''}{round1(Math.abs(change))} kg</div>
          )}
        </div>
        {weights.length > 1 && <div className="chart"><Chart weights={weights} compact /></div>}
        <PillButton block variant="ghost" onClick={() => setSheet('weight')}>Log weight <Plus /></PillButton>
      </Glass>

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
    </>
  );
}
