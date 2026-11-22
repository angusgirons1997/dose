import { useEffect, useState } from 'react';
import { TABS, TabBar, type Tab } from './components/TabBar';
import { useSetting } from './lib/db';
import { installClickSounds, setHapticsEnabled, setSoundEnabled } from './lib/sound';
import { Body } from './screens/Body';
import { Calculator } from './screens/Calculator';
import { Home } from './screens/Home';
import { Jabs } from './screens/Jabs';
import { Settings } from './screens/Settings';

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [settings, setSettings] = useState(false);
  const sound = useSetting('sound', true);
  const haptics = useSetting('haptics', true);
  const index = TABS.findIndex((t) => t.id === tab);

  useEffect(installClickSounds, []);
  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => setHapticsEnabled(haptics), [haptics]);
  const screens: Record<Tab, React.ReactNode> = {
    home: <Home go={setTab} openSettings={() => setSettings(true)} />,
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

      {/* All tabs sit side by side; the track slides. Off-screen panels are inert. */}
      <div className="track" style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}>
        {TABS.map(({ id }) => (
          <main key={id} className="panel" inert={id !== tab}>
            <div className="screen">{screens[id]}</div>
          </main>
        ))}
      </div>

      {/* Blurs content under the nav (iOS scroll-edge effect) and swallows taps there */}
      <div className="nav-shield" />      <TabBar tab={tab} onChange={setTab} />
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
