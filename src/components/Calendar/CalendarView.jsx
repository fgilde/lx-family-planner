import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarPlus,
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
import CalendarSubscriptionManager from './CalendarSubscriptionManager';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(value) {
  return new Date(`${value}T12:00:00`);
}

function dayHeading(dateKey, todayKey) {
  const date = dateFromKey(dateKey);
  const tomorrow = new Date(dateFromKey(todayKey).getTime() + 86_400_000);
  if (dateKey === todayKey) return 'Heute';
  if (dateKey === localDateKey(tomorrow)) return 'Morgen';
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function eventDateValue(event) {
  return new Date(`${event.date}T${event.time || '00:00'}:00`).getTime();
}

export default function CalendarView() {
  const {
    events,
    deleteEvent,
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
        .filter(event => showPast || event.date >= todayKey)
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
      const date = event.date || todayKey;
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date).push(event);
    });
    return [...groups.entries()];
  }, [filteredEvents, todayKey]);

  const todayEvents = householdEvents.filter(event => event.date === todayKey);
  const upcomingEvents = householdEvents
    .filter(event => event.date >= todayKey)
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
            <Radio size={13} /> Familienzeit
          </span>
          <h1>Euer Kalender, ohne Terminchaos.</h1>
          <p>
            Heute stehen <strong>{todayEvents.length}</strong>{' '}
            {todayEvents.length === 1 ? 'Termin' : 'Termine'} an.
            {nextEvent
              ? ` Als Nächstes: ${nextEvent.title}.`
              : ' Der nächste freie Moment gehört euch.'}
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
              Kalenderquellen
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
            <Plus size={18} /> Neuer Termin
          </button>
        </div>

        <div className="calendar-hero-orbit" aria-hidden="true">
          <CalendarIcon size={48} />
        </div>
      </section>

      <section className="calendar-control-deck">
        <div className="calendar-person-filter" aria-label="Personen filtern">
          <button
            type="button"
            className={selectedMemberFilter === 'all' ? 'is-active' : ''}
            onClick={() => setSelectedMemberFilter('all')}
          >
            <span><UserRound size={16} /></span>
            Alle
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
                {isManagedProfile(member) && <small>verwaltet</small>}
              </span>
            </button>
          ))}
        </div>

        <div className="calendar-tools">
          <button type="button" onClick={() => setShowPast(value => !value)}>
            <History size={15} />
            {showPast ? 'Vergangene aus' : 'Vergangene zeigen'}
          </button>
          <button type="button" onClick={exportICS}>
            <Download size={15} /> Export
          </button>
          <label>
            <Upload size={15} /> Datei importieren
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
            <span>Agenda</span>
            <h2>Was als Nächstes ansteht</h2>
          </div>
          <strong>{filteredEvents.length} Termine</strong>
        </header>

        {groupedEvents.length === 0 ? (
          <div className="calendar-empty-state">
            <span><CalendarPlus size={30} /></span>
            <h3>Hier ist noch Platz für Schönes</h3>
            <p>
              Trage einen Termin ein oder verbinde einen bestehenden Kalender.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuickAddDefaultType('event');
                setIsQuickAddOpen(true);
              }}
            >
              <Plus size={16} /> Ersten Termin eintragen
            </button>
          </div>
        ) : (
          <div className="calendar-day-groups">
            {groupedEvents.map(([dateKey, dayEvents]) => (
              <section className="calendar-day-group" key={dateKey}>
                <header>
                  <time dateTime={dateKey}>
                    <strong>{dateKeyFromDay(dateKey)}</strong>
                    <span>{dayHeading(dateKey, todayKey)}</span>
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
                              ? 'Ganztags'
                              : event.time}
                          </strong>
                          {event.endTime && (
                            <span>bis {event.endTime}</span>
                          )}
                        </div>

                        <div className="calendar-event-copy">
                          <div className="calendar-event-title">
                            <h3>{event.title}</h3>
                            {event.readOnly && (
                              <span title="Aus einem Kalenderabo">
                                {event.sharedEventId
                                  ? <HeartHandshake size={12} />
                                  : <LockKeyhole size={12} />}
                                {event.sharedEventId
                                  ? `Von ${event.sharedOwnerFamilyName}`
                                  : event.sourceName || 'Kalenderabo'}
                              </span>
                            )}
                            {!event.readOnly &&
                              event.sharedWithFamilies?.length > 0 && (
                                <span title="Mit verbundenen Familien geteilt">
                                  <HeartHandshake size={12} />
                                  Mit {event.sharedWithFamilies
                                    .map(family => family.familyName)
                                    .join(', ')}
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
                                ? `${member.name}${
                                    isManagedProfile(member)
                                      ? ' · verwaltet'
                                      : ''
                                  }`
                                : 'Ganze Familie'}
                            </span>
                          </div>
                          {event.notes && <p>{event.notes}</p>}
                        </div>

                        {event.readOnly ? (
                          <span
                            className="calendar-event-readonly"
                            title="Dieser Termin wird von der Kalenderquelle verwaltet"
                          >
                            <Cloud size={16} />
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="calendar-event-delete"
                            onClick={() => deleteEvent(event.id)}
                            title="Termin löschen"
                            aria-label={`${event.title} löschen`}
                          >
                            <Trash2 size={16} />
                          </button>
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
    </div>
  );
}

function dateKeyFromDay(value) {
  const date = dateFromKey(value);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short'
  });
}
