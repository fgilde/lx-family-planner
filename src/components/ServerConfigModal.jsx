import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Check, Globe, Server, Wifi, X } from 'lucide-react';
import {
  DEFAULT_SERVER_URL,
  getStoredServerUrl,
  normalizeServerUrl,
  setStoredServerUrl
} from '../utils/apiConfig';

export default function ServerConfigModal({ isOpen, onClose, onSave }) {
  const { t } = useTranslation('chrome');
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
        throw new Error(t('serverConfig.errors.emptyUrl'));
      }
      const response = await fetch(`${target}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) {
        throw new Error(t('serverConfig.errors.badStatus', { status: response.status }));
      }
      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error(t('serverConfig.errors.notLxServer'));
      }
      setUrl(target);
      setStatus({
        success: true,
        message: t('serverConfig.connected', { version: data.version || '' })
      });
    } catch (error) {
      setStatus({
        success: false,
        message:
          error?.message ||
          t('serverConfig.errors.noConnection')
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
        message: error?.message || t('serverConfig.errors.invalidUrl')
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
            <span>{t('serverConfig.kicker')}</span>
            <h2 id="server-config-title">{t('serverConfig.title')}</h2>
            <p>{t('serverConfig.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('serverConfig.close')}
          >
            <X size={19} />
          </button>
        </header>

        <div className="server-config-content">
          <label htmlFor="server-config-url">{t('serverConfig.urlLabel')}</label>
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
              placeholder={t('serverConfig.urlPlaceholder')}
            />
          </div>
          <p>
            <Trans
              t={t}
              i18nKey="serverConfig.hint"
              components={{ code: <code /> }}
            />
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
            {testing ? t('serverConfig.testing') : t('serverConfig.test')}
          </button>
          <div>
            <button
              type="button"
              className="server-config-cancel"
              onClick={onClose}
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="button"
              className="server-config-save"
              onClick={handleSave}
              disabled={testing}
            >
              {t('common:actions.save')}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
