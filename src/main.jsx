import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initI18n } from './i18n/index.js';
import './index.css';
import './familyCloudMail.css';

// The static service worker is deliberately production-only. Its cache-first
// strategy is right for an installed PWA, but would otherwise keep stale Vite
// modules during local development and can mix two React context instances.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Die App bleibt auch ohne Offline-Cache vollständig nutzbar.
  });
}

// Die Oberfläche startet erst, wenn die Übersetzungen bereitstehen.
// Schlägt die Initialisierung fehl, rendert die App mit Deutsch als Standard.
initI18n().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
