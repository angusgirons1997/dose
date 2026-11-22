import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { setSetting } from './lib/db';
import './styles/app.css';

// Ask iOS not to evict our IndexedDB. Re-asking is harmless; result shown in Settings.
navigator.storage?.persist?.().then((ok) => setSetting('persisted', ok)).catch(() => {});

// iOS resumes home-screen apps without reloading, so check for a new version each time the app is
// foregrounded (autoUpdate then reloads into it).
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
