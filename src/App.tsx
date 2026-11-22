import { useEffect, useState } from 'react';
import { IconButton } from './components/Glass';
import { GearIcon } from './components/Icons';
import { Logo } from './components/Logo';
import { TABS, TabBar, type Tab } from './components/TabBar';
import { useSetting } from './lib/db';
import { installClickSounds, setSoundEnabled } from './lib/sound';
import { Body } from './screens/Body';
import { Calculator } from './screens/Calculator';
import { Home } from './screens/Home';
import { Jabs } from './screens/Jabs';
import { Settings } from './screens/Settings';

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [settings, setSettings] = useState(false);
  const sound = useSetting('sound', true);
  const index = TABS.findIndex((t) => t.id === tab);

  useEffect(installClickSounds, []);
  useEffect(() => setSoundEnabled(sound), [sound]);
  const screens: Record<Tab, React.ReactNode> = {
    home: <Home go={setTab} />,
    calc: <Calculator />,
    jabs: <Jabs />,
    body: <Body />,
  };

  return (
    <div id="app" className="app" style={{ '--tab-i': index } as React.CSSProperties}>
      {/* One pre-painted layer per tab; switching only fades opacity and slides (GPU-only, no repaint) */}
      <div className="bg" aria-hidden="true">
        <div className="shift">
          <div className="drift">
            {TABS.map(({ id }) => <div key={id} className={`layer l-${id} ${id === tab ? 'on' : ''}`} />)}
          </div>
        </div>
        <div className="noise" />
      </div>

      <header className="app-header">
        <button type="button" className="brand" onClick={() => setTab('home')} aria-label="Dose — home">
          <Logo size={38} />
          <span>
            <b>Dose</b>
            <span className="label">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </span>
        </button>
        <IconButton label="Settings" onClick={() => setSettings(true)}><GearIcon /></IconButton>
      </header>

      {/* All tabs sit side by side; the track slides. Off-screen panels are inert. */}
      <div className="track" style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}>
        {TABS.map(({ id }) => (
          <main key={id} className="panel" inert={id !== tab}>
            <div className="screen">{screens[id]}</div>
          </main>
        ))}
      </div>

      {/* Fades content under the nav and swallows taps there */}
      <div className="nav-shield">
        {tab === 'calc' && <p className="disclaimer">Calculator only — not medical advice. Check your maths.</p>}
      </div>
      <TabBar tab={tab} onChange={setTab} />
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
