import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  DatabaseBackup,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { plannerApiRequest } from '../../utils/apiConfig';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function formattedSize(bytes) {
  const value = Math.max(0, Number(bytes || 0));
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function DatabaseBackupSettings() {
  const { t, i18n } = useTranslation('adminCloud');
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [restoreFile, setRestoreFile] = useState('');
  const [familyPassword, setFamilyPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await plannerApiRequest('/api/admin/database-backups');
      setStatus(data);
      setSettings(data.settings);
      setError('');
    } catch (loadError) {
      if (loadError?.status === 403) {
        setStatus({ owner: false });
        return;
      }
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (status?.owner === false) return null;
  if (!status || !settings) {
    return error ? null : (
      <section className="admin-panel database-backup-panel is-loading">
        <RefreshCw className="spin" size={22} />
        <span>{t('databaseBackup.loading')}</span>
      </section>
    );
  }

  const run = async (key, action) => {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusy('');
    }
  };

  const saveSettings = () => run('settings', async () => {
    const data = await plannerApiRequest(
      '/api/admin/database-backups/settings',
      { method: 'PUT', body: JSON.stringify(settings) }
    );
    setSettings(data.settings);
    setStatus(previous => ({ ...previous, settings: data.settings }));
    setMessage(t('databaseBackup.saved'));
  });

  const createBackup = () => run('create', async () => {
    const data = await plannerApiRequest('/api/admin/database-backups', {
      method: 'POST'
    });
    setStatus(data);
    setSettings(data.settings);
    setMessage(t('databaseBackup.created'));
  });

  const restore = () => run('restore', async () => {
    await plannerApiRequest('/api/admin/database-backups/restore', {
      method: 'POST',
      body: JSON.stringify({
        fileName: restoreFile,
        familyPassword,
        confirmation
      })
    });
    setMessage(t('databaseBackup.restoreRestarting'));
    setFamilyPassword('');
    setConfirmation('');
    window.setTimeout(() => {
      const check = window.setInterval(async () => {
        try {
          await plannerApiRequest('/api/config');
          window.clearInterval(check);
          window.location.reload();
        } catch {
          // Der kontrollierte Neustart läuft noch.
        }
      }, 2_000);
    }, 2_500);
  });

  return (
    <section className="admin-panel database-backup-panel">
      <header className="admin-panel-header">
        <div>
          <span className="admin-section-kicker">{t('databaseBackup.kicker')}</span>
          <h2><DatabaseBackup size={22} /> {t('databaseBackup.title')}</h2>
        </div>
        <span className="database-backup-owner-badge">
          <ShieldCheck size={15} /> {t('databaseBackup.ownerBadge')}
        </span>
      </header>

      <p className="admin-panel-intro">{t('databaseBackup.intro')}</p>

      <div className="database-backup-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={createBackup}
          disabled={Boolean(busy)}
        >
          <DatabaseBackup size={17} />
          {busy === 'create'
            ? t('databaseBackup.creating')
            : t('databaseBackup.createNow')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={load}
          disabled={Boolean(busy)}
        >
          <RefreshCw size={16} /> {t('databaseBackup.refresh')}
        </button>
      </div>

      <div className="database-backup-schedule">
        <label className="integration-toggle-row">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={event => setSettings(previous => ({
              ...previous,
              enabled: event.target.checked
            }))}
          />
          <span>
            <strong>{t('databaseBackup.scheduleEnabled')}</strong>
            <small>{t('databaseBackup.scheduleHint')}</small>
          </span>
        </label>
        <div className="database-backup-schedule-grid">
          <label>
            <span>{t('databaseBackup.frequency')}</span>
            <select
              value={settings.frequency}
              disabled={!settings.enabled}
              onChange={event => setSettings(previous => ({
                ...previous,
                frequency: event.target.value
              }))}
            >
              <option value="daily">{t('databaseBackup.daily')}</option>
              <option value="weekly">{t('databaseBackup.weekly')}</option>
            </select>
          </label>
          {settings.frequency === 'weekly' && (
            <label>
              <span>{t('databaseBackup.weekday')}</span>
              <select
                value={settings.dayOfWeek}
                disabled={!settings.enabled}
                onChange={event => setSettings(previous => ({
                  ...previous,
                  dayOfWeek: Number(event.target.value)
                }))}
              >
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>
                    {t(`databaseBackup.days.${day}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{t('databaseBackup.hour')}</span>
            <select
              value={settings.hour}
              disabled={!settings.enabled}
              onChange={event => setSettings(previous => ({
                ...previous,
                hour: Number(event.target.value)
              }))}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('databaseBackup.retention')}</span>
            <input
              type="number"
              min="1"
              max="52"
              value={settings.keep}
              onChange={event => setSettings(previous => ({
                ...previous,
                keep: Number(event.target.value)
              }))}
            />
          </label>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={saveSettings}
          disabled={Boolean(busy)}
        >
          <Save size={16} /> {t('databaseBackup.saveSchedule')}
        </button>
      </div>

      {settings.lastBackupAt > 0 && (
        <p className="database-backup-last-run">
          {t('databaseBackup.lastBackup', {
            date: new Date(settings.lastBackupAt).toLocaleString(i18n.language)
          })}
        </p>
      )}
      {settings.lastError && (
        <p className="database-backup-error"><AlertTriangle size={16} /> {settings.lastError}</p>
      )}
      {error && <p className="database-backup-error"><AlertTriangle size={16} /> {error}</p>}
      {message && <p className="database-backup-message"><ShieldCheck size={16} /> {message}</p>}

      <div className="database-backup-list">
        <h3>{t('databaseBackup.available')}</h3>
        {!status.backups.length ? (
          <p>{t('databaseBackup.empty')}</p>
        ) : status.backups.map(backup => (
          <article key={backup.fileName} className={!backup.verified ? 'is-invalid' : ''}>
            <span>
              <strong>{new Date(backup.createdAt).toLocaleString(i18n.language)}</strong>
              <small>{formattedSize(backup.size)} · {backup.fileName}</small>
            </span>
            <b>
              {backup.verified
                ? t('databaseBackup.verified')
                : t('databaseBackup.invalid')}
            </b>
            <button
              type="button"
              className="btn-secondary"
              disabled={Boolean(busy) || !backup.verified}
              onClick={() => setRestoreFile(
                restoreFile === backup.fileName ? '' : backup.fileName
              )}
            >
              <RotateCcw size={15} /> {t('databaseBackup.restore')}
            </button>
          </article>
        ))}
      </div>

      {restoreFile && (
        <div className="database-backup-restore">
          <AlertTriangle size={22} />
          <div>
            <strong>{t('databaseBackup.restoreTitle')}</strong>
            <p>{t('databaseBackup.restoreWarning')}</p>
            <label>
              <span>{t('databaseBackup.familyPassword')}</span>
              <input
                type="password"
                value={familyPassword}
                autoComplete="current-password"
                onChange={event => setFamilyPassword(event.target.value)}
              />
            </label>
            <label>
              <span>{t('databaseBackup.confirmation')}</span>
              <input
                value={confirmation}
                placeholder="WIEDERHERSTELLEN"
                onChange={event => setConfirmation(event.target.value)}
              />
            </label>
            <div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setRestoreFile('')}
                disabled={Boolean(busy)}
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={restore}
                disabled={
                  Boolean(busy) ||
                  !familyPassword ||
                  confirmation !== 'WIEDERHERSTELLEN'
                }
              >
                <RotateCcw size={16} />
                {busy === 'restore'
                  ? t('databaseBackup.restoring')
                  : t('databaseBackup.restoreConfirmed')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
