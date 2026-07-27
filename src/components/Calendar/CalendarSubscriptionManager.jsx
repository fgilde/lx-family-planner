import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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

const SOURCE_COLORS = [
  '#147d64',
  '#2563eb',
  '#d97706',
  '#dc4f6c',
  '#7c3aed',
  '#0891b2'
];

function syncLabel(timestamp) {
  if (!timestamp) return 'Noch nicht erfolgreich abgeglichen';
  const date = new Date(Number(timestamp));
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? `Heute um ${date.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      })}`
    : date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
}

export default function CalendarSubscriptionManager({ isOpen, onClose }) {
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
    name: '',
    url: '',
    color: SOURCE_COLORS[0],
    memberId: 'all',
    household:
      activeHousehold === 'grosseltern' &&
      !familyAccount?.grandparentsHouseholdEnabled
        ? 'familie'
        : activeHousehold
  });
  const [busy, setBusy] = useState('');

  const enabledSubscriptions = useMemo(
    () => calendarSubscriptions.filter(subscription => subscription.enabled),
    [calendarSubscriptions]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    setForm(previous => ({
      ...previous,
      household:
        activeHousehold === 'grosseltern' &&
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
        url: ''
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
        `"${subscription.name}" und alle darüber eingelesenen Termine entfernen?`
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
              Kalenderbrücke
            </span>
            <h2 id="calendar-source-title">Externe Kalender</h2>
            <p>
              Termine aus Google, Outlook, Nextcloud und anderen
              ICS-Kalendern automatisch einlesen.
            </p>
          </div>
          <button
            type="button"
            className="calendar-source-close"
            onClick={onClose}
            aria-label="Kalenderquellen schließen"
          >
            <X size={19} />
          </button>
        </header>

        <div className="calendar-source-body">
          <section className="calendar-source-existing">
            <div className="calendar-source-section-heading">
              <div>
                <span>Verbundene Quellen</span>
                <strong>
                  {enabledSubscriptions.length} aktiv
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
                  Alle abgleichen
                </button>
              )}
            </div>

            <div className="calendar-source-list">
              {calendarSubscriptions.length === 0 ? (
                <div className="calendar-source-empty">
                  <span><CloudDownload size={25} /></span>
                  <strong>Noch keine Kalenderbrücke</strong>
                  <p>
                    Füge rechts einen privaten ICS-Link ein. Danach laufen
                    neue Termine automatisch in euren Familienkalender.
                  </p>
                </div>
              ) : (
                calendarSubscriptions.map(subscription => {
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
                            {subscription.host}
                            {' · '}
                            {member?.name || 'Alle'}
                          </span>
                        </div>
                        {subscription.lastError ? (
                          <p className="calendar-source-error">
                            {subscription.lastError}
                          </p>
                        ) : (
                          <p>
                            {subscription.eventCount} Termine ·{' '}
                            {syncLabel(subscription.lastSuccessAt)}
                          </p>
                        )}
                      </div>
                      <div className="calendar-source-card-actions">
                        <button
                          type="button"
                          onClick={() => void syncOne(subscription.id)}
                          disabled={Boolean(busy) || !subscription.enabled}
                          title="Jetzt abgleichen"
                          aria-label={`${subscription.name} jetzt abgleichen`}
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
                              ? `${subscription.name} pausieren`
                              : `${subscription.name} aktivieren`
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
                          title="Quelle entfernen"
                          aria-label={`${subscription.name} entfernen`}
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
                <strong>Kalender verbinden</strong>
                <p>Der Link bleibt verschlüsselt auf eurem Server.</p>
              </div>
            </div>

            <label>
              <span>Name der Quelle</span>
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
                placeholder="z. B. Schulkalender"
              />
            </label>

            <label>
              <span>Privater ICS-Link</span>
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
                placeholder="https://…/calendar.ics"
                autoComplete="off"
                spellCheck="false"
              />
            </label>

            <div className="calendar-source-form-grid">
              <label>
                <span>Sichtbar für</span>
                <select
                  value={form.memberId}
                  onChange={event =>
                    setForm(previous => ({
                      ...previous,
                      memberId: event.target.value
                    }))
                  }
                >
                  <option value="all">Alle Familienmitglieder</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Planungsort</span>
                <select
                  value={form.household}
                  onChange={event =>
                    setForm(previous => ({
                      ...previous,
                      household: event.target.value
                    }))
                  }
                >
                  <option value="familie">Unser Zuhause</option>
                  {familyAccount?.grandparentsHouseholdEnabled && (
                    <option value="grosseltern">Zuhause Oma & Opa</option>
                  )}
                </select>
              </label>
            </div>

            <fieldset className="calendar-source-colors">
              <legend>Kalenderfarbe</legend>
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
                    aria-label={`Farbe ${color} wählen`}
                    aria-pressed={form.color === color}
                  >
                    {form.color === color && <Check size={14} />}
                  </button>
                ))}
              </div>
            </fieldset>

            <aside className="calendar-source-privacy">
              <LockKeyhole size={16} />
              <p>
                Nur lesen: Der Familienplaner kann im fremden Kalender nichts
                ändern oder löschen. Teile den geheimen Link trotzdem nicht
                öffentlich.
              </p>
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
              {busy === 'add' ? 'Wird verbunden …' : 'Kalender verbinden'}
            </button>
          </form>
        </div>
      </section>
    </div>,
    document.body
  );
}
