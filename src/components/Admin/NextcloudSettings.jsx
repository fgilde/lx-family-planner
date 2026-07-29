import React, { useEffect, useMemo, useState } from 'react';
import {
  ArchiveRestore,
  CalendarDays,
  Check,
  Cloud,
  CloudCog,
  CloudUpload,
  Copy,
  ExternalLink,
  FolderHeart,
  HardDrive,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unplug,
  UsersRound
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import CloudFileBrowser from './CloudFileBrowser';

function suggestedPublicUrl() {
  const url = new URL(window.location.origin);
  const host = url.hostname.toLowerCase();
  const isPrivateIpv4 =
    /^(10\.|192\.168\.|127\.|169\.254\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (
    host !== 'localhost' &&
    !host.endsWith('.local') &&
    !isPrivateIpv4
  ) {
    return '';
  }
  url.port = '8080';
  return url.origin;
}

function relativeTime(timestamp) {
  if (!timestamp) return 'Noch nicht';
  const distance = Date.now() - Number(timestamp);
  if (distance < 60_000) return 'Gerade eben';
  if (distance < 3_600_000) {
    return `Vor ${Math.max(1, Math.round(distance / 60_000))} Min.`;
  }
  if (distance < 86_400_000) {
    return `Vor ${Math.max(1, Math.round(distance / 3_600_000))} Std.`;
  }
  return new Date(timestamp).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

const STAT_LABELS = {
  imported: 'Neu aus Cloud',
  exported: 'Neu in Cloud',
  updatedLocal: 'Lokal erneuert',
  updatedRemote: 'Cloud erneuert',
  deletedLocal: 'Lokal entfernt',
  deletedRemote: 'Cloud entfernt',
  conflicts: 'Konflikte gerettet'
};

export default function NextcloudSettings() {
  const {
    members,
    showToast,
    nextcloudIntegration,
    setupNextcloud,
    setupBundledNextcloud,
    getBundledNextcloudAccess,
    updateNextcloud,
    testNextcloud,
    syncNextcloud,
    backupToNextcloud,
    disconnectNextcloud
  } = useFamily();
  const connected = Boolean(nextcloudIntegration?.connected);
  const [dockerMode, setDockerMode] = useState(true);
  const [form, setForm] = useState({
    baseUrl: 'http://nextcloud',
    publicBaseUrl:
      nextcloudIntegration?.bundledPublicBaseUrl ||
      suggestedPublicUrl(),
    username: '',
    appPassword: '',
    folder: 'LX Family'
  });
  const [settings, setSettings] = useState({
    enabled: true,
    eventSyncEnabled: true,
    eventCalendarHref: '',
    defaultMemberId: 'all',
    includeGrandparents: false,
    backupEnabled: true,
    backupHour: 3,
    folder: 'LX Family',
    publicBaseUrl: suggestedPublicUrl()
  });
  const [busy, setBusy] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [cloudAccess, setCloudAccess] = useState(null);

  const eventCalendars = useMemo(
    () => (nextcloudIntegration?.calendars || []).filter(calendar =>
      calendar.components?.includes('VEVENT')
    ),
    [nextcloudIntegration?.calendars]
  );

  useEffect(() => {
    if (!connected) return;
    setSettings({
      enabled: nextcloudIntegration.enabled !== false,
      eventSyncEnabled:
        nextcloudIntegration.eventSyncEnabled !== false,
      eventCalendarHref:
        nextcloudIntegration.eventCalendarHref || '',
      defaultMemberId:
        nextcloudIntegration.defaultMemberId || 'all',
      includeGrandparents: Boolean(
        nextcloudIntegration.includeGrandparents
      ),
      backupEnabled: Boolean(nextcloudIntegration.backupEnabled),
      backupHour: Number(nextcloudIntegration.backupHour ?? 3),
      folder: nextcloudIntegration.folder || 'LX Family',
      publicBaseUrl:
        nextcloudIntegration.publicBaseUrl || suggestedPublicUrl()
    });
  }, [
    connected,
    nextcloudIntegration?.updatedAt,
    nextcloudIntegration?.eventCalendarHref,
    nextcloudIntegration?.lastSyncAt,
    nextcloudIntegration?.lastBackupAt
  ]);

  useEffect(() => {
    if (connected || !dockerMode) return;
    const configured =
      nextcloudIntegration?.bundledPublicBaseUrl ||
      suggestedPublicUrl();
    if (!configured) return;
    setForm(previous => ({
      ...previous,
      publicBaseUrl: configured
    }));
  }, [
    connected,
    dockerMode,
    nextcloudIntegration?.bundledPublicBaseUrl
  ]);

  const connect = async event => {
    event.preventDefault();
    setBusy('connect');
    const result = dockerMode
      ? await setupBundledNextcloud({
          publicBaseUrl: form.publicBaseUrl,
          folder: form.folder,
          backupHour: 3
        })
      : await setupNextcloud({
          ...form,
          eventSyncEnabled: true,
          backupEnabled: true,
          defaultMemberId: 'all',
          backupHour: 3
        });
    setBusy('');
    if (result) {
      setForm(previous => ({ ...previous, appPassword: '' }));
    }
  };

  const save = async () => {
    setBusy('save');
    await updateNextcloud(settings);
    setBusy('');
  };

  const run = async (kind, action) => {
    setBusy(kind);
    await action();
    setBusy('');
  };

  const disconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setBusy('disconnect');
    await disconnectNextcloud();
    setBusy('');
    setConfirmDisconnect(false);
    setCloudAccess(null);
  };

  const revealCloudAccess = async () => {
    if (cloudAccess) {
      setCloudAccess(null);
      return;
    }
    setBusy('access');
    const access = await getBundledNextcloudAccess();
    setBusy('');
    if (access) setCloudAccess(access);
  };

  const copyAccessValue = async (value, label) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement('textarea');
        field.value = value;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      showToast(
        `${label} kopiert`,
        'Du kannst den Wert jetzt in Nextcloud einfügen.',
        'success'
      );
    } catch {
      showToast(
        'Kopieren nicht möglich',
        'Markiere den Wert bitte direkt im Feld.',
        'warning'
      );
    }
  };

  const settingsUrl = (() => {
    try {
      return `${new URL(form.publicBaseUrl).origin}/index.php/settings/user/security`;
    } catch {
      return '';
    }
  })();

  return (
    <section className="admin-panel nextcloud-settings-panel">
      <header className="nextcloud-heading">
        <div className="nextcloud-orbit" aria-hidden="true">
          <Cloud size={25} />
          <i />
        </div>
        <div>
          <span className="admin-section-kicker">
            Kalender · Dateien · Sicherungen
          </span>
          <h2>Family Cloud</h2>
          <p>
            Verbindet euren Planer mit Nextcloud, ohne Familienkonten oder
            Kinderregeln aus der Hand zu geben.
          </p>
        </div>
        <span className={`nextcloud-state ${connected ? 'online' : ''}`}>
          <i />
          {connected ? 'Verbunden' : 'Bereit zur Einrichtung'}
        </span>
      </header>

      {!connected ? (
        <form className="nextcloud-connect" onSubmit={connect}>
          <div className="nextcloud-mode-picker">
            <button
              type="button"
              className={dockerMode ? 'active' : ''}
              onClick={() => {
                setDockerMode(true);
                setForm(previous => ({
                  ...previous,
                  baseUrl: 'http://nextcloud',
                  publicBaseUrl:
                    nextcloudIntegration?.bundledPublicBaseUrl ||
                    suggestedPublicUrl()
                }));
              }}
            >
              <HardDrive size={18} />
              <span>
                <strong>Mit LX Family Docker</strong>
                <small>Empfohlen für die neue Komplettinstallation</small>
              </span>
              {dockerMode && <Check size={16} />}
            </button>
            <button
              type="button"
              className={!dockerMode ? 'active' : ''}
              onClick={() => setDockerMode(false)}
            >
              <CloudCog size={18} />
              <span>
                <strong>Vorhandene Nextcloud</strong>
                <small>Im Heimnetz oder über eure eigene Domain</small>
              </span>
              {!dockerMode && <Check size={16} />}
            </button>
          </div>

          <div className="nextcloud-security-note">
            <ShieldCheck size={22} />
            <span>
              <strong>
                {dockerMode
                  ? 'Eigenes Cloud-Konto nur für eure Familie'
                  : 'Ein widerrufbares App-Passwort verwenden'}
              </strong>
              {dockerMode
                ? 'LX Family erstellt Konto, Kalender und App-Passwort automatisch. Andere Familien erhalten getrennte Cloud-Bereiche.'
                : 'Dein normales Nextcloud-Passwort wird nicht benötigt. Das App-Passwort liegt verschlüsselt auf eurem LX-Family-Server.'}
            </span>
          </div>

          <div className="nextcloud-form-grid">
            {!dockerMode && (
              <label>
                <span>Adresse für LX Family</span>
                <input
                  value={form.baseUrl}
                  onChange={event => setForm(previous => ({
                    ...previous,
                    baseUrl: event.target.value
                  }))}
                  placeholder="https://cloud.example.de"
                  inputMode="url"
                  required
                />
                <small>Vom LX-Family-Server aus erreichbare Adresse.</small>
              </label>
            )}
            <label>
              <span>Adresse für eure Browser</span>
              <input
                value={form.publicBaseUrl}
                onChange={event => setForm(previous => ({
                  ...previous,
                  publicBaseUrl: event.target.value
                }))}
                placeholder="https://cloud.example.de"
                inputMode="url"
                required
              />
              <small>
                {dockerMode && nextcloudIntegration?.bundledPublicBaseUrl
                  ? 'Vom LX-Server vorgegeben – kein erfundener Port an der Planer-Domain.'
                  : dockerMode
                    ? 'Im Heimnetz meist http://SERVER-IP:8080; öffentlich eine eigene Cloud-Domain ohne Port.'
                    : 'Diese Adresse öffnet später euren Familienordner.'}
              </small>
            </label>
            {!dockerMode && (
              <>
                <label>
                  <span>Nextcloud-Benutzer</span>
                  <input
                    value={form.username}
                    onChange={event => setForm(previous => ({
                      ...previous,
                      username: event.target.value
                    }))}
                    autoComplete="username"
                    placeholder="familie"
                    required
                  />
                </label>
                <label>
                  <span><KeyRound size={14} /> App-Passwort</span>
                  <input
                    type="password"
                    value={form.appPassword}
                    onChange={event => setForm(previous => ({
                      ...previous,
                      appPassword: event.target.value
                    }))}
                    autoComplete="new-password"
                    placeholder="Nur für LX Family erzeugen"
                    required
                  />
                  {settingsUrl && (
                    <a
                      href={settingsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      In Nextcloud erstellen <ExternalLink size={12} />
                    </a>
                  )}
                </label>
              </>
            )}
            <label className="nextcloud-folder-field">
              <span><FolderHeart size={14} /> Familienordner</span>
              <input
                value={form.folder}
                onChange={event => setForm(previous => ({
                  ...previous,
                  folder: event.target.value
                }))}
                placeholder="LX Family"
                required
              />
            </label>
          </div>

          <button
            className="nextcloud-connect-button"
            disabled={Boolean(busy)}
          >
            {busy === 'connect'
              ? <LoaderCircle className="spin" size={18} />
              : <Sparkles size={18} />}
            {busy === 'connect'
              ? 'Family Cloud wird vorbereitet …'
              : dockerMode
                ? 'Family Cloud automatisch einrichten'
                : 'Verbinden & sicher einrichten'}
          </button>
        </form>
      ) : (
        <div className="nextcloud-workspace">
          <div className="nextcloud-account-strip">
            <span className="nextcloud-account-mark">
              <Cloud size={23} />
            </span>
            <span>
              <small>Verbunden als</small>
              <strong>{nextcloudIntegration.displayName}</strong>
              <em>
                {nextcloudIntegration.host}
                {nextcloudIntegration.nextcloudVersion
                  ? ` · Nextcloud ${nextcloudIntegration.nextcloudVersion}`
                  : ''}
              </em>
            </span>
            {nextcloudIntegration.browserFolderUrl && (
              <a
                href={nextcloudIntegration.browserFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FolderHeart size={15} />
                Familienordner
                <ExternalLink size={13} />
              </a>
            )}
          </div>

          <CloudFileBrowser />

          {(nextcloudIntegration.lastSyncError ||
            nextcloudIntegration.lastBackupError) && (
            <div className="nextcloud-error-note" role="status">
              <CloudCog size={18} />
              <span>
                <strong>Family Cloud braucht kurz Aufmerksamkeit</strong>
                {nextcloudIntegration.lastSyncError ||
                  nextcloudIntegration.lastBackupError}
              </span>
            </div>
          )}

          <div className="nextcloud-capability-grid">
            <article>
              <span><CalendarDays size={21} /></span>
              <div>
                <strong>Familienkalender</strong>
                <small>Änderungen laufen sicher in beide Richtungen.</small>
              </div>
              <label className="nextcloud-switch">
                <input
                  type="checkbox"
                  checked={settings.eventSyncEnabled}
                  onChange={event => setSettings(previous => ({
                    ...previous,
                    eventSyncEnabled: event.target.checked
                  }))}
                />
                <i />
              </label>
            </article>
            <article>
              <span><ArchiveRestore size={21} /></span>
              <div>
                <strong>Verschlüsselte Sicherung</strong>
                <small>Jede Familie erhält ihr eigenes Datenarchiv.</small>
              </div>
              <label className="nextcloud-switch">
                <input
                  type="checkbox"
                  checked={settings.backupEnabled}
                  onChange={event => setSettings(previous => ({
                    ...previous,
                    backupEnabled: event.target.checked
                  }))}
                />
                <i />
              </label>
            </article>
          </div>

          <div className="nextcloud-settings-grid">
            <label>
              <span>Nextcloud-Kalender</span>
              <select
                value={settings.eventCalendarHref}
                onChange={event => setSettings(previous => ({
                  ...previous,
                  eventCalendarHref: event.target.value
                }))}
                disabled={!settings.eventSyncEnabled}
              >
                <option value="">Keinen Kalender verbinden</option>
                {eventCalendars.map(calendar => (
                  <option value={calendar.href} key={calendar.href}>
                    {calendar.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Unzugeordnete Cloud-Termine</span>
              <select
                value={settings.defaultMemberId}
                onChange={event => setSettings(previous => ({
                  ...previous,
                  defaultMemberId: event.target.value
                }))}
              >
                <option value="all">Ganze Familie</option>
                {members
                  .filter(member => member.role !== 'pet')
                  .map(member => (
                    <option value={member.id} key={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Familienordner</span>
              <input
                value={settings.folder}
                onChange={event => setSettings(previous => ({
                  ...previous,
                  folder: event.target.value
                }))}
              />
            </label>
            <label>
              <span>Tägliche Sicherung ab</span>
              <select
                value={settings.backupHour}
                onChange={event => setSettings(previous => ({
                  ...previous,
                  backupHour: Number(event.target.value)
                }))}
                disabled={!settings.backupEnabled}
              >
                {[0, 1, 2, 3, 4, 5, 6, 12, 18, 21, 22, 23].map(hour => (
                  <option value={hour} key={hour}>
                    {String(hour).padStart(2, '0')}:00 Uhr
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="nextcloud-grandparents-option">
            <input
              type="checkbox"
              checked={settings.includeGrandparents}
              onChange={event => setSettings(previous => ({
                ...previous,
                includeGrandparents: event.target.checked
              }))}
            />
            <span><UsersRound size={17} /></span>
            <span>
              <strong>„Zuhause Oma & Opa“ ebenfalls synchronisieren</strong>
              Nur einschalten, wenn diese Termine bewusst im gemeinsamen
              Nextcloud-Kalender erscheinen sollen.
            </span>
          </label>

          <div className="nextcloud-pulse-grid">
            <article>
              <span><RefreshCw size={17} /></span>
              <div>
                <small>Letzter Kalenderabgleich</small>
                <strong>{relativeTime(nextcloudIntegration.lastSyncAt)}</strong>
              </div>
            </article>
            <article>
              <span><CloudUpload size={17} /></span>
              <div>
                <small>Letzte Cloud-Sicherung</small>
                <strong>{relativeTime(nextcloudIntegration.lastBackupAt)}</strong>
              </div>
            </article>
          </div>

          {Object.values(nextcloudIntegration.lastSyncStats || {})
            .some(value => Number(value) > 0) && (
            <div className="nextcloud-sync-stats">
              {Object.entries(nextcloudIntegration.lastSyncStats)
                .filter(([, value]) => Number(value) > 0)
                .map(([key, value]) => (
                  <span key={key}>
                    <strong>{value}</strong>
                    {STAT_LABELS[key] || key}
                  </span>
                ))}
            </div>
          )}

          <div className="nextcloud-actions">
            <button
              type="button"
              className="admin-primary-button"
              onClick={save}
              disabled={Boolean(busy)}
            >
              {busy === 'save'
                ? <LoaderCircle className="spin" size={16} />
                : <Check size={16} />}
              Einstellungen speichern
            </button>
            <button
              type="button"
              onClick={() => run('sync', syncNextcloud)}
              disabled={Boolean(busy) || !settings.eventSyncEnabled}
            >
              <RefreshCw
                className={busy === 'sync' ? 'spin' : ''}
                size={16}
              />
              Jetzt abgleichen
            </button>
            <button
              type="button"
              onClick={() => run('backup', backupToNextcloud)}
              disabled={Boolean(busy)}
            >
              <CloudUpload size={16} />
              Jetzt sichern
            </button>
          </div>

          <details className="nextcloud-connection-details">
            <summary>Verbindung verwalten</summary>
            <div>
              {nextcloudIntegration.bundled && (
                <button
                  type="button"
                  onClick={revealCloudAccess}
                  disabled={Boolean(busy)}
                >
                  <KeyRound size={15} />
                  {cloudAccess
                    ? 'Cloud-Zugang ausblenden'
                    : 'Cloud-Zugang anzeigen'}
                </button>
              )}
              <button
                type="button"
                onClick={() => run('test', testNextcloud)}
                disabled={Boolean(busy)}
              >
                <CloudCog size={15} />
                Verbindung & Kalender neu prüfen
              </button>
              <button
                type="button"
                className="danger"
                onClick={disconnect}
                disabled={Boolean(busy)}
              >
                <Unplug size={15} />
                {confirmDisconnect
                  ? 'Wirklich trennen?'
                  : 'Family Cloud trennen'}
              </button>
            </div>
            {cloudAccess && (
              <div className="nextcloud-access-card">
                <span>
                  <strong>Nextcloud-Adresse</strong>
                  <code>{cloudAccess.url}</code>
                </span>
                <span>
                  <strong>Benutzername</strong>
                  <code>{cloudAccess.username}</code>
                  <button
                    type="button"
                    onClick={() => copyAccessValue(
                      cloudAccess.username,
                      'Benutzername'
                    )}
                  >
                    <Copy size={14} />
                    Kopieren
                  </button>
                </span>
                <span>
                  <strong>Passwort</strong>
                  <code>{cloudAccess.password}</code>
                  <button
                    type="button"
                    onClick={() => copyAccessValue(
                      cloudAccess.password,
                      'Passwort'
                    )}
                  >
                    <Copy size={14} />
                    Kopieren
                  </button>
                </span>
                <small>
                  Diese Daten werden nur auf deinen ausdrücklichen Klick
                  geladen und nicht im Browser gespeichert.
                </small>
              </div>
            )}
          </details>
        </div>
      )}
    </section>
  );
}
