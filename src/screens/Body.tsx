import { useEffect, useId, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { round1 } from '../lib/calc';
import { db, deleteWeight, fmtDate, saveWeight, today, type Photo, type Weight } from '../lib/db';
import { Glass } from '../components/Glass';
import { PillButton } from '../components/PillButton';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { BodyIcon, Camera, Check, Image as ImageIcon, Plus } from '../components/Icons';

export function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function Body() {
  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray(), [], []);
  const photos = useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), [], []);
  const [editing, setEditing] = useState<Weight | 'new' | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  const first = weights[0];
  const last = weights[weights.length - 1];
  const change = first && last ? last.kg - first.kg : 0;

  const togglePick = (id: number) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
  const compare = picked.length === 2 ? picked.map((id) => photos.find((p) => p.id === id)!).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date)) : null;

  return (
    <>
      <h1 className="title">Body</h1>

      <Glass>
        <div className="spread" style={{ alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <div className="label">Weight over time</div>
            <div className="big-num">{last ? round1(last.kg) : '—'}<span className="muted" style={{ fontSize: 14 }}> kg</span></div>
          </div>
          {weights.length > 1 && (
            <div style={{ textAlign: 'right' }}>
              <div className="label">Since {fmtDate(first.date)}</div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{change > 0 ? '+' : change < 0 ? '−' : ''}{round1(Math.abs(change))} kg</div>
            </div>
          )}
        </div>
        <div className="chart"><Chart weights={weights} /></div>
      </Glass>

      <PillButton block onClick={() => setEditing('new')}>Log weight <Plus /></PillButton>

      <div className="spread">
        <div className="section-title">Photos</div>
        {photos.length > 1 && (
          <button type="button" className="chip" aria-pressed={picking} onClick={() => { setPicking(!picking); setPicked([]); }}>
            {picking ? 'Cancel' : 'Compare'}
          </button>
        )}
      </div>
      {picking && <div className="small muted" style={{ marginTop: -8 }}>Pick any two photos.</div>}
      {photos.length ? (
        <div className="photo-grid">
          {photos.map((p) => (
            <PhotoTile
              key={p.id}
              photo={p}
              index={picked.indexOf(p.id!)}
              onClick={() => (picking ? togglePick(p.id!) : setEditing(weights.find((w) => w.photoId === p.id) ?? null))}
            />
          ))}
        </div>
      ) : (
        <Glass className="tight"><div className="empty">Add a photo when you log a weight.</div></Glass>
      )}

      {weights.length > 0 && (
        <>
          <div className="section-title">History</div>
          <div className="stack" style={{ gap: 8 }}>
            {[...weights].reverse().map((w, i, arr) => {
              const prev = arr[i + 1];
              return (
                <button key={w.id} type="button" className="glass list-pill" onClick={() => setEditing(w)}>
                  <span className="ico">{w.photoId ? <ImageIcon /> : <BodyIcon />}</span>
                  <div>
                    <div className="t">{round1(w.kg)} kg</div>
                    <div className="s">{fmtDate(w.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  {prev && <span className="end small muted">{w.kg - prev.kg >= 0 ? '+' : '−'}{round1(Math.abs(w.kg - prev.kg))}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {editing && <WeightSheet weight={editing === 'new' ? undefined : editing} lastKg={last?.kg} onClose={() => setEditing(null)} />}
      {compare && compare.length === 2 && (
        <Sheet title="Compare" onClose={() => setPicked([])}>
          <div className="compare">
            {compare.map((p) => <CompareImg key={p.id} photo={p} weights={weights} />)}
          </div>
        </Sheet>
      )}
    </>
  );
}

function PhotoTile({ photo, index, onClick }: { photo: Photo; index: number; onClick: () => void }) {
  const url = useBlobUrl(photo.blob);
  return (
    <button type="button" className={`glass ${index >= 0 ? 'picked' : ''}`} onClick={onClick} aria-label={`Photo ${fmtDate(photo.date)}`}>
      {url && <img src={url} alt="" />}
      <span className="d">{fmtDate(photo.date)}</span>
      {index >= 0 && <span className="sel">{index + 1}</span>}
    </button>
  );
}

function CompareImg({ photo, weights }: { photo: Photo; weights: Weight[] }) {
  const url = useBlobUrl(photo.blob);
  const w = weights.find((x) => x.photoId === photo.id);
  return (
    <figure>
      {url && <img src={url} alt={`Progress photo ${fmtDate(photo.date)}`} />}
      <figcaption>{fmtDate(photo.date, { day: 'numeric', month: 'short', year: 'numeric' })}{w ? ` · ${round1(w.kg)} kg` : ''}</figcaption>
    </figure>
  );
}

/** Hand-rolled SVG line chart. Works with 0, 1 or many points. */
export function Chart({ weights, compact }: { weights: Weight[]; compact?: boolean }) {
  const gid = 'wg' + useId().replace(/\W/g, ''); // plain id: safe inside url(#…)
  const W = 340, H = compact ? 70 : 170, L = compact ? 4 : 34, PAD = 8;
  const ts = weights.map((w) => new Date(w.date + 'T00:00').getTime());
  const kgs = weights.map((w) => w.kg);
  const [t0, t1] = [Math.min(...ts), Math.max(...ts)];
  let [k0, k1] = kgs.length ? [Math.min(...kgs), Math.max(...kgs)] : [70, 90];
  if (k1 - k0 < 2) { const m = (k0 + k1) / 2; k0 = m - 1; k1 = m + 1; } // keep flat lines readable
  const x = (t: number) => (t1 === t0 ? (L + W) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - PAD));
  const y = (k: number) => PAD + (1 - (k - k0) / (k1 - k0)) * (H - 2 * PAD);
  const pts = weights.map((w, i) => [x(ts[i]), y(w.kg)] as const);
  const line = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');
  const area = pts.length > 1 ? `${line}L${pts[pts.length - 1][0].toFixed(1)},${H}L${pts[0][0].toFixed(1)},${H}Z` : '';
  const grid = [k1, (k0 + k1) / 2, k0];
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={kgs.length ? `Weight from ${round1(kgs[0])} to ${round1(kgs[kgs.length - 1])} kg` : 'No weights yet'}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {!compact &&
          grid.map((k) => (
            <g key={k}>
              <line x1={L} x2={W} y1={y(k)} y2={y(k)} stroke="rgba(255,255,255,.14)" strokeDasharray="3 5" />
              <text x={0} y={y(k) + 4} fontSize="11" fill="rgba(255,255,255,.6)">{round1(k)}</text>
            </g>
          ))}
        {area && <path d={area} fill={`url(#${gid})`} />}
        {pts.length > 1 && <path d={line} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="5" fill="#fff" stroke="rgba(0,0,0,.3)" />}
        {!pts.length && !compact && (
          <text x={(L + W) / 2} y={H / 2 + 4} fontSize="13" textAnchor="middle" fill="rgba(255,255,255,.6)">Log a weight to start your graph</text>
        )}
      </svg>
      {!compact && weights.length > 0 && (
        <div className="spread small muted" style={{ marginTop: 6, paddingLeft: L * (100 / W) + '%' }}>
          <span>{fmtDate(weights[0].date)}</span>
          {weights.length > 1 && <span>{fmtDate(weights[weights.length - 1].date)}</span>}
        </div>
      )}
    </>
  );
}

export function WeightSheet({ weight, lastKg, onClose }: { weight?: Weight; lastKg?: number; onClose: () => void }) {
  const [date, setDate] = useState(weight?.date ?? today());
  const [kg, setKg] = useState(weight?.kg ?? lastKg ?? 80);
  const [photo, setPhoto] = useState<File>();
  const existing = useLiveQuery(() => (weight?.photoId != null ? db.photos.get(weight.photoId) : undefined), [weight?.photoId]);
  const preview = useBlobUrl(photo ?? existing?.blob);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const valid = kg > 0 && kg < 500 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPhoto(f);
    e.target.value = '';
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await saveWeight(date, kg, photo, weight);
      onClose();
    } catch (e) {
      setError(`Couldn't save: ${(e as Error).message}`);
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!confirm(weight!.photoId ? 'Delete this entry and its photo?' : 'Delete this entry?')) return;
    await deleteWeight(weight!);
    onClose();
  };

  return (
    <Sheet title={weight ? 'Edit weight' : 'Log weight'} onClose={onClose}>
      <div className="field">
        <label className="label" htmlFor="wd">Date</label>
        <input id="wd" type="date" className="text-input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Stepper label="Weight" unit="kg" step={0.1} value={kg} onChange={setKg} />
      <div className="field">
        <span className="label">Progress photo (optional)</span>
        <div className="row">
          {preview && <img className="thumb" src={preview} alt="Selected photo" />}
          <div className="photo-pick" style={{ flex: 1 }}>
            <label className="pill-btn ghost">
              <Camera /> Camera
              <input type="file" accept="image/*" capture="environment" onChange={onFile} />
            </label>
            <label className="pill-btn ghost">
              <ImageIcon /> Library
              <input type="file" accept="image/*" onChange={onFile} />
            </label>
          </div>
        </div>
      </div>
      {error && <div className="warn">{error}</div>}
      <PillButton block disabled={!valid || busy} onClick={save} data-sound="success">
        {busy ? 'Saving…' : 'Save'} <Check />
      </PillButton>
      {weight && <PillButton block variant="danger" onClick={remove}>Delete</PillButton>}
    </Sheet>
  );
}
