import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Download,
  FileKey2,
  ShieldCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { plannerApiRequest } from '../../utils/apiConfig';

function downloadTransfer(bundle, fileName) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function FamilyTransferSettings() {
  const { t } = useTranslation('adminCloud');
  const [familyPassword, setFamilyPassword] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const exportFamily = async () => {
    setError('');
    setMessage('');
    if (passphrase.length < 12) {
      setError(t('familyTransfer.passphraseTooShort'));
      return;
    }
    if (passphrase !== passphraseConfirm) {
      setError(t('familyTransfer.passphraseMismatch'));
      return;
    }
    setBusy(true);
    try {
      const data = await plannerApiRequest('/api/family-transfer/export', {
        method: 'POST',
        body: JSON.stringify({ familyPassword, passphrase })
      });
      downloadTransfer(data.bundle, data.fileName);
      setFamilyPassword('');
      setPassphrase('');
      setPassphraseConfirm('');
      setMessage(t('familyTransfer.exported'));
    } catch (exportError) {
      setError(exportError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel family-transfer-panel">
      <header className="admin-panel-header">
        <div>
          <span className="admin-section-kicker">{t('familyTransfer.kicker')}</span>
          <h2><ArrowRightLeft size={22} /> {t('familyTransfer.title')}</h2>
        </div>
        <span className="family-transfer-badge"><ShieldCheck size={15} /> {t('familyTransfer.badge')}</span>
      </header>
      <p className="admin-panel-intro">{t('familyTransfer.intro')}</p>

      <aside className="family-transfer-note">
        <FileKey2 size={20} />
        <div>
          <strong>{t('familyTransfer.noteTitle')}</strong>
          <p>{t('familyTransfer.noteBody')}</p>
        </div>
      </aside>

      <div className="family-transfer-grid">
        <label>
          <span>{t('familyTransfer.familyPassword')}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={familyPassword}
            onChange={event => setFamilyPassword(event.target.value)}
          />
        </label>
        <label>
          <span>{t('familyTransfer.passphrase')}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={passphrase}
            onChange={event => setPassphrase(event.target.value)}
            placeholder={t('familyTransfer.passphrasePlaceholder')}
          />
        </label>
        <label>
          <span>{t('familyTransfer.passphraseConfirm')}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={passphraseConfirm}
            onChange={event => setPassphraseConfirm(event.target.value)}
          />
        </label>
      </div>

      {error && <p className="database-backup-error">{error}</p>}
      {message && <p className="database-backup-message"><ShieldCheck size={16} /> {message}</p>}

      <button
        type="button"
        className="btn-primary family-transfer-download"
        disabled={busy || !familyPassword || !passphrase || !passphraseConfirm}
        onClick={exportFamily}
      >
        <Download size={17} />
        {busy ? t('familyTransfer.exporting') : t('familyTransfer.export')}
      </button>
      <p className="family-transfer-footnote">{t('familyTransfer.footnote')}</p>
    </section>
  );
}
