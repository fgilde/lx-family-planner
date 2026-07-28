import React, { useEffect, useState } from 'react';
import { Check, Globe, Server, Wifi, X } from 'lucide-react';
import {
  DEFAULT_SERVER_URL,
  getStoredServerUrl,
  normalizeServerUrl,
  setStoredServerUrl
} from '../utils/apiConfig';

export default function ServerConfigModal({ isOpen, onClose, onSave }) {
  const [url, setUrl] = useState(
    () => getStoredServerUrl() || DEFAULT_SERVER_URL
  );
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setUrl(getStoredServerUrl() || DEFAULT_SERVER_URL);
    setStatus(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const target = normalizeServerUrl(url);
      if (!target) {
        throw new Error('Bitte gib eine Server-Adresse ein.');
      }
      const response = await fetch(`${target}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) {
        throw new Error(`Der Server antwortet mit Status ${response.status}.`);
      }
      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error('Die Adresse gehört nicht zu einem LX-Family-Server.');
      }
      setUrl(target);
      setStatus({
        success: true,
        message: `Verbindung steht · LX Family Planner ${data.version || ''}`
      });
    } catch (error) {
      setStatus({
        success: false,
        message:
          error?.message ||
          'Keine Verbindung möglich. Prüfe IP, Domain und Netzwerk.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    try {
      let target = normalizeServerUrl(url);
      if (target === window.location.origin) target = '';
      const saved = setStoredServerUrl(target);
      setStatus(null);
      onSave?.(saved);
      onClose();
    } catch (error) {
      setStatus({
        success: false,
        message: error?.message || 'Die Server-Adresse ist nicht gültig.'
      });
    }
  };

  return (
    <div
      className="server-config-layer"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="server-config-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="server-config-title"
      >
        <header>
          <span className="server-config-mark"><Server size={24} /></span>
          <div>
            <span>Verbindung</span>
            <h2 id="server-config-title">Dein Familien-Server</h2>
            <p>Für Zuhause, NAS oder eure eigene Domain.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Server-Einstellungen schließen"
          >
            <X size={19} />
          </button>
        </header>

        <div className="server-config-content">
          <label htmlFor="server-config-url">Server-Adresse</label>
          <div className="server-config-input">
            <Globe size={18} />
            <input
              id="server-config-url"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              spellCheck="false"
              value={url}
              onChange={event => {
                setUrl(event.target.value);
                setStatus(null);
              }}
              placeholder="https://familie.example.de"
            />
          </div>
          <p>
            Im Heimnetz kannst du zum Beispiel
            <code>192.168.178.50:3001</code> eintragen. Außerhalb des
            Heimnetzes sollte die Adresse immer HTTPS verwenden.
          </p>

          {status && (
            <div
              className={`server-config-status ${
                status.success ? 'is-success' : 'is-error'
              }`}
              role="status"
            >
              {status.success
                ? <Check size={17} />
                : <Wifi size={17} />}
              <span>{status.message}</span>
            </div>
          )}
        </div>

        <footer>
          <button
            type="button"
            className="server-config-test"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? 'Verbindung wird geprüft …' : 'Verbindung testen'}
          </button>
          <div>
            <button
              type="button"
              className="server-config-cancel"
              onClick={onClose}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="server-config-save"
              onClick={handleSave}
              disabled={testing}
            >
              Speichern
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
