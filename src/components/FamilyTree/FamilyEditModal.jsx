import React, { useEffect, useState } from 'react';
import {
  Check,
  Home,
  LockKeyhole,
  ShieldAlert,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { compressImageDataUrl } from '../../utils/imageCompressor';
import { DEFAULT_FAMILY_AVATAR } from '../../utils/imageFallback';

export default function FamilyEditModal({ family, isOpen, onClose }) {
  const { updateFamilyAccount, deleteFamily } = useFamily();
  const [familyName, setFamilyName] = useState('');
  const [badge, setBadge] = useState('');
  const [familyAvatar, setFamilyAvatar] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!family) return;
    setFamilyName(family.familyName || '');
    setBadge(family.badge || '');
    setFamilyAvatar(family.familyAvatar || '');
    setNewPassword('');
    setDeletePassword('');
    setShowDelete(false);
  }, [family, isOpen]);

  if (!isOpen || !family) return null;

  const uploadImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async loadEvent => {
      const compressed = await compressImageDataUrl(
        loadEvent.target.result,
        900,
        540,
        0.72
      );
      setFamilyAvatar(compressed);
    };
    reader.readAsDataURL(file);
  };

  const save = async event => {
    event.preventDefault();
    if (!familyName.trim()) return;
    setBusy(true);
    const payload = {
      familyName: familyName.trim(),
      badge: badge.trim() || 'Unsere Familie',
      familyAvatar
    };
    if (newPassword) payload.password = newPassword;
    const result = await updateFamilyAccount(payload);
    setBusy(false);
    if (result) onClose();
  };

  const removeFamily = async event => {
    event.preventDefault();
    setBusy(true);
    const deleted = await deleteFamily(deletePassword);
    setBusy(false);
    if (deleted) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card family-settings-modal"
        onClick={event => event.stopPropagation()}
      >
        <div className="card-header">
          <div className="family-settings-heading">
            <span><Home size={22} /></span>
            <div>
              <span className="eyebrow">Familienverwaltung</span>
              <h2>Unser Zuhause</h2>
            </div>
          </div>
          <button className="icon-circle-btn" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>

        {!showDelete ? (
          <form onSubmit={save}>
            <div className="family-cover-editor">
              <img src={familyAvatar || DEFAULT_FAMILY_AVATAR} alt="" />
              <label className="auth-secondary">
                <Upload size={17} /> Neues Familienbild
                <input type="file" accept="image/*" onChange={uploadImage} />
              </label>
            </div>

            <label className="auth-field">
              <span>Familienname</span>
              <input
                value={familyName}
                onChange={event => setFamilyName(event.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label className="auth-field">
              <span>Kurzer Zusatz</span>
              <input
                value={badge}
                onChange={event => setBadge(event.target.value)}
                maxLength={60}
                placeholder="z. B. Unser Zuhause"
              />
            </label>
            <label className="auth-field">
              <span>Neues Familienpasswort (optional)</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={18} />
                <input
                  value={newPassword}
                  onChange={event => setNewPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={4}
                  placeholder="Leer lassen = unverändert"
                />
              </div>
            </label>

            <div className="modal-actions family-settings-actions">
              <button className="auth-primary" disabled={busy}>
                <Check size={17} /> {busy ? 'Speichert …' : 'Änderungen speichern'}
              </button>
              <button
                type="button"
                className="family-danger-link"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 size={16} /> Familienkonto löschen
              </button>
            </div>
          </form>
        ) : (
          <form className="family-delete-panel" onSubmit={removeFamily}>
            <span className="family-delete-icon"><ShieldAlert size={28} /></span>
            <h3>Familienkonto endgültig löschen?</h3>
            <p>
              Dabei werden Profile, Termine, Aufgaben und alle weiteren
              Familieninhalte entfernt. Diese Aktion lässt sich nicht rückgängig
              machen.
            </p>
            <label className="auth-field">
              <span>Zur Bestätigung das Familienpasswort eingeben</span>
              <input
                value={deletePassword}
                onChange={event => setDeletePassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                autoFocus
                required
              />
            </label>
            <div className="modal-actions">
              <button
                className="family-delete-confirm"
                disabled={!deletePassword || busy}
              >
                <Trash2 size={16} />
                {busy ? 'Wird gelöscht …' : 'Familie endgültig löschen'}
              </button>
              <button
                type="button"
                className="auth-secondary"
                onClick={() => setShowDelete(false)}
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
