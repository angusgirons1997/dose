import { useRef, useState } from 'react';
import type { CapacityMl, SyringeType } from '../lib/calc';
import { exportBackup, importBackup } from '../lib/backup';
import { setSetting, usePrefs, useSetting, type Prefs } from '../lib/db';
import { Glass, Segmented, Toggle } from '../components/Glass';
import { PillButton } from '../components/PillButton';
import { Sheet } from '../components/Sheet';
import { Download, Upload } from '../components/Icons';

export function Settings({ onClose }: { onClose: () => void }) {
  const prefs = usePrefs();
  const lastBackup = useSetting<string | null>('lastBackup', null);
  const persisted = useSetting<boolean | null>('persisted', null);
  const sound = useSetting('sound', true);
  const haptics = useSetting('haptics', true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const set = (p: Partial<Prefs>) => setSetting('prefs', { ...prefs, ...p });

  const days = lastBackup ? Math.floor((Date.now() - Date.parse(lastBackup)) / 864e5) : null;

  const doExport = async () => {
    setMsg('');
    try {
      await exportBackup();
      setMsg('Backup exported.');
    } catch (e) {
      setMsg(`Export failed: ${(e as Error).message}`);
    }
  };
  const doImport = async (f?: File) => {
    if (!f) return;
    if (!confirm('Replace ALL data on this device with the backup? This cannot be undone.')) return;
    try {
      await importBackup(f);
      setMsg('Backup restored.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <Sheet title="Settings" onClose={onClose}>
      <Glass className="tight stack">
        <div>
          <b style={{ fontSize: 17 }}>Back up your data</b>
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            iOS can wipe home-screen app storage. Export regularly and keep the file in iCloud Drive / Files.
          </p>
        </div>
        <div className={days == null || days > 14 ? 'warn' : 'small muted'}>
          {days == null ? 'Never backed up.' : days === 0 ? 'Last backup: today.' : `Last backup: ${days} day${days === 1 ? '' : 's'} ago.`}
        </div>
        <PillButton block onClick={doExport}>Export backup <Download /></PillButton>
        <PillButton block variant="ghost" onClick={() => fileRef.current?.click()}>Import backup <Upload /></PillButton>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = ''; }} />
        {msg && <div className="small" role="status">{msg}</div>}
      </Glass>

      <Glass className="tight stack">
        <b style={{ fontSize: 17 }}>Syringe defaults</b>
        <Segmented<SyringeType> label="Syringe type" value={prefs.syringeType} onChange={(syringeType) => set({ syringeType })} options={[{ value: 'U-100', label: 'U-100' }, { value: 'U-40', label: 'U-40' }]} />
        <Segmented<CapacityMl> label="Capacity" value={prefs.capacityMl} onChange={(capacityMl) => set({ capacityMl })} options={[{ value: 0.3, label: '0.3 mL' }, { value: 0.5, label: '0.5 mL' }, { value: 1, label: '1 mL' }]} />
      </Glass>

      <Glass className="tight stack">
        <Toggle label="Sounds" checked={sound} onChange={(v) => setSetting('sound', v)} />
        <Toggle label="Haptics (iPhone)" checked={haptics} onChange={(v) => setSetting('haptics', v)} />
      </Glass>

      <Glass className="tight small muted stack" style={{ gap: 6 }}>
        <div className="spread"><span>Weight units</span><span>kg</span></div>
        <div className="spread"><span>Persistent storage</span><span>{persisted == null ? '—' : persisted ? 'Granted' : 'Not granted'}</span></div>
        <div>All data stays on this device. No accounts, no network.</div>
      </Glass>
    </Sheet>
  );
}
