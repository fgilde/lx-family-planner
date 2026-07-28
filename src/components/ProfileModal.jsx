import React, { useEffect, useRef, useState } from 'react';
import {
  BellOff,
  BellRing,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Edit3,
  KeyRound,
  Lock,
  PawPrint,
  Plus,
  Star,
  Send,
  Trash2,
  Upload,
  UserRound,
  X
} from 'lucide-react';
import { FUNNY_COMIC_AVATARS, useFamily } from '../context/FamilyContext';
import { compressImageDataUrl } from '../utils/imageCompressor';
import {
  POSITION_OPTIONS,
  canManageFamily,
  getPositionLabel,
  isManagedProfile,
  isPetProfile,
  roleForPosition
} from '../constants/roles';
import { DEFAULT_FAMILY_AVATAR, handleImgError } from '../utils/imageFallback';
import { NOTIFICATION_EVENT_DEFINITIONS } from '../../shared/notificationEvents';

const COLOR_PRESETS = [
  '#246B58',
  '#E06B4F',
  '#E0A52E',
  '#3767A6',
  '#8A5BB7',
  '#D45D87',
  '#138A9D'
];

const EMPTY_FORM = {
  name: '',
  position: 'kind',
  role: 'child',
  color: '#E0A52E',
  avatar: FUNNY_COMIC_AVATARS[0]?.url || '',
  pin: '',
  isManaged: false
};

const PROFILE_NOTIFICATION_RULES =
  NOTIFICATION_EVENT_DEFINITIONS.map(({ key, title }) => [key, title]);

export default function ProfileModal() {
  const {
    members,
    addMember,
    updateMember,
    deleteMember,
    activeMemberId,
    setActiveMemberId,
    activeMember,
    webPush,
    enableWebPush,
    disableWebPush,
    updateWebPushPreferences,
    testWebPush,
    isProfileModalOpen,
    setIsProfileModalOpen,
    showToast
  } = useFamily();
  const [mode, setMode] = useState('list');
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pinTarget, setPinTarget] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [profileSecretType, setProfileSecretType] = useState('pin');
  const [busy, setBusy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const modalBodyRef = useRef(null);

  useEffect(() => {
    if (!isProfileModalOpen) return undefined;

    setMode('list');
    setPinTarget(null);
    setPinInput('');
    setShowNotifications(false);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      modalBodyRef.current?.scrollTo({ top: 0 });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [isProfileModalOpen]);

  if (!isProfileModalOpen) return null;

  const canManage = canManageFamily(activeMember);
  const selectableMembers = members.filter(member => !isManagedProfile(member));
  const managedMembers = members.filter(isManagedProfile);
  const currentPushDevice = webPush.devices.find(
    device => device.id === webPush.currentDeviceId
  );
  const pushPreferences = {
    ...webPush.defaults,
    ...(currentPushDevice?.preferences || {})
  };
  const notificationsEnabled = Boolean(webPush.currentDeviceId);
  const activeProfileIsPet = isPetProfile(activeMember);
  const close = () => {
    setMode('list');
    setPinTarget(null);
    setShowNotifications(false);
    setIsProfileModalOpen(false);
  };

  const selectProfile = async member => {
    if (member.id === activeMemberId) {
      close();
      return;
    }
    if (
      member.hasPin ||
      (canManageFamily(member) && !canManageFamily(activeMember))
    ) {
      setPinTarget(member);
      setPinInput('');
      setProfileSecretType(member.hasPin ? 'pin' : 'family-password');
      return;
    }
    setBusy(true);
    try {
      await setActiveMemberId(member.id);
      showToast('Profil gewechselt', `Hallo ${member.name}!`, 'success');
      close();
    } catch (error) {
      showToast('Profil gesperrt', error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const verifyPin = async event => {
    event.preventDefault();
    if (!pinTarget) return;
    setBusy(true);
    try {
      await setActiveMemberId(
        pinTarget.id,
        profileSecretType === 'pin' ? pinInput : '',
        profileSecretType === 'family-password' ? pinInput : ''
      );
      showToast('Profil gewechselt', `Hallo ${pinTarget.name}!`, 'success');
      close();
    } catch (error) {
      showToast('PIN nicht korrekt', error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const beginAdd = (isManaged = false) => {
    setEditingMemberId(null);
    setForm({ ...EMPTY_FORM, isManaged });
    setShowNotifications(false);
    setMode('form');
  };

  const beginEdit = (member, event) => {
    event.stopPropagation();
    if (!canManage && member.id !== activeMemberId) return;
    setEditingMemberId(member.id);
    setForm({
      name: member.name,
      position: member.position || 'familienmitglied',
      role: member.role || 'member',
      color: member.color || COLOR_PRESETS[0],
      avatar: member.avatar || FUNNY_COMIC_AVATARS[0]?.url || '',
      pin: '',
      isManaged: isManagedProfile(member)
    });
    setShowNotifications(false);
    setMode('form');
  };

  const updateForm = changes => setForm(previous => ({ ...previous, ...changes }));

  const handlePosition = position => {
    const role = roleForPosition(position);
    updateForm({
      position,
      role,
      theme: role === 'child' ? 'adventure' : 'light',
      ...(role === 'pet' ? { isManaged: false } : {})
    });
  };

  const handleUpload = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async loadEvent => {
      const compressed = await compressImageDataUrl(
        loadEvent.target.result,
        320,
        320,
        0.72
      );
      updateForm({ avatar: compressed });
    };
    reader.readAsDataURL(file);
  };

  const save = async event => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const avatar = await compressImageDataUrl(form.avatar, 320, 320, 0.72);
      const payload = {
        ...form,
        name: form.name.trim(),
        avatar,
        pin: form.pin || undefined
      };
      if (editingMemberId) {
        await updateMember(editingMemberId, payload);
        showToast('Profil aktualisiert', `${payload.name} ist gespeichert.`, 'success');
      } else {
        await addMember(payload);
      }
      setMode('list');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editingMemberId) return;
    if (!window.confirm('Dieses Familienprofil wirklich löschen?')) return;
    setBusy(true);
    await deleteMember(editingMemberId);
    setBusy(false);
    setMode('list');
  };

  return (
    <div className="modal-backdrop profile-modal-backdrop" onClick={close}>
      <div
        className="modal-card profile-modal-modern"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <div className="card-header profile-modal-header">
          <div>
            <span className="eyebrow">
              {pinTarget
                ? 'Geschütztes Profil'
                : mode === 'form'
                  ? editingMemberId
                    ? 'Profil bearbeiten'
                    : 'Neues Profil'
                  : 'Eure Familie'}
            </span>
            <h2 className="card-title" id="profile-modal-title">
              <UserRound size={23} />
              {pinTarget
                ? `${pinTarget.name} entsperren`
                : mode === 'form'
                  ? editingMemberId
                    ? 'Profil bearbeiten'
                    : 'Profil anlegen'
                  : 'Wer ist gerade dran?'}
            </h2>
          </div>
          <button
            type="button"
            className="icon-circle-btn"
            onClick={close}
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        <div className="profile-modal-body" ref={modalBodyRef}>
          {pinTarget ? (
          <form className="profile-pin-panel" onSubmit={verifyPin}>
            <div className="profile-pin-icon"><Lock size={26} /></div>
            <h3>{pinTarget.name}s Profil ist geschützt</h3>
            <p>
              {profileSecretType === 'pin'
                ? 'Gib die persönliche Profil-PIN ein.'
                : activeProfileIsPet
                  ? 'Für den Wechsel aus einem Haustierprofil wird das Familienpasswort benötigt.'
                  : 'Für den Wechsel aus einem Kinderprofil wird das Familienpasswort benötigt.'}
            </p>
            <div className="auth-input-wrap">
              <KeyRound size={18} />
              <input
                value={pinInput}
                onChange={event => setPinInput(event.target.value)}
                type="password"
                autoComplete={
                  profileSecretType === 'pin'
                    ? 'one-time-code'
                    : 'current-password'
                }
                inputMode={profileSecretType === 'pin' ? 'numeric' : undefined}
                maxLength={profileSecretType === 'pin' ? 12 : 128}
                placeholder={
                  profileSecretType === 'pin'
                    ? 'Profil-PIN'
                    : 'Familienpasswort'
                }
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="auth-primary" disabled={busy || !pinInput}>
                Entsperren
              </button>
              <button
                className="auth-secondary"
                type="button"
                onClick={() => setPinTarget(null)}
              >
                Abbrechen
              </button>
            </div>
          </form>
          ) : mode === 'list' ? (
          <>
            <p className="profile-switch-intro">
              Tippe auf ein Profil, um direkt in seine persönliche Familienwelt
              zu wechseln.
            </p>
            <div className="profile-switch-grid" role="list">
              {selectableMembers.map((member, index) => {
                const isActive = member.id === activeMemberId;
                const canEdit = canManage || member.id === activeMemberId;
                return (
                  <div
                    key={member.id}
                    className={`profile-switch-card ${
                      isPetProfile(member) ? 'pet' : ''
                    } ${isActive ? 'active' : ''}`}
                    style={{
                      '--member-color': member.color || '#246B58',
                      '--profile-index': index
                    }}
                    role="listitem"
                  >
                  <button
                    type="button"
                    className="profile-switch-target"
                    onClick={() => selectProfile(member)}
                    disabled={busy}
                    aria-label={`${member.name}, ${getPositionLabel(member)} auswählen`}
                  >
                    <span className="profile-switch-avatar">
                      <img
                        src={member.avatar || DEFAULT_FAMILY_AVATAR}
                        onError={handleImgError}
                        alt=""
                      />
                      {isActive && (
                        <span className="profile-active-check" aria-label="Aktives Profil">
                          <Check size={16} strokeWidth={3} />
                        </span>
                      )}
                      {member.hasPin && (
                        <span className="profile-lock-badge" aria-label="Mit PIN geschützt">
                          <Lock size={13} />
                        </span>
                      )}
                    </span>
                    <strong>{member.name}</strong>
                    <span className="profile-switch-role">
                      {getPositionLabel(member)}
                    </span>
                    {member.role === 'child' && (
                      <span className="profile-switch-stars">
                        <Star size={13} fill="currentColor" /> {member.stars || 0}
                      </span>
                    )}
                    {isPetProfile(member) && (
                      <span className="profile-switch-pet">
                        <PawPrint size={13} /> Pfotenprofil
                      </span>
                    )}
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      className="profile-switch-edit"
                      onClick={event => beginEdit(member, event)}
                      aria-label={`${member.name} bearbeiten`}
                      title={`${member.name} bearbeiten`}
                    >
                      <Edit3 size={15} />
                    </button>
                  )}
                </div>
                );
              })}
            </div>

            {canManage && managedMembers.length > 0 && (
              <section className="managed-profile-section">
                <header>
                  <span className="managed-profile-heading-icon">
                    <ClipboardList size={19} />
                  </span>
                  <div>
                    <strong>Von euch verwaltet</strong>
                    <small>
                      Ohne Anmeldung · für Termine und Aufgaben
                    </small>
                  </div>
                  <span className="managed-profile-count">
                    {managedMembers.length}
                  </span>
                </header>
                <div className="managed-profile-list">
                  {managedMembers.map(member => (
                    <article
                      key={member.id}
                      style={{ '--member-color': member.color || '#246B58' }}
                    >
                      <img
                        src={member.avatar || DEFAULT_FAMILY_AVATAR}
                        onError={handleImgError}
                        alt=""
                      />
                      <span>
                        <strong>{member.name}</strong>
                        <small>
                          {getPositionLabel(member)} · kein eigener Zugang
                        </small>
                      </span>
                      <span className="managed-profile-capabilities">
                        <i title="Termine"><CalendarDays size={14} /></i>
                        <i title="Aufgaben"><ClipboardList size={14} /></i>
                      </span>
                      <button
                        type="button"
                        onClick={event => beginEdit(member, event)}
                        aria-label={`${member.name} bearbeiten`}
                        title={`${member.name} bearbeiten`}
                      >
                        <Edit3 size={15} />
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <div className={`profile-tools ${activeProfileIsPet ? 'pet-active' : ''}`}>
              {!activeProfileIsPet && (
                <button
                  type="button"
                  className="profile-tool-button"
                  aria-expanded={showNotifications}
                  aria-controls="profile-notification-settings"
                  onClick={() => setShowNotifications(value => !value)}
                >
                  <span className="profile-tool-icon">
                    {notificationsEnabled ? <BellRing size={19} /> : <BellOff size={19} />}
                  </span>
                  <span className="profile-tool-copy">
                    <strong>Benachrichtigungen</strong>
                    <small>
                      Für {activeMember?.name} auf diesem Gerät
                    </small>
                  </span>
                  <ChevronDown
                    className={showNotifications ? 'open' : ''}
                    size={18}
                  />
                </button>
              )}
              {activeProfileIsPet && (
                <div className="profile-pet-mode-note">
                  <PawPrint size={19} />
                  <span>
                    <strong>Haustiermodus aktiv</strong>
                    <small>Ohne Chat, Meldungen und Kontofunktionen</small>
                  </span>
                </div>
              )}
              {canManage && (
                <button
                  type="button"
                  className="auth-secondary profile-add"
                  onClick={() => beginAdd(false)}
                >
                  <Plus size={18} /> Mitglied hinzufügen
                </button>
              )}
            </div>

            {!activeProfileIsPet && showNotifications && (
              <section
                className="profile-notification-settings"
                id="profile-notification-settings"
              >
              <div className="profile-notification-heading">
                <span className="profile-notification-icon">
                  {notificationsEnabled ? <BellRing size={20} /> : <BellOff size={20} />}
                </span>
                <div>
                  <strong>Benachrichtigungen für {activeMember?.name}</strong>
                  <small>
                    Diese Auswahl wird für dieses Profil und dieses Gerät gespeichert.
                  </small>
                </div>
                <button
                  type="button"
                  className={`profile-notification-switch ${
                    notificationsEnabled ? 'active' : ''
                  }`}
                  role="switch"
                  aria-checked={notificationsEnabled}
                  disabled={Boolean(webPush.busy) || !webPush.supported}
                  onClick={() =>
                    notificationsEnabled ? disableWebPush() : enableWebPush()
                  }
                >
                  <span />
                  {notificationsEnabled ? 'An' : 'Aus'}
                </button>
              </div>

              {!webPush.supported && (
                <p className="profile-notification-note">{webPush.message}</p>
              )}
              {webPush.permission === 'denied' && (
                <p className="profile-notification-note warning">
                  Der Browser blockiert Meldungen. Bitte erlaube sie einmal in den
                  Website-Einstellungen des Browsers.
                </p>
              )}

              {notificationsEnabled && (
                <>
                  <div className="profile-notification-options">
                    {PROFILE_NOTIFICATION_RULES.map(([key, label]) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={Boolean(pushPreferences[key])}
                          disabled={Boolean(webPush.busy)}
                          onChange={event =>
                            updateWebPushPreferences({
                              [key]: event.target.checked
                            })
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(pushPreferences.showPreviews)}
                        disabled={Boolean(webPush.busy)}
                        onChange={event =>
                          updateWebPushPreferences({
                            showPreviews: event.target.checked
                          })
                        }
                      />
                      <span>Inhalt in Meldungen zeigen</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="profile-notification-test"
                    disabled={Boolean(webPush.busy)}
                    onClick={testWebPush}
                  >
                    <Send size={15} /> Testmeldung senden
                  </button>
                </>
              )}
              </section>
            )}
          </>
          ) : (
          <form className="profile-editor-modern" onSubmit={save}>
            <div className="profile-editor-preview">
              <img src={form.avatar || DEFAULT_FAMILY_AVATAR} alt="" />
              <strong>{form.name || 'Neues Profil'}</strong>
              <span>
                {POSITION_OPTIONS.find(option => option.value === form.position)?.emoji}{' '}
                {POSITION_OPTIONS.find(option => option.value === form.position)?.label}
              </span>
            </div>

            <div className="profile-editor-fields">
              {canManage && form.role !== 'pet' && (
                <fieldset className="profile-access-choice">
                  <legend className="form-label">Wie wird das Profil genutzt?</legend>
                  <label className={!form.isManaged ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="profile-access"
                      checked={!form.isManaged}
                      onChange={() => updateForm({ isManaged: false })}
                      disabled={editingMemberId === activeMemberId}
                    />
                    <span className="profile-access-icon"><UserRound size={19} /></span>
                    <span>
                      <strong>Mit eigener Anmeldung</strong>
                      <small>
                        Erscheint beim Profilwechsel und kann den Planer selbst öffnen.
                      </small>
                    </span>
                  </label>
                  <label className={form.isManaged ? 'selected managed' : ''}>
                    <input
                      type="radio"
                      name="profile-access"
                      checked={form.isManaged}
                      onChange={() => updateForm({ isManaged: true, pin: '' })}
                      disabled={editingMemberId === activeMemberId}
                    />
                    <span className="profile-access-icon"><ClipboardList size={19} /></span>
                    <span>
                      <strong>Nur von uns verwaltet</strong>
                      <small>
                        Für Oma, Opa oder betreute Personen ohne eigenen Zugang.
                      </small>
                    </span>
                  </label>
                </fieldset>
              )}
              {form.isManaged && (
                <div className="managed-profile-editor-note">
                  <CalendarDays size={20} />
                  <span>
                    <strong>Organisationsprofil ohne Anmeldung</strong>
                    <small>
                      Das Profil erscheint in Kalendern und Aufgaben, aber nicht
                      bei der Anmeldung, im Profilwechsel oder im Chat.
                    </small>
                  </span>
                </div>
              )}
              {form.role === 'pet' && (
                <div className="pet-profile-editor-note">
                  <PawPrint size={20} />
                  <span>
                    <strong>Haustierprofil</strong>
                    <small>
                      Zeigt Pflegeaufgaben und Tiertermine – ohne Chat,
                      Benachrichtigungen oder Sterneshop.
                    </small>
                  </span>
                </div>
              )}
              <label className="form-group">
                <span className="form-label">
                  {form.role === 'pet' ? 'Name des Haustiers' : 'Name'}
                </span>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={event => updateForm({ name: event.target.value })}
                  placeholder={form.role === 'pet' ? 'z. B. Luna' : 'z. B. Testname'}
                  maxLength={80}
                  required
                />
              </label>

              {canManage && (
                <label className="form-group">
                  <span className="form-label">Position in der Familie</span>
                  <select
                    className="form-select"
                    value={form.position}
                    onChange={event => handlePosition(event.target.value)}
                  >
                    {POSITION_OPTIONS.map(option => (
                      <option value={option.value} key={option.value}>
                        {option.emoji} {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="form-group">
                <span className="form-label">Profilbild</span>
                <div className="avatar-preset-row">
                  {FUNNY_COMIC_AVATARS.map(avatar => (
                    <button
                      type="button"
                      key={avatar.id}
                      className={form.avatar === avatar.url ? 'selected' : ''}
                      onClick={() => updateForm({ avatar: avatar.url })}
                      title={avatar.name}
                    >
                      <img src={avatar.url} alt="" />
                    </button>
                  ))}
                  <label className="avatar-upload-button" title="Eigenes Foto">
                    <Upload size={18} />
                    <input type="file" accept="image/*" onChange={handleUpload} />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <span className="form-label">Profilfarbe</span>
                <div className="color-preset-row">
                  {COLOR_PRESETS.map(color => (
                    <button
                      type="button"
                      key={color}
                      style={{ background: color }}
                      className={form.color === color ? 'selected' : ''}
                      onClick={() => updateForm({ color })}
                    >
                      {form.color === color && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </div>

              {form.role !== 'pet' && !form.isManaged && (
                <label className="form-group">
                  <span className="form-label">
                    {editingMemberId ? 'Neue Profil-PIN (optional)' : 'Profil-PIN (optional)'}
                  </span>
                  <input
                    className="form-input"
                    type="password"
                    autoComplete="new-password"
                    inputMode="numeric"
                    value={form.pin}
                    onChange={event => updateForm({ pin: event.target.value })}
                    placeholder={editingMemberId ? 'Leer lassen = unverändert' : 'Persönlicher Schutz'}
                    maxLength={12}
                  />
                </label>
              )}
            </div>

            <div className="modal-actions profile-editor-actions">
              <button className="auth-primary" disabled={busy}>
                <Check size={17} /> {busy ? 'Speichert …' : 'Profil speichern'}
              </button>
              <button
                type="button"
                className="auth-secondary"
                onClick={() => setMode('list')}
              >
                Abbrechen
              </button>
              {canManage && editingMemberId && editingMemberId !== activeMemberId && (
                <button
                  type="button"
                  className="profile-delete"
                  onClick={remove}
                  disabled={busy}
                >
                  <Trash2 size={16} /> Profil löschen
                </button>
              )}
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
