import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './familyCloudMail.css';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Die App bleibt auch ohne Offline-Cache vollständig nutzbar.
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
