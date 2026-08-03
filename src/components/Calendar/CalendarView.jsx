import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  BellRing,
  ChevronRight,
  Cloud,
  Download,
  History,
  HeartHandshake,
  LockKeyhole,
  MapPin,
  Plus,
  Radio,
  Trash2,
  Upload,
  UserRound
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import {
  canManageFamily,
  isManagedProfile
} from '../../constants/roles';
import {
  DEFAULT_MEMBER_AVATAR,
  handleImgError
} from '../../utils/imageFallback';
import { formatDate } from '../../utils/formatting';
import CalendarSubscriptionManager from './CalendarSubscriptionManager';
import EventReminderDialog from './EventReminderDialog';
import {
  formatReminderLead,
  normalizeEventReminders
} from '../../../shared/eventReminders.js';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(value) {
  return new Date(`${value}T12:00:00`);
}

function dayHeading(dateKey, todayKey, t) {
  const date = dateFromKey(dateKey);
  const tomorrow = new Date(dateFromKey(todayKey).getTime() + 86_400_000);
  if (dateKey === todayKey) return t('view.day.today');
  if (dateKey === localDateKey(tomorrow)) return t('view.day.tomorrow');
  return formatDate(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function eventDateValue(event) {
  return new Date(`${event.date}T${event.time || '00:00'}:00`).getTime();
}

function previousLocalDate(value) {
  const date = dateFromKey(value);
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

function eventLastDate(event) {
  if (!event.endDate) return event.date;
  const endDate = event.allDay
    ? previousLocalDate(event.endDate)
    : event.endDate;
  return endDate < event.date ? event.date : endDate;
}

export default function CalendarView() {
  const { t } = useTranslation('calendar');
  const { t: tShared } = useTranslation('shared');
  const {
    events,
    deleteEvent,
    updateEvent,
    members,
    activeMember,
    calendarSubscriptions,
    exportICS,
    importICS,
    setIsQuickAddOpen,
    setQuickAddDefaultType,
    activeHousehold
  } = useFamily();
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [showPast, setShowPast] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [selectedReminderEvent, setSelectedReminderEvent] = useState(null);
  const todayKey = localDateKey();
  const canManage = canManageFamily(activeMember);

  const householdEvents = useMemo(
    () =>
      events.filter(
        event => (event.household || 'familie') === activeHousehold
      ),
    [activeHousehold, events]
  );

  const filteredEvents = useMemo(
    () =>
      householdEvents
        .filter(event => showPast || eventLastDate(event) >= todayKey)
        .filter(
          event =>
            selectedMemberFilter === 'all' ||
            event.memberId === 'all' ||
            event.memberId === selectedMemberFilter
        )
        .sort((left, right) => eventDateValue(left) - eventDateValue(right)),
    [householdEvents, selectedMemberFilter, showPast, todayKey]
  );

  const groupedEvents = useMemo(() => {
    const groups = new Map();
    filteredEvents.forEach(event => {
      const date = event.date < todayKey && eventLastDate(event) >= todayKey
        ? todayKey
        : event.date || todayKey;
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date).push(event);
    });
    return [...groups.entries()];
  }, [filteredEvents, todayKey]);

  const todayEvents = householdEvents.filter(
    event => event.date <= todayKey && eventLastDate(event) >= todayKey
  );
  const upcomingEvents = householdEvents
    .filter(event => eventLastDate(event) >= todayKey)
    .sort((left, right) => eventDateValue(left) - eventDateValue(right));
  const nextEvent = upcomingEvents[0];

  const handleFileUpload = event => {
    const file = event.target.files?.[0];
    if (file) importICS(file);
    event.target.value = '';
  };

  return (
    <div className="family-calendar">
      <section className="calendar-hero">
        <div className="calendar-hero-copy">
          <span className="calendar-eyebrow">
            <Radio size={13} /> {t('view.hero.eyebrow')}
          </span>
          <h1>{t('view.hero.title')}</h1>
          <p>
            <Trans
              t={t}
              i18nKey="view.hero.todayCount"
              count={todayEvents.length}
            >
              Heute stehen <strong>{{ count: todayEvents.length }}</strong>{' '}
              Termine an.
            </Trans>{' '}
            {nextEvent
              ? t('view.hero.nextUp', { title: nextEvent.title })
              : t('view.hero.noNext')}
          </p>
        </div>

        <div className="calendar-hero-actions">
          {canManage && (
            <button
              type="button"
              className="calendar-source-button"
              onClick={() => setIsSourcesOpen(true)}
            >
              <Cloud size={17} />
              {t('view.actions.sources')}
              {calendarSubscriptions.length > 0 && (
                <span>{calendarSubscriptions.length}</span>
              )}
            </button>
          )}
          <button
            type="button"
            className="calendar-add-button"
            onClick={() => {
              setQuickAddDefaultType('event');
              setIsQuickAddOpen(true);
            }}
          >
            <Plus size={18} /> {t('view.actions.newEvent')}
          </button>
        </div>

        <div className="calendar-hero-orbit" aria-hidden="true">
          <CalendarIcon size={48} />
        </div>
      </section>

      <section className="calendar-control-deck">
        <div className="calendar-person-filter" aria-label={t('view.filter.ariaLabel')}>
          <button
            type="button"
            className={selectedMemberFilter === 'all' ? 'is-active' : ''}
            onClick={() => setSelectedMemberFilter('all')}
          >
            <span><UserRound size={16} /></span>
            {t('view.filter.all')}
          </button>
          {members.map(member => (
            <button
              type="button"
              key={member.id}
              className={
                selectedMemberFilter === member.id ? 'is-active' : ''
              }
              style={{ '--member-color': member.color }}
              onClick={() => setSelectedMemberFilter(member.id)}
            >
              <img
                src={member.avatar || DEFAULT_MEMBER_AVATAR}
                onError={event =>
                  handleImgError(event, DEFAULT_MEMBER_AVATAR)
                }
                alt=""
              />
              <span className="calendar-person-name">
                <span
                  className="calendar-person-label"
                  title={member.name}
                >
                  {isManagedProfile(member)
                    ? member.name
                    : member.name.split(' ')[0]}
                </span>
                {isManagedProfile(member) && (
                  <small>{t('view.filter.managed')}</small>
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="calendar-tools">
          <button type="button" onClick={() => setShowPast(value => !value)}>
            <History size={15} />
            {showPast ? t('view.tools.hidePast') : t('view.tools.showPast')}
          </button>
          <button type="button" onClick={exportICS}>
            <Download size={15} /> {t('view.tools.export')}
          </button>
          <label>
            <Upload size={15} /> {t('view.tools.import')}
            <input
              type="file"
              accept=".ics,text/calendar"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </section>

      <section className="calendar-agenda">
        <header className="calendar-agenda-heading">
          <div>
            <span>{t('view.agenda.kicker')}</span>
            <h2>{t('view.agenda.title')}</h2>
          </div>
          <strong>
            {t('view.agenda.count', { count: filteredEvents.length })}
          </strong>
        </header>

        {groupedEvents.length === 0 ? (
          <div className="calendar-empty-state">
            <span><CalendarPlus size={30} /></span>
            <h3>{t('view.empty.title')}</h3>
            <p>{t('view.empty.description')}</p>
            <button
              type="button"
              onClick={() => {
                setQuickAddDefaultType('event');
                setIsQuickAddOpen(true);
              }}
            >
              <Plus size={16} /> {t('view.empty.cta')}
            </button>
          </div>
        ) : (
          <div className="calendar-day-groups">
            {groupedEvents.map(([dateKey, dayEvents]) => (
              <section className="calendar-day-group" key={dateKey}>
                <header>
                  <time dateTime={dateKey}>
                    <strong>{dateKeyFromDay(dateKey)}</strong>
                    <span>{dayHeading(dateKey, todayKey, t)}</span>
                  </time>
                  <i />
                </header>

                <div className="calendar-day-events">
                  {dayEvents.map(event => {
                    const member = members.find(
                      entry => entry.id === event.memberId
                    );
                    const accent =
                      event.sourceColor || member?.color || 'var(--primary)';
                    const reminders = normalizeEventReminders(
                      event.reminders
                    );
                    const lastDate = eventLastDate(event);
                    const formattedLastDate = lastDate !== event.date
                      ? formatDate(dateFromKey(lastDate), {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '';
                    return (
                      <article
                        key={event.id}
                        className={`calendar-event-card ${
                          event.readOnly ? 'is-subscribed' : ''
                        }`}
                        style={{ '--event-color': accent }}
                      >
                        <div className="calendar-event-time">
                          <strong>
                            {event.allDay || !event.time
                              ? t('view.event.allDay')
                              : event.time}
                          </strong>
                          {formattedLastDate ? (
                            <span>
                              {event.allDay
                                ? t('view.event.throughDate', {
                                    date: formattedLastDate
                                  })
                                : t('view.event.untilDateTime', {
                                    date: formattedLastDate,
                                    time: event.endTime || event.time
                                  })}
                            </span>
                          ) : event.endTime ? (
                            <span>
                              {t('view.event.until', { time: event.endTime })}
                            </span>
                          ) : null}
                        </div>

                        <div className="calendar-event-copy">
                          <div className="calendar-event-title">
                            <h3>{event.title}</h3>
                            {event.readOnly && (
                              <span title={t('view.event.fromSubscriptionTitle')}>
                                {event.sharedEventId
                                  ? <HeartHandshake size={12} />
                                  : <LockKeyhole size={12} />}
                                {event.sharedEventId
                                  ? t('view.event.fromFamily', {
                                      name: event.sharedOwnerFamilyName
                                    })
                                  : event.sourceName ||
                                    t('view.event.subscriptionFallback')}
                              </span>
                            )}
                            {!event.readOnly &&
                              event.sharedWithFamilies?.length > 0 && (
                                <span title={t('view.event.sharedWithTitle')}>
                                  <HeartHandshake size={12} />
                                  {t('view.event.sharedWith', {
                                    names: event.sharedWithFamilies
                                      .map(family => family.familyName)
                                      .join(', ')
                                  })}
                                </span>
                              )}
                          </div>
                          <div className="calendar-event-details">
                            {event.location && (
                              <span>
                                <MapPin size={13} /> {event.location}
                              </span>
                            )}
                            <span>
                              <UserRound size={13} />
                              {member
                                ? isManagedProfile(member)
                                  ? t('view.event.memberManaged', {
                                      name: member.name
                                    })
                                  : member.name
                                : t('view.event.wholeFamily')}
                            </span>
                            {reminders.length > 0 && (
                              <span className="calendar-event-reminders">
                                <BellRing size={13} />
                                {reminders
                                  .slice(0, 2)
                                  .map(minutes =>
                                    formatReminderLead(minutes, true, tShared)
                                  )
                                  .join(' · ')}
                                {reminders.length > 2
                                  ? ` +${reminders.length - 2}`
                                  : ''}
                              </span>
                            )}
                          </div>
                          {event.notes && <p>{event.notes}</p>}
                        </div>

                        {event.readOnly ? (
                          <span
                            className="calendar-event-readonly"
                            title={t('view.event.readOnlyTitle')}
                          >
                            <Cloud size={16} />
                          </span>
                        ) : (
                          <div className="calendar-event-actions">
                            {!event.sharedEventId && (
                              <button
                                type="button"
                                className="calendar-event-reminder-button"
                                onClick={() =>
                                  setSelectedReminderEvent(event)
                                }
                                title={t('view.event.editRemindersTitle')}
                                aria-label={t('view.event.editRemindersAria', {
                                  title: event.title
                                })}
                              >
                                <BellRing size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="calendar-event-delete"
                              onClick={() => deleteEvent(event.id)}
                              title={t('view.event.deleteTitle')}
                              aria-label={t('view.event.deleteAria', {
                                title: event.title
                              })}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                        <ChevronRight
                          className="calendar-event-chevron"
                          size={17}
                          aria-hidden="true"
                        />
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <CalendarSubscriptionManager
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
      />
      <EventReminderDialog
        event={selectedReminderEvent}
        onClose={() => setSelectedReminderEvent(null)}
        onSave={(event, reminders) =>
          updateEvent(event.id, { reminders })
        }
      />
    </div>
  );
}

function dateKeyFromDay(value) {
  const date = dateFromKey(value);
  return formatDate(date, {
    day: '2-digit',
    month: 'short'
  });
}
