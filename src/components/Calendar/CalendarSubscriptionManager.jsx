import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  Check,
  CloudDownload,
  EyeOff,
  Globe2,
  Link2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Satellite,
  Trash2,
  X
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { formatDate, formatTime } from '../../utils/formatting';

const SOURCE_COLORS = [
  '#147d64',
  '#2563eb',
  '#d97706',
  '#dc4f6c',
  '#7c3aed',
  '#0891b2'
];

function syncLabel(timestamp, t) {
  if (!timestamp) return t('sources.list.syncNever');
  const date = new Date(Number(timestamp));
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? t('sources.list.syncToday', {
        time: formatTime(date, {
          hour: '2-digit',
          minute: '2-digit'
        })
      })
    : formatDate(date, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
}

export default function CalendarSubscriptionManager({ isOpen, onClose }) {
  const { t } = useTranslation('calendar');
  const {
    activeHousehold,
    familyAccount,
    members,
    calendarSubscriptions,
    addCalendarSubscription,
    updateCalendarSubscription,
    syncCalendarSubscription,
    syncAllCalendarSubscriptions,
    deleteCalendarSubscription
  } = useFamily();
  const [form, setForm] = useState({
    provider: 'ics',
    name: '',
    url: '',
    username: '',
    password: '',
    color: SOURCE_COLORS[0],
    memberId: 'all',
    household:
      activeHousehold === 'oma_opa' &&
      !familyAccount?.grandparentsHouseholdEnabled
        ? 'familie'
        : activeHousehold
  });
  const [busy, setBusy] = useState('');

  const regularSubscriptions = useMemo(
    () => calendarSubscriptions.filter(subscription => subscription.kind !== 'trash'),
    [calendarSubscriptions]
  );

  const enabledSubscriptions = useMemo(
    () => regularSubscriptions.filter(subscription => subscription.enabled),
    [regularSubscriptions]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    setForm(previous => ({
      ...previous,
      household:
        activeHousehold === 'oma_opa' &&
        !familyAccount?.grandparentsHouseholdEnabled
          ? 'familie'
          : activeHousehold
    }));
    const closeOnEscape = event => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [
    activeHousehold,
    familyAccount?.grandparentsHouseholdEnabled,
    isOpen,
    onClose
  ]);

  if (!isOpen) return null;

  const submit = async event => {
    event.preventDefault();
    setBusy('add');
    const created = await addCalendarSubscription(form);
    setBusy('');
    if (created) {
      setForm(previous => ({
        ...previous,
        name: '',
        url: '',
        username: '',
        password: ''
      }));
    }
  };

  const syncOne = async subscriptionId => {
    setBusy(`sync:${subscriptionId}`);
    await syncCalendarSubscription(subscriptionId);
    setBusy('');
  };

  const toggleOne = async subscription => {
    setBusy(`toggle:${subscription.id}`);
    await updateCalendarSubscription(subscription.id, {
      enabled: !subscription.enabled
    });
    setBusy('');
  };

  const removeOne = async subscription => {
    if (
      !window.confirm(
        t('sources.list.confirmRemove', { name: subscription.name })
      )
    ) {
      return;
    }
    setBusy(`delete:${subscription.id}`);
    await deleteCalendarSubscription(subscription.id);
    setBusy('');
  };

  const syncAll = async () => {
    setBusy('sync-all');
    await syncAllCalendarSubscriptions();
    setBusy('');
  };

  return createPortal(
    <div
      className="calendar-source-layer"
      onPointerDown={onClose}
    >
      <section
        className="calendar-source-studio"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-source-title"
        onPointerDown={event => event.stopPropagation()}
      >
        <header className="calendar-source-header">
          <span className="calendar-source-orbit" aria-hidden="true">
            <Satellite size={24} />
          </span>
          <div>
            <span className="calendar-source-kicker">
              {t('sources.header.kicker')}
            </span>
            <h2 id="calendar-source-title">{t('sources.header.title')}</h2>
            <p>{t('sources.header.description')}</p>
          </div>
          <button
            type="button"
            className="calendar-source-close"
            onClick={onClose}
            aria-label={t('sources.header.closeAria')}
          >
            <X size={19} />
          </button>
        </header>

        <div className="calendar-source-body">
          <section className="calendar-source-existing">
            <div className="calendar-source-section-heading">
              <div>
                <span>{t('sources.list.heading')}</span>
                <strong>
                  {t('sources.list.activeCount', {
                    count: enabledSubscriptions.length
                  })}
                </strong>
              </div>
              {enabledSubscriptions.length > 1 && (
                <button
                  type="button"
                  onClick={syncAll}
                  disabled={Boolean(busy)}
                >
                  <RefreshCw
                    size={15}
                    className={busy === 'sync-all' ? 'spin' : ''}
                  />
                  {t('sources.list.syncAll')}
                </button>
              )}
            </div>

            <div className="calendar-source-list">
              {regularSubscriptions.length === 0 ? (
                <div className="calendar-source-empty">
                  <span><CloudDownload size={25} /></span>
                  <strong>{t('sources.list.emptyTitle')}</strong>
                  <p>{t('sources.list.emptyDescription')}</p>
                </div>
              ) : (
                regularSubscriptions.map(subscription => {
                  const isSyncing = busy === `sync:${subscription.id}`;
                  const isToggling = busy === `toggle:${subscription.id}`;
                  const member = members.find(
                    entry => entry.id === subscription.memberId
                  );
                  return (
                    <article
                      key={subscription.id}
                      className={`calendar-source-card ${
                        subscription.enabled ? 'is-active' : 'is-paused'
                      } ${subscription.lastError ? 'has-error' : ''}`}
                      style={{ '--source-color': subscription.color }}
                    >
                      <span className="calendar-source-color">
                        <CalendarClock size={19} />
                      </span>
                      <div className="calendar-source-card-copy">
                        <div>
                          <strong>{subscription.name}</strong>
                          <span>
                            {subscription.provider === 'caldav'
                              ? t('sources.list.caldavProvider')
                              : t('sources.list.icsProvider')}
                            {' · '}
                            {subscription.host}
                            {' · '}
                            {member?.name || t('sources.list.everyone')}
                          </span>
                        </div>
                        {subscription.lastError ? (
                          <p className="calendar-source-error">
                            {subscription.lastError}
                          </p>
                        ) : (
                          <p>
                            {t('sources.list.eventCount', {
                              count: subscription.eventCount
                            })}
                            {' · '}
                            {syncLabel(subscription.lastSuccessAt, t)}
                          </p>
                        )}
                      </div>
                      <div className="calendar-source-card-actions">
                        <button
                          type="button"
                          onClick={() => void syncOne(subscription.id)}
                          disabled={Boolean(busy) || !subscription.enabled}
                          title={t('sources.list.syncNowTitle')}
                          aria-label={t('sources.list.syncNowAria', {
                            name: subscription.name
                          })}
                        >
                          <RefreshCw
                            size={15}
                            className={isSyncing ? 'spin' : ''}
                          />
                        </button>
                        <button
                          type="button"
                          className={`calendar-source-toggle ${
                            subscription.enabled ? 'is-on' : ''
                          }`}
                          onClick={() => void toggleOne(subscription)}
                          disabled={Boolean(busy)}
                          aria-label={
                            subscription.enabled
                              ? t('sources.list.pauseAria', {
                                  name: subscription.name
                                })
                              : t('sources.list.resumeAria', {
                                  name: subscription.name
                                })
                          }
                        >
                          {isToggling ? (
                            <LoaderCircle className="spin" size={15} />
                          ) : subscription.enabled ? (
                            <Check size={15} />
                          ) : (
                            <EyeOff size={15} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => void removeOne(subscription)}
                          disabled={Boolean(busy)}
                          title={t('sources.list.removeTitle')}
                          aria-label={t('sources.list.removeAria', {
                            name: subscription.name
                          })}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <form className="calendar-source-form" onSubmit={submit}>
            <div className="calendar-source-form-heading">
              <span><Link2 size={18} /></span>
              <div>
                <strong>{t('sources.form.connect')}</strong>
                <p>{t('sources.form.connectHint')}</p>
              </div>
            </div>

            <label>
              <span>{t('sources.form.providerLabel')}</span>
              <select
                value={form.provider}
                onChange={event =>
                  setForm(previous => ({
                    ...previous,
                    provider: event.target.value,
                    username: '',
                    password: ''
                  }))
                }
              >
                <option value="ics">{t('sources.form.providerIcs')}</option>
                <option value="caldav">{t('sources.form.providerCalDav')}</option>
              </select>
            </label>

            <label>
              <span>{t('sources.form.nameLabel')}</span>
              <input
                required
                maxLength={100}
                value={form.name}
                onChange={event =>
                  setForm(previous => ({
                    ...previous,
                    name: event.target.value
                  }))
                }
                placeholder={t('sources.form.namePlaceholder')}
              />
            </label>

            <label>
              <span>{form.provider === 'caldav'
                ? t('sources.form.caldavUrlLabel')
                : t('sources.form.urlLabel')}</span>
              <input
                required
                type="url"
                maxLength={4000}
                value={form.url}
                onChange={event =>
                  setForm(previous => ({
                    ...previous,
                    url: event.target.value
                  }))
                }
                placeholder={form.provider === 'caldav'
                  ? 'https://…/caldav/…/calendar/'
                  : 'https://…/calendar.ics'}
                autoComplete="off"
                spellCheck="false"
              />
            </label>

            {form.provider === 'caldav' && (
              <div className="calendar-source-form-grid">
                <label>
                  <span>{t('sources.form.caldavUsernameLabel')}</span>
                  <input
                    required
                    maxLength={300}
                    value={form.username}
                    onChange={event =>
                      setForm(previous => ({ ...previous, username: event.target.value }))
                    }
                    autoComplete="username"
                  />
                </label>
                <label>
                  <span>{t('sources.form.caldavPasswordLabel')}</span>
                  <input
                    required
                    type="password"
                    maxLength={1000}
                    value={form.password}
                    onChange={event =>
                      setForm(previous => ({ ...previous, password: event.target.value }))
                    }
                    autoComplete="current-password"
                  />
                </label>
              </div>
            )}

            <div className="calendar-source-form-grid">
              <label>
                <span>{t('sources.form.visibilityLabel')}</span>
                <select
                  value={form.memberId}
                  onChange={event =>
                    setForm(previous => ({
                      ...previous,
                      memberId: event.target.value
                    }))
                  }
                >
                  <option value="all">{t('sources.form.allMembers')}</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t('sources.form.householdLabel')}</span>
                <select
                  value={form.household}
                  onChange={event =>
                    setForm(previous => ({
                      ...previous,
                      household: event.target.value
                    }))
                  }
                >
                  <option value="familie">
                    {t('sources.form.householdFamily')}
                  </option>
                  {familyAccount?.grandparentsHouseholdEnabled && (
                    <option value="oma_opa">
                      {t('sources.form.householdGrandparents')}
                    </option>
                  )}
                </select>
              </label>
            </div>

            <fieldset className="calendar-source-colors">
              <legend>{t('sources.form.colorLegend')}</legend>
              <div>
                {SOURCE_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={form.color === color ? 'is-selected' : ''}
                    style={{ '--choice-color': color }}
                    onClick={() =>
                      setForm(previous => ({ ...previous, color }))
                    }
                    aria-label={t('sources.form.pickColorAria', { color })}
                    aria-pressed={form.color === color}
                  >
                    {form.color === color && <Check size={14} />}
                  </button>
                ))}
              </div>
            </fieldset>

            <aside className="calendar-source-privacy">
              <LockKeyhole size={16} />
              <p>{form.provider === 'caldav'
                ? t('sources.form.caldavPrivacyNote')
                : t('sources.form.privacyNote')}</p>
            </aside>

            <button
              type="submit"
              className="calendar-source-submit"
              disabled={Boolean(busy)}
            >
              {busy === 'add' ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Globe2 size={17} />
              )}
              {busy === 'add'
                ? t('sources.form.connecting')
                : t('sources.form.connect')}
            </button>
          </form>
        </div>
      </section>
    </div>,
    document.body
  );
}
