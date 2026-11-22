import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { setSetting } from './lib/db';
import './styles/app.css';

// Ask iOS not to evict our IndexedDB. Re-asking is harmless; result shown in Settings.
navigator.storage?.persist?.().then((ok) => setSetting('persisted', ok)).catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
