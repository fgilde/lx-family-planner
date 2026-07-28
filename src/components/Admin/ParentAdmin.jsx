import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  Eraser,
  Headphones,
  KeyRound,
  Link2,
  Music2,
  Network,
  PencilLine,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserCog,
  UsersRound,
  Youtube
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import {
  POSITION_OPTIONS,
  canManageFamily,
  getPositionLabel,
  isManagedProfile,
  roleForPosition
} from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  handleImgError
} from '../../utils/imageFallback';
import GotifySettings from './GotifySettings';
import HomeAssistantSettings from './HomeAssistantSettings';
import ProblemReportsPanel from './ProblemReportsPanel';
import WebPushSettings from './WebPushSettings';

const YOUNG_POSITIONS = POSITION_OPTIONS.filter(option =>
  ['child', 'teen'].includes(option.role)
);

export default function ParentAdmin({ onOpenFamilyTree }) {
  const {
    activeMember,
    members,
    tasks,
    updateMember,
    resetMemberStars,
    clearTasks,
    dashboardLinks,
    addDashboardLink,
    deleteDashboardLink,
    familyRelationships,
    setIsProfileModalOpen,
    showToast
  } = useFamily();
  const children = useMemo(
    () =>
      members.filter(
        member =>
          !isManagedProfile(member) &&
          ['child', 'teen'].includes(member.role)
      ),
    [members]
  );
  const rewardMembers = useMemo(
    () =>
      members.filter(
        member => member.role !== 'pet' && !isManagedProfile(member)
      ),
    [members]
  );
  const managedProfiles = useMemo(
    () => members.filter(isManagedProfile),
    [members]
  );
  const [selectedChildId, setSelectedChildId] = useState(
    children[0]?.id || ''
  );
  const [taskMemberId, setTaskMemberId] = useState('');
  const [confirmAction, setConfirmAction] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: '',
    position: 'kind',
    pin: ''
  });
  const [linkForm, setLinkForm] = useState({
    memberId: children[0]?.id || '',
    kind: 'youtube',
    title: '',
    url: ''
  });
  const [busy, setBusy] = useState(false);

  const selectedChild =
    children.find(member => member.id === selectedChildId) || children[0];

  useEffect(() => {
    if (!children.length) {
      setSelectedChildId('');
      setLinkForm(previous => ({ ...previous, memberId: '' }));
      return;
    }
    if (!children.some(member => member.id === selectedChildId)) {
      setSelectedChildId(children[0].id);
    }
    setLinkForm(previous => ({
      ...previous,
      memberId: children.some(member => member.id === previous.memberId)
        ? previous.memberId
        : children[0].id
    }));
  }, [children, selectedChildId]);

  useEffect(() => {
    if (!selectedChild) return;
    setProfileForm({
      name: selectedChild.name || '',
      position: selectedChild.position || (
        selectedChild.role === 'teen' ? 'teenager' : 'kind'
      ),
      pin: ''
    });
  }, [selectedChild?.id, selectedChild?.name, selectedChild?.position]);

  if (!canManageFamily(activeMember)) {
    return (
      <section className="admin-access-card">
        <ShieldCheck size={32} />
        <h1>Elternbereich</h1>
        <p>Dieser Bereich ist nur für erwachsene Familienprofile sichtbar.</p>
      </section>
    );
  }

  const pendingTasks = tasks.filter(task => !task.completed).length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalStars = rewardMembers.reduce(
    (sum, member) => sum + Number(member.stars || 0),
    0
  );
  const pendingRelationships = familyRelationships.filter(
    relationship => relationship.status === 'pending'
  ).length;

  const requestConfirmation = async (key, action) => {
    if (confirmAction !== key) {
      setConfirmAction(key);
      return;
    }
    setBusy(true);
    try {
      await action();
      setConfirmAction('');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async event => {
    event.preventDefault();
    if (!selectedChild || !profileForm.name.trim()) return;
    setBusy(true);
    const updated = await updateMember(selectedChild.id, {
      name: profileForm.name.trim(),
      position: profileForm.position,
      role: roleForPosition(profileForm.position),
      pin: profileForm.pin || undefined
    });
    setBusy(false);
    if (updated) {
      setProfileForm(previous => ({ ...previous, pin: '' }));
      showToast(
        'Kinderprofil aktualisiert',
        `${updated.name}s Einstellungen sind gespeichert.`,
        'success'
      );
    }
  };

  const addLink = async event => {
    event.preventDefault();
    if (!linkForm.memberId || !linkForm.title.trim() || !linkForm.url.trim()) {
      return;
    }
    let url = linkForm.url.trim();
    if (!/^https:\/\//i.test(url)) url = `https://${url}`;
    setBusy(true);
    const created = await addDashboardLink({
      memberId: linkForm.memberId,
      kind: linkForm.kind,
      title: linkForm.title.trim(),
      url,
      color: linkForm.kind === 'spotify' ? '#1db954' : '#ff4f55'
    });
    setBusy(false);
    if (created) {
      setLinkForm(previous => ({ ...previous, title: '', url: '' }));
    }
  };

  return (
    <div className="parent-admin">
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <span className="admin-eyebrow">
            <ShieldCheck size={16} /> Nur für Erwachsene
          </span>
          <h1>Elternzentrale</h1>
          <p>
            Profile, Aufgaben und Kinder-Dashboards an einem ruhigen Ort
            verwalten – ohne zwischen mehreren Bereichen zu springen.
          </p>
        </div>
        <div className="admin-overview-grid">
          <article>
            <UsersRound size={19} />
            <strong>{children.length}</strong>
            <span>Kinderprofile</span>
          </article>
          <article>
            <CircleGauge size={19} />
            <strong>{pendingTasks}</strong>
            <span>Offene Aufgaben</span>
          </article>
          <article>
            <Star size={19} fill="currentColor" />
            <strong>{totalStars}</strong>
            <span>Sterne gesamt</span>
          </article>
          <article>
            <ClipboardList size={19} />
            <strong>{managedProfiles.length}</strong>
            <span>Verwaltete Profile</span>
          </article>
        </div>
      </section>

      <div className="admin-layout">
        <section className="admin-panel admin-managed-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">Ohne eigenen Zugang</span>
              <h2><ClipboardList size={21} /> Verwaltete Profile</h2>
            </div>
            <button
              type="button"
              className="admin-text-button"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <Plus size={16} /> Profil anlegen
            </button>
          </header>
          <p className="admin-panel-intro">
            Für Oma, Opa oder betreute Personen: Sie erscheinen bei Terminen
            und Aufgaben, aber nicht bei der Anmeldung oder im Chat.
          </p>
          {managedProfiles.length > 0 ? (
            <div className="admin-managed-list">
              {managedProfiles.map(member => (
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
                    <small>{getPositionLabel(member)} · ohne Anmeldung</small>
                  </span>
                  <b>Planbar</b>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-managed-empty">
              <ClipboardList size={24} />
              <span>
                <strong>Noch niemand eingetragen</strong>
                <small>
                  Beim Anlegen „Nur von uns verwaltet“ auswählen.
                </small>
              </span>
            </div>
          )}
        </section>

        <section className="admin-panel admin-children-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">Kinder & Teenager</span>
              <h2><UserCog size={21} /> Profile administrieren</h2>
            </div>
            <button
              type="button"
              className="admin-text-button"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <Plus size={16} /> Profil hinzufügen
            </button>
          </header>

          {children.length ? (
            <>
              <div className="admin-child-tabs">
                {children.map(member => (
                  <button
                    type="button"
                    key={member.id}
                    className={selectedChild?.id === member.id ? 'active' : ''}
                    onClick={() => setSelectedChildId(member.id)}
                    style={{ '--child-color': member.color || '#e0a52e' }}
                  >
                    <img
                      src={member.avatar || DEFAULT_FAMILY_AVATAR}
                      onError={handleImgError}
                      alt=""
                    />
                    <span>
                      <strong>{member.name}</strong>
                      <small>{getPositionLabel(member)}</small>
                    </span>
                    <b><Star size={13} fill="currentColor" /> {member.stars || 0}</b>
                  </button>
                ))}
              </div>

              <form className="admin-profile-form" onSubmit={saveProfile}>
                <div className="admin-profile-heading">
                  <div>
                    <span>Ausgewähltes Profil</span>
                    <strong>{selectedChild?.name}</strong>
                  </div>
                </div>

                <div className="admin-form-grid">
                  <label>
                    <span>Name</span>
                    <input
                      value={profileForm.name}
                      onChange={event => setProfileForm(previous => ({
                        ...previous,
                        name: event.target.value
                      }))}
                      maxLength={80}
                      required
                    />
                  </label>
                  <label>
                    <span>Position</span>
                    <select
                      value={profileForm.position}
                      onChange={event => setProfileForm(previous => ({
                        ...previous,
                        position: event.target.value
                      }))}
                    >
                      {YOUNG_POSITIONS.map(option => (
                        <option value={option.value} key={option.value}>
                          {option.emoji} {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Neue Profil-PIN (optional)</span>
                    <div className="admin-input-icon">
                      <KeyRound size={16} />
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={12}
                        value={profileForm.pin}
                        onChange={event => setProfileForm(previous => ({
                          ...previous,
                          pin: event.target.value
                        }))}
                        placeholder="Leer = unverändert"
                      />
                    </div>
                  </label>
                </div>
                <button className="admin-primary-button" disabled={busy}>
                  <PencilLine size={16} />
                  {busy ? 'Speichert …' : 'Profil speichern'}
                </button>
              </form>
            </>
          ) : (
            <div className="admin-empty-state">
              <span>🪁</span>
              <h3>Noch kein Kinderprofil</h3>
              <p>Lege zuerst ein Profil als Kind oder Teenager an.</p>
              <button
                type="button"
                className="admin-primary-button"
                onClick={() => setIsProfileModalOpen(true)}
              >
                <Plus size={16} /> Kinderprofil anlegen
              </button>
            </div>
          )}
        </section>

        <section className="admin-panel admin-task-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">Ordnung schaffen</span>
              <h2><Eraser size={21} /> Aufgabenliste bereinigen</h2>
            </div>
          </header>
          <div className="admin-task-summary">
            <span><i className="open" /> {pendingTasks} offen</span>
            <span><i className="done" /> {completedTasks} erledigt</span>
          </div>
          <label className="admin-full-field">
            <span>Nur Aufgaben von</span>
            <select
              value={taskMemberId}
              onChange={event => {
                setTaskMemberId(event.target.value);
                setConfirmAction('');
              }}
            >
              <option value="">Allen Familienmitgliedern</option>
              {members.map(member => (
                <option value={member.id} key={member.id}>{member.name}</option>
              ))}
            </select>
          </label>
          <div className="admin-clean-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => requestConfirmation(
                `tasks-completed-${taskMemberId}`,
                () => clearTasks({ memberId: taskMemberId, completedOnly: true })
              )}
            >
              <CheckCircle2 size={17} />
              {confirmAction === `tasks-completed-${taskMemberId}`
                ? 'Erledigte wirklich löschen?'
                : 'Erledigte löschen'}
            </button>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => requestConfirmation(
                `tasks-all-${taskMemberId}`,
                () => clearTasks({ memberId: taskMemberId })
              )}
            >
              <Trash2 size={17} />
              {confirmAction === `tasks-all-${taskMemberId}`
                ? 'Wirklich alle löschen?'
                : 'Aufgabenliste leeren'}
            </button>
          </div>
        </section>

        <section className="admin-panel admin-points-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">Sternenkonten</span>
              <h2><Star size={21} fill="currentColor" /> Belohnungspunkte</h2>
            </div>
          </header>
          <p className="admin-panel-intro">
            Setze die Punkte von Kindern und Erwachsenen getrennt zurück.
            Haustiere sammeln keine Belohnungspunkte.
          </p>
          <div className="admin-points-grid">
            {rewardMembers.map(member => (
              <article
                key={member.id}
                style={{ '--member-color': member.color || '#e0a52e' }}
              >
                <img
                  src={member.avatar || DEFAULT_FAMILY_AVATAR}
                  onError={handleImgError}
                  alt=""
                />
                <span>
                  <strong>{member.name}</strong>
                  <small>{getPositionLabel(member)}</small>
                </span>
                <b><Star size={14} fill="currentColor" /> {member.stars || 0}</b>
                <button
                  type="button"
                  disabled={busy || !Number(member.stars || 0)}
                  onClick={() => requestConfirmation(
                    `points-${member.id}`,
                    () => resetMemberStars(member.id)
                  )}
                >
                  <RotateCcw size={14} />
                  {confirmAction === `points-${member.id}`
                    ? 'Wirklich auf 0?'
                    : 'Zurücksetzen'}
                </button>
              </article>
            ))}
          </div>
        </section>

        <WebPushSettings />
        <GotifySettings />
        <HomeAssistantSettings />
        <ProblemReportsPanel />

        <section className="admin-panel admin-media-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">Kinder-Dashboard</span>
              <h2><Headphones size={22} /> Medien-Lounge</h2>
            </div>
          </header>
          <p className="admin-panel-intro">
            Lege geprüfte YouTube-Kanäle und Spotify-Playlists als große,
            kindgerechte Kacheln ab. Sichtbar ist nur, was ihr hier freigebt.
          </p>
          <form className="admin-link-form" onSubmit={addLink}>
            <select
              value={linkForm.memberId}
              onChange={event => setLinkForm(previous => ({
                ...previous,
                memberId: event.target.value
              }))}
              required
            >
              <option value="">Kinderprofil wählen</option>
              {children.map(member => (
                <option value={member.id} key={member.id}>{member.name}</option>
              ))}
            </select>
            <select
              value={linkForm.kind}
              onChange={event => setLinkForm(previous => ({
                ...previous,
                kind: event.target.value,
                url: ''
              }))}
              aria-label="Medienart"
            >
              <option value="youtube">▶ YouTube</option>
              <option value="spotify">♫ Spotify</option>
            </select>
            <input
              value={linkForm.title}
              onChange={event => setLinkForm(previous => ({
                ...previous,
                title: event.target.value
              }))}
              placeholder="z. B. Die Maus"
              maxLength={80}
              required
            />
            <div className="admin-link-url">
              <Link2 size={16} />
              <input
                value={linkForm.url}
                onChange={event => setLinkForm(previous => ({
                  ...previous,
                  url: event.target.value
                }))}
                placeholder={
                  linkForm.kind === 'spotify'
                    ? 'open.spotify.com/playlist/...'
                    : 'youtube.com/@kanal'
                }
                required
              />
            </div>
            <button disabled={busy || !children.length}>
              <Plus size={17} /> Widget freigeben
            </button>
          </form>
          <div className="admin-link-list">
            {dashboardLinks.map(link => {
              const member = members.find(entry => entry.id === link.memberId);
              const isSpotify = link.kind === 'spotify';
              return (
                <article
                  key={link.id}
                  data-kind={isSpotify ? 'spotify' : 'youtube'}
                >
                  <span className="admin-media-mark">
                    {isSpotify
                      ? <Music2 size={19} />
                      : <Youtube size={19} />}
                  </span>
                  <div>
                    <strong>{link.title}</strong>
                    <small>
                      {isSpotify ? 'Spotify' : 'YouTube'} · auf{' '}
                      {member?.name || 'Kinderprofil'}s Dashboard
                    </small>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`${link.title} entfernen`}
                    onClick={() => requestConfirmation(
                      `link-${link.id}`,
                      () => deleteDashboardLink(link.id)
                    )}
                  >
                    {confirmAction === `link-${link.id}`
                      ? <span>Bestätigen</span>
                      : <Trash2 size={16} />}
                  </button>
                </article>
              );
            })}
            {!dashboardLinks.length && (
              <div className="admin-inline-empty">
                <Sparkles size={18} />
                Noch keine Medien-Widgets freigegeben.
              </div>
            )}
          </div>
        </section>

        <section className="admin-panel admin-family-panel">
          <div className="admin-family-icon"><Network size={24} /></div>
          <div>
            <span className="admin-section-kicker">Familiennetz</span>
            <h2>Verwandte Familienkonten</h2>
            <p>
              {familyRelationships.filter(item => item.status === 'accepted').length}
              {' '}bestätigte Verbindung
              {familyRelationships.filter(item => item.status === 'accepted').length === 1 ? '' : 'en'}
              {pendingRelationships
                ? ` · ${pendingRelationships} offene Anfrage${pendingRelationships === 1 ? '' : 'n'}`
                : ''}
            </p>
          </div>
          <button type="button" onClick={onOpenFamilyTree}>
            Stammbaum öffnen <ChevronRight size={17} />
          </button>
        </section>
      </div>
    </div>
  );
}
