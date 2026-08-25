import React, { useState } from 'react';
import { Cloud, KeyRound, Link2, LoaderCircle, Trash2 } from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { plannerApiRequest } from '../../utils/apiConfig';

export default function WebDavSettings() {
  const { webdavIntegration: existing, refreshBootstrap, showToast } = useFamily();
  const [form, setForm] = useState({
    baseUrl: existing?.baseUrl || '',
    username: '',
    password: '',
    folder: existing?.folder || 'LX Family'
  });
  const [busy, setBusy] = useState(false);

  const connect = async event => {
    event.preventDefault();
    setBusy(true);
    try {
      await plannerApiRequest('/api/integrations/webdav/setup', {
        method: 'POST', body: JSON.stringify(form)
      });
      await refreshBootstrap({ silent: true });
      setForm(previous => ({ ...previous, password: '' }));
      showToast('WebDAV verbunden', 'Euer Familienarchiv nutzt jetzt diesen WebDAV-Ordner.', 'success');
    } catch (error) {
      showToast('WebDAV konnte nicht verbunden werden', error.message, 'error');
    } finally { setBusy(false); }
  };

  const test = async () => {
    setBusy(true);
    try {
      const data = await plannerApiRequest('/api/integrations/webdav/test', { method: 'POST' });
      showToast('WebDAV erreichbar', data.message, 'success');
    } catch (error) {
      showToast('WebDAV-Test fehlgeschlagen', error.message, 'error');
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!window.confirm('WebDAV-Verbindung trennen? Die Dateien auf dem Server bleiben erhalten.')) return;
    setBusy(true);
    try {
      await plannerApiRequest('/api/integrations/webdav', { method: 'DELETE' });
      await refreshBootstrap({ silent: true });
      showToast('WebDAV getrennt', 'Die Zugangsdaten wurden von LX entfernt.', 'info');
    } catch (error) {
      showToast('WebDAV konnte nicht getrennt werden', error.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <section className="admin-panel nextcloud-settings-panel webdav-settings-panel">
      <header className="nextcloud-heading">
        <div className="nextcloud-orbit"><Cloud size={23} /></div>
        <div><span className="admin-section-kicker">EIGENE CLOUD</span><h2>WebDAV-Familienarchiv</h2><p>Für NAS und DAV-Server ohne Nextcloud.</p></div>
        <span className={`nextcloud-state ${existing?.connected ? 'online' : ''}`}>{existing?.connected ? 'Verbunden' : 'Bereit'}</span>
      </header>
      {existing?.connected ? (
        <div className="nextcloud-workspace">
          <div className="nextcloud-account-strip"><span className="nextcloud-account-mark"><Cloud size={18} /></span><div><small>Verbunden mit</small><strong>{existing.displayName || 'WebDAV'}</strong><span>{existing.host} · Ordner: {existing.folder}</span></div></div>
          <div className="nextcloud-connected-actions"><button type="button" onClick={test} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Link2 size={16} />} Verbindung prüfen</button><button type="button" className="danger" onClick={disconnect} disabled={busy}><Trash2 size={16} /> Trennen</button></div>
        </div>
      ) : (
        <form className="nextcloud-connect" onSubmit={connect}>
          <div className="nextcloud-security-note"><KeyRound size={18} /><p>Nutze wenn möglich ein eigenes App-Passwort. Für einen NAS im Heimnetz muss auf dem LX-Server zusätzlich <code>WEBDAV_ALLOW_PRIVATE_HOSTS=true</code> gesetzt sein.</p></div>
          <div className="nextcloud-form-grid">
            <label><span>WebDAV-Adresse</span><input type="url" required value={form.baseUrl} onChange={event => setForm({ ...form, baseUrl: event.target.value })} placeholder="https://nas.example.de/dav/" /></label>
            <label><span>Familienordner</span><input required value={form.folder} onChange={event => setForm({ ...form, folder: event.target.value })} placeholder="LX Family" /></label>
            <label><span>Benutzername</span><input required autoComplete="username" value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} /></label>
            <label><span>App-Passwort</span><input required type="password" autoComplete="current-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>
          </div>
          <button className="nextcloud-connect-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Link2 size={17} />} WebDAV verbinden</button>
        </form>
      )}
    </section>
  );
}
