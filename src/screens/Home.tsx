import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { round1, round2 } from '../lib/calc';
import { daysAgo, db, fmtDate, type Weight } from '../lib/db';
import { Glass } from '../components/Glass';
import { PillButton } from '../components/PillButton';
import { CalcIcon, ChevronR, Plus } from '../components/Icons';
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

export function Home({ go }: { go: (t: Tab) => void }) {
  const { jabs, vials, active } = useJabData();
  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray(), [], [] as Weight[]);
  const [sheet, setSheet] = useState<'jab' | 'weight' | null>(null);

  const last = jabs[0];
  const status = active && vialStatus(active, jabs);
  const latest = weights[weights.length - 1];
  const change = weights.length > 1 ? latest.kg - weights[0].kg : 0;

  return (
    <>
      <h1 className="title">{greeting()}</h1>

      <Glass className="stack">
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="label">Last jab</div>
            <div className="big-num">{last ? ago(last.date) : 'None yet'}</div>
            {last && <div className="small muted" style={{ marginTop: 6 }}>{round1(last.units)} u · {round2(last.doseMg)} mg · {fmtDate(last.date)}</div>}
          </div>
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
            <div className="big-num">{latest ? round1(latest.kg) : '—'}<span className="muted" style={{ fontSize: 18 }}> kg</span></div>
          </div>
          {weights.length > 1 && (
            <div style={{ fontSize: 18, fontWeight: 700 }}>{change > 0 ? '+' : change < 0 ? '−' : ''}{round1(Math.abs(change))} kg</div>
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
