import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  FileKey2,
  ShieldCheck,
  Upload
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { plannerApiRequest } from '../../utils/apiConfig';

const MAX_TRANSFER_FILE_SIZE = 20 * 1024 * 1024;

export default function FamilyTransferImport({ onClose }) {
  const { t } = useTranslation('auth');
  const [file, setFile] = useState(null);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectFile = event => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setError('');
  };

  const importFamily = async event => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!file) {
      setError(t('login.familyTransfer.wrongFile'));
      return;
    }
    if (file.size > MAX_TRANSFER_FILE_SIZE) {
      setError(t('login.familyTransfer.tooLarge'));
      return;
    }
    setBusy(true);
    try {
      const content = await file.text();
      const bundle = JSON.parse(content);
      await plannerApiRequest('/api/public/family-transfer/import', {
        method: 'POST',
        body: JSON.stringify({ bundle, passphrase })
      });
      setMessage(t('login.familyTransfer.success'));
      window.setTimeout(() => window.location.reload(), 750);
    } catch (importError) {
      setError(importError instanceof SyntaxError
        ? t('login.familyTransfer.wrongFile')
        : importError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card auth-card-wide family-transfer-import-card">
      <button className="auth-back" type="button" onClick={onClose}>
        <ArrowLeft size={18} /> {t('login.familyTransfer.back')}
      </button>
      <div className="auth-card-heading">
        <div className="auth-icon"><ArrowRightLeft size={24} /></div>
        <div>
          <span className="eyebrow">{t('login.familyTransfer.eyebrow')}</span>
          <h2>{t('login.familyTransfer.title')}</h2>
        </div>
      </div>
      <p className="family-transfer-import-intro">{t('login.familyTransfer.description')}</p>
      <form onSubmit={importFamily}>
        <label className="auth-field family-transfer-file">
          <span>{t('login.familyTransfer.file')}</span>
          <span className="family-transfer-file-control">
            <Upload size={18} />
            <strong>{file?.name || t('login.familyTransfer.file')}</strong>
            <input
              type="file"
              accept=".lxfamily,application/json"
              onChange={selectFile}
            />
          </span>
        </label>
        <label className="auth-field">
          <span>{t('login.familyTransfer.passphrase')}</span>
          <div className="auth-input-wrap">
            <FileKey2 size={18} />
            <input
              type="password"
              autoComplete="current-password"
              value={passphrase}
              onChange={event => setPassphrase(event.target.value)}
              placeholder={t('login.familyTransfer.passphrasePlaceholder')}
            />
          </div>
        </label>
        <p className="family-transfer-import-security"><ShieldCheck size={16} /> {t('login.familyTransfer.security')}</p>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        <button className="auth-primary" disabled={!file || !passphrase || busy} type="submit">
          {busy ? t('login.familyTransfer.importing') : t('login.familyTransfer.import')}
          {!busy && <Upload size={18} />}
        </button>
      </form>
    </div>
  );
}
