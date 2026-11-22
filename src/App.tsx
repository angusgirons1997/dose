import { useEffect, useRef, useState } from 'react';
import { TABS, TabBar, type Tab } from './components/TabBar';
import { useSetting } from './lib/db';
import { installClickSounds, setHapticsEnabled, setSoundEnabled } from './lib/sound';
import { useSwipe } from './lib/swipe';
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
  const appRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useSwipe(trackRef, appRef, index, TABS.length, (i) => setTab(TABS[i].id));

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
    <div id="app" ref={appRef} className="app" style={{ '--pos': index } as React.CSSProperties}>
      {/* One pre-painted layer per tab. Each layer's opacity is derived from --pos, so colours cross-fade
          with the swipe (GPU-only, no repaint). */}
      <div className="bg" aria-hidden="true">
        <div className="shift">
          <div className="drift">
            {TABS.map(({ id }, i) => <div key={id} className={`layer l-${id} ${id === tab ? 'on' : ''}`} style={{ '--i': i } as React.CSSProperties} />)}
          </div>
        </div>
        <div className="noise" />
      </div>

      {/* All tabs sit side by side; the track slides with --pos. Off-screen panels are inert. */}
      <div className="track" ref={trackRef}>
        {TABS.map(({ id }) => (
          <main key={id} className="panel" inert={id !== tab}>
            <div className="screen">{screens[id]}</div>
          </main>
        ))}
      </div>

      {/* Blurs content under the nav (iOS scroll-edge effect) and swallows taps there */}
      <div className="nav-shield" />
      <TabBar tab={tab} onChange={setTab} />
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
