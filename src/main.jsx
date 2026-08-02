import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initI18n } from './i18n/index.js';
import './index.css';
import './familyCloudMail.css';

if ('serviceWorker' in navigator) {
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
