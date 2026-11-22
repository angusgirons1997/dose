import { useEffect, useState } from 'react';
import { IconButton } from './components/Glass';
import { GearIcon } from './components/Icons';
import { TabBar, type Tab } from './components/TabBar';
import { Body } from './screens/Body';
import { Calculator } from './screens/Calculator';
import { Jabs } from './screens/Jabs';
import { Settings } from './screens/Settings';


export function App() {
  const [tab, setTab] = useState<Tab>(() => (sessionStorage.getItem('tab') as Tab) || 'calc');
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.tab = tab;
    try { sessionStorage.setItem('tab', tab); } catch { /* private mode */ }
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="blob b1" /><div className="blob b2" /><div className="blob b3" /><div className="blob b4" />
        <div className="noise" />
      </div>
      <main className="screen">
        <div className="topbar">
          <span className="label">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <IconButton label="Settings" onClick={() => setSettings(true)}><GearIcon /></IconButton>
        </div>
        {tab === 'calc' && <Calculator />}
        {tab === 'jabs' && <Jabs />}
        {tab === 'body' && <Body />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
      {settings && <Settings onClose={() => setSettings(false)} />}
    </>
  );
}
