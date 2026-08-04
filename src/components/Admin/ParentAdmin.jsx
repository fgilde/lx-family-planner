import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  Eraser,
  Headphones,
  LayoutGrid,
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
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import {
  POSITION_OPTIONS,
  PROFILE_MODULE_OPTIONS,
  canManageFamily,
  getPositionLabel,
  getPositionOptionLabel,
  isManagedProfile,
  roleForPosition
} from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  handleImgError
} from '../../utils/imageFallback';
import MediaCover from '../Dashboard/MediaCover';
import GotifySettings from './GotifySettings';
import NtfySettings from './NtfySettings';
import HomeAssistantSettings from './HomeAssistantSettings';
import NextcloudSettings from './NextcloudSettings';
import ProblemReportsPanel from './ProblemReportsPanel';
import WebPushSettings from './WebPushSettings';

const YOUNG_POSITIONS = POSITION_OPTIONS.filter(option =>
  ['child', 'teen'].includes(option.role)
);

export default function ParentAdmin({ onOpenFamilyTree }) {
  const { t } = useTranslation('admin');
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
    familySettings,
    addFamilyLifeRecord,
    updateFamilyLifeRecord,
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
  const settings = familySettings[0] || null;
  const disabledModules = settings?.disabledModules || [];

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
        <h1>{t('parentAdmin.accessDenied.title')}</h1>
        <p>{t('parentAdmin.accessDenied.description')}</p>
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
        t('parentAdmin.toasts.profileUpdatedTitle'),
        t('parentAdmin.toasts.profileUpdatedBody', { name: updated.name }),
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

  const toggleFamilyModule = async moduleId => {
    if (busy) return;
    const nextDisabledModules = disabledModules.includes(moduleId)
      ? disabledModules.filter(value => value !== moduleId)
      : [...disabledModules, moduleId];
    setBusy(true);
    try {
      if (settings) {
        await updateFamilyLifeRecord('familySettings', settings.id, {
          disabledModules: nextDisabledModules
        });
      } else {
        await addFamilyLifeRecord('familySettings', {
          id: 'family-settings',
          disabledModules: nextDisabledModules
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="parent-admin">
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <span className="admin-eyebrow">
            <ShieldCheck size={16} /> {t('parentAdmin.hero.kicker')}
          </span>
          <h1>{t('parentAdmin.hero.title')}</h1>
          <p>{t('parentAdmin.hero.description')}</p>
        </div>
        <div className="admin-overview-grid">
          <article>
            <UsersRound size={19} />
            <strong>{children.length}</strong>
            <span>{t('parentAdmin.overview.childProfiles')}</span>
          </article>
          <article>
            <CircleGauge size={19} />
            <strong>{pendingTasks}</strong>
            <span>{t('parentAdmin.overview.openTasks')}</span>
          </article>
          <article>
            <Star size={19} fill="currentColor" />
            <strong>{totalStars}</strong>
            <span>{t('parentAdmin.overview.totalStars')}</span>
          </article>
          <article>
            <ClipboardList size={19} />
            <strong>{managedProfiles.length}</strong>
            <span>{t('parentAdmin.overview.managedProfiles')}</span>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-modules-panel">
        <header className="admin-panel-header">
          <div>
            <span className="admin-section-kicker">
              {t('parentAdmin.modules.kicker')}
            </span>
            <h2><LayoutGrid size={21} /> {t('parentAdmin.modules.title')}</h2>
          </div>
        </header>
        <p className="admin-panel-intro">{t('parentAdmin.modules.intro')}</p>
        <div className="admin-module-grid">
          {PROFILE_MODULE_OPTIONS.map(moduleId => {
            const enabled = !disabledModules.includes(moduleId);
            return (
              <label className={enabled ? 'enabled' : ''} key={moduleId}>
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={busy}
                  onChange={() => toggleFamilyModule(moduleId)}
                />
                <span>
                  <strong>{t(`parentAdmin.modules.labels.${moduleId}`)}</strong>
                  <small>
                    {enabled
                      ? t('parentAdmin.modules.visible')
                      : t('parentAdmin.modules.hidden')}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
        <p className="admin-module-hint">
          {t('parentAdmin.modules.profileHint')}
        </p>
      </section>

      <div className="admin-layout">
        <section className="admin-panel admin-managed-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">{t('parentAdmin.managed.kicker')}</span>
              <h2><ClipboardList size={21} /> {t('parentAdmin.managed.title')}</h2>
            </div>
            <button
              type="button"
              className="admin-text-button"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <Plus size={16} /> {t('parentAdmin.managed.create')}
            </button>
          </header>
          <p className="admin-panel-intro">{t('parentAdmin.managed.intro')}</p>
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
                    <small>
                      {t('parentAdmin.managed.positionWithoutLogin', {
                        position: getPositionLabel(member)
                      })}
                    </small>
                  </span>
                  <b>{t('parentAdmin.managed.plannable')}</b>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-managed-empty">
              <ClipboardList size={24} />
              <span>
                <strong>{t('parentAdmin.managed.emptyTitle')}</strong>
                <small>{t('parentAdmin.managed.emptyHint')}</small>
              </span>
            </div>
          )}
        </section>

        <section className="admin-panel admin-children-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">{t('parentAdmin.children.kicker')}</span>
              <h2><UserCog size={21} /> {t('parentAdmin.children.title')}</h2>
            </div>
            <button
              type="button"
              className="admin-text-button"
              onClick={() => setIsProfileModalOpen(true)}
            >
              <Plus size={16} /> {t('parentAdmin.children.add')}
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
                    <span>{t('parentAdmin.children.selectedProfile')}</span>
                    <strong>{selectedChild?.name}</strong>
                  </div>
                </div>

                <div className="admin-form-grid">
                  <label>
                    <span>{t('common:labels.name')}</span>
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
                    <span>{t('parentAdmin.children.positionLabel')}</span>
                    <select
                      value={profileForm.position}
                      onChange={event => setProfileForm(previous => ({
                        ...previous,
                        position: event.target.value
                      }))}
                    >
                      {YOUNG_POSITIONS.map(option => (
                        <option value={option.value} key={option.value}>
                          {option.emoji} {getPositionOptionLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{t('parentAdmin.children.pinLabel')}</span>
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
                        placeholder={t('parentAdmin.children.pinPlaceholder')}
                      />
                    </div>
                  </label>
                </div>
                <button className="admin-primary-button" disabled={busy}>
                  <PencilLine size={16} />
                  {busy
                    ? t('parentAdmin.children.saving')
                    : t('parentAdmin.children.save')}
                </button>
              </form>
            </>
          ) : (
            <div className="admin-empty-state">
              <span>🪁</span>
              <h3>{t('parentAdmin.children.emptyTitle')}</h3>
              <p>{t('parentAdmin.children.emptyDescription')}</p>
              <button
                type="button"
                className="admin-primary-button"
                onClick={() => setIsProfileModalOpen(true)}
              >
                <Plus size={16} /> {t('parentAdmin.children.emptyCta')}
              </button>
            </div>
          )}
        </section>

        <section className="admin-panel admin-task-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">{t('parentAdmin.tasks.kicker')}</span>
              <h2><Eraser size={21} /> {t('parentAdmin.tasks.title')}</h2>
            </div>
          </header>
          <div className="admin-task-summary">
            <span><i className="open" /> {t('parentAdmin.tasks.openCount', { count: pendingTasks })}</span>
            <span><i className="done" /> {t('parentAdmin.tasks.doneCount', { count: completedTasks })}</span>
          </div>
          <label className="admin-full-field">
            <span>{t('parentAdmin.tasks.filterLabel')}</span>
            <select
              value={taskMemberId}
              onChange={event => {
                setTaskMemberId(event.target.value);
                setConfirmAction('');
              }}
            >
              <option value="">{t('parentAdmin.tasks.allMembers')}</option>
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
                ? t('parentAdmin.tasks.deleteCompletedConfirm')
                : t('parentAdmin.tasks.deleteCompleted')}
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
                ? t('parentAdmin.tasks.clearAllConfirm')
                : t('parentAdmin.tasks.clearAll')}
            </button>
          </div>
        </section>

        <section className="admin-panel admin-points-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">{t('parentAdmin.points.kicker')}</span>
              <h2><Star size={21} fill="currentColor" /> {t('parentAdmin.points.title')}</h2>
            </div>
          </header>
          <p className="admin-panel-intro">{t('parentAdmin.points.intro')}</p>
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
                    ? t('parentAdmin.points.resetConfirm')
                    : t('common:actions.reset')}
                </button>
              </article>
            ))}
          </div>
        </section>

        <NextcloudSettings />
        <WebPushSettings />
        <GotifySettings />
        <NtfySettings />
        <HomeAssistantSettings />
        <ProblemReportsPanel />

        <section className="admin-panel admin-media-panel">
          <header className="admin-panel-header">
            <div>
              <span className="admin-section-kicker">{t('parentAdmin.media.kicker')}</span>
              <h2><Headphones size={22} /> {t('parentAdmin.media.title')}</h2>
            </div>
          </header>
          <p className="admin-panel-intro">{t('parentAdmin.media.intro')}</p>
          <form className="admin-link-form" onSubmit={addLink}>
            <select
              value={linkForm.memberId}
              onChange={event => setLinkForm(previous => ({
                ...previous,
                memberId: event.target.value
              }))}
              required
            >
              <option value="">{t('parentAdmin.media.chooseChild')}</option>
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
              aria-label={t('parentAdmin.media.kindAriaLabel')}
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
              placeholder={t('parentAdmin.media.titlePlaceholder')}
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
              <Plus size={17} /> {t('parentAdmin.media.share')}
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
                    <MediaCover
                      link={link}
                      className="admin-media-cover"
                      fallback={
                        isSpotify
                          ? <Music2 size={19} />
                          : <Youtube size={19} />
                      }
                    />
                  </span>
                  <div>
                    <strong>{link.title}</strong>
                    <small>
                      {t('parentAdmin.media.linkMeta', {
                        kind: isSpotify ? 'Spotify' : 'YouTube',
                        name: member?.name ||
                          t('parentAdmin.media.childProfileFallback')
                      })}
                    </small>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={t('parentAdmin.media.removeLink', { title: link.title })}
                    onClick={() => requestConfirmation(
                      `link-${link.id}`,
                      () => deleteDashboardLink(link.id)
                    )}
                  >
                    {confirmAction === `link-${link.id}`
                      ? <span>{t('common:actions.confirm')}</span>
                      : <Trash2 size={16} />}
                  </button>
                </article>
              );
            })}
            {!dashboardLinks.length && (
              <div className="admin-inline-empty">
                <Sparkles size={18} />
                {t('parentAdmin.media.empty')}
              </div>
            )}
          </div>
        </section>

        <section className="admin-panel admin-family-panel">
          <div className="admin-family-icon"><Network size={24} /></div>
          <div>
            <span className="admin-section-kicker">{t('parentAdmin.family.kicker')}</span>
            <h2>{t('parentAdmin.family.title')}</h2>
            <p>
              {t('parentAdmin.family.confirmedConnections', {
                count: familyRelationships.filter(item => item.status === 'accepted').length
              })}
              {pendingRelationships
                ? ` · ${t('parentAdmin.family.pendingRequests', { count: pendingRelationships })}`
                : ''}
            </p>
          </div>
          <button type="button" onClick={onOpenFamilyTree}>
            {t('parentAdmin.family.openTree')} <ChevronRight size={17} />
          </button>
        </section>
      </div>
    </div>
  );
}
