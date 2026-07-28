import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BellOff,
  Plus,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import {
  formatReminderLead,
  normalizeTrashReminders,
  TRASH_DEFAULT_REMINDERS
} from '../../../shared/eventReminders.js';
import { useFamily } from '../../context/FamilyContext';
import { parseICSContent } from '../../utils/icsUtils';
import EventReminderDialog from './EventReminderDialog';
import EventReminderPicker from './EventReminderPicker';

const TRASH_TYPES = [
  {
    id: 'rest',
    name: 'Restmüll (Schwarze Tonne)',
    color: '#4b5563',
    icon: '🗑️'
  },
  {
    id: 'papier',
    name: 'Altpapier (Blaue Tonne)',
    color: '#2563eb',
    icon: '📦'
  },
  {
    id: 'bio',
    name: 'Biomüll (Braune/Grüne Tonne)',
    color: '#15803d',
    icon: '🍎'
  },
  {
    id: 'gelb',
    name: 'Gelber Sack / Wertstoff',
    color: '#d97706',
    icon: '🟡'
  }
];

export const INITIAL_TRASH_EVENTS = [
  {
    id: 'trsh-1',
    title: 'Restmüll (Schwarze Tonne)',
    date: new Date(Date.now() + 86_400_000).toISOString().split('T')[0],
    type: 'rest',
    reminders: [...TRASH_DEFAULT_REMINDERS]
  },
  {
    id: 'trsh-2',
    title: 'Altpapier (Blaue Tonne)',
    date: new Date(Date.now() + 86_400_000 * 3).toISOString().split('T')[0],
    type: 'papier',
    reminders: [...TRASH_DEFAULT_REMINDERS]
  },
  {
    id: 'trsh-3',
    title: 'Biomüll (Braune Tonne)',
    date: new Date(Date.now() + 86_400_000 * 5).toISOString().split('T')[0],
    type: 'bio',
    reminders: [...TRASH_DEFAULT_REMINDERS]
  },
  {
    id: 'trsh-4',
    title: 'Gelber Sack',
    date: new Date(Date.now() + 86_400_000 * 7).toISOString().split('T')[0],
    type: 'gelb',
    reminders: [...TRASH_DEFAULT_REMINDERS]
  }
];

function detectTrashType(title) {
  const normalized = String(title || '').toLocaleLowerCase('de-DE');
  if (normalized.includes('papier') || normalized.includes('blau')) {
    return 'papier';
  }
  if (
    normalized.includes('bio') ||
    normalized.includes('braun') ||
    normalized.includes('grün')
  ) {
    return 'bio';
  }
  if (
    normalized.includes('gelb') ||
    normalized.includes('wertstoff') ||
    normalized.includes('sack')
  ) {
    return 'gelb';
  }
  return 'rest';
}

function localTrashDate(date) {
  return new Date(`${date}T12:00:00`);
}

export default function TrashCalendarView() {
  const {
    showToast,
    trashEvents,
    addTrashEvent,
    addTrashEvents,
    updateTrashEvent,
    deleteTrashEvent,
    activeHousehold
  } = useFamily();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('Restmüll (Schwarze Tonne)');
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newType, setNewType] = useState('rest');
  const [newReminders, setNewReminders] = useState([
    ...TRASH_DEFAULT_REMINDERS
  ]);
  const [reminderEvent, setReminderEvent] = useState(null);

  const upcomingTrash = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return trashEvents
      .filter(
        item =>
          item.date >= today &&
          (item.household || 'familie') === activeHousehold
      )
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [activeHousehold, trashEvents]);

  const closeAddDialog = () => {
    setIsAddOpen(false);
    setNewReminders([...TRASH_DEFAULT_REMINDERS]);
  };

  const handleImportTrashICS = event => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async loadEvent => {
      const parsed = parseICSContent(loadEvent.target.result);
      if (!parsed.length) {
        showToast(
          'Import nicht möglich',
          'In dieser Datei wurden keine Mülltermine gefunden.',
          'warning'
        );
        return;
      }

      const importedTrash = parsed.map(entry => ({
        id: `trsh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: entry.title,
        date: entry.date,
        type: detectTrashType(entry.title),
        reminders: [...TRASH_DEFAULT_REMINDERS]
      }));
      const result = await addTrashEvents(importedTrash);
      if (!result) return;
      showToast(
        'Müllkalender importiert',
        `${importedTrash.length} Abholtermine wurden übernommen und erinnern standardmäßig einen Tag vorher.`,
        'success'
      );
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleAddManual = async event => {
    event.preventDefault();
    const result = await addTrashEvent({
      id: `trsh-${Date.now()}`,
      title: newTitle,
      date: newDate,
      type: newType,
      reminders: newReminders
    });
    if (!result) return;
    closeAddDialog();
    showToast(
      'Mülltermin eingetragen',
      `Die Abholung am ${localTrashDate(newDate).toLocaleDateString('de-DE')} ist gespeichert.`,
      'success'
    );
  };

  const saveTrashReminders = async (event, reminders) => {
    const result = await updateTrashEvent(event.id, { reminders });
    if (result) {
      showToast(
        reminders.length ? 'Erinnerung gespeichert' : 'Erinnerung ausgeschaltet',
        reminders.length
          ? `LX erinnert ${reminders
              .map(minutes => formatReminderLead(minutes))
              .join(', ')}.`
          : `Für ${event.title} wird keine Erinnerung gesendet.`,
        'success'
      );
    }
    return result;
  };

  const nextPickup = upcomingTrash[0];
  const nextType = nextPickup
    ? TRASH_TYPES.find(type => type.id === nextPickup.type) || TRASH_TYPES[0]
    : null;

  return (
    <div className="trash-calendar">
      <section className="card trash-calendar-header">
        <div className="trash-calendar-heading">
          <span className="trash-calendar-heading-mark">
            <Trash2 size={25} />
          </span>
          <div>
            <h2 className="card-title">Digitaler Müllkalender</h2>
            <p>
              Importiere die .ics-Datei eures Entsorgers oder trage eine
              Abholung selbst ein. LX erinnert standardmäßig am Vortag.
            </p>
          </div>
        </div>

        <div className="trash-calendar-actions">
          <label className="btn-secondary trash-calendar-import">
            <Upload size={16} /> Müllkalender importieren
            <input
              type="file"
              accept=".ics,text/calendar"
              onChange={handleImportTrashICS}
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus size={16} /> Termin eintragen
          </button>
        </div>
      </section>

      {nextPickup ? (
        <section className="trash-next-pickup">
          <div className="trash-next-pickup-main">
            <span className="trash-next-pickup-icon">{nextType.icon}</span>
            <div>
              <span>Nächste Müllabfuhr</span>
              <h3>{nextPickup.title}</h3>
              <p>
                {localTrashDate(nextPickup.date).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </p>
            </div>
          </div>
          <div className="trash-next-pickup-callout">Tonne rausstellen</div>
        </section>
      ) : null}

      <section className="card trash-schedule">
        <header>
          <div>
            <span>Abholplan</span>
            <h3>Anstehende Termine</h3>
          </div>
          <b>{upcomingTrash.length}</b>
        </header>

        {!upcomingTrash.length ? (
          <div className="trash-schedule-empty">
            <span>🗓️</span>
            <strong>Noch keine Abholtermine</strong>
            <p>Lade die .ics-Datei eures Entsorgers hoch.</p>
          </div>
        ) : (
          <div className="trash-schedule-list">
            {upcomingTrash.map(item => {
              const type =
                TRASH_TYPES.find(entry => entry.id === item.type) ||
                TRASH_TYPES[0];
              const reminders = normalizeTrashReminders(item.reminders);
              return (
                <article
                  key={item.id}
                  className="trash-schedule-row"
                  style={{ '--trash-color': type.color }}
                >
                  <span className="trash-schedule-icon">{type.icon}</span>
                  <div className="trash-schedule-copy">
                    <strong>{item.title}</strong>
                    <span>
                      {localTrashDate(item.date).toLocaleDateString('de-DE', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <button
                      type="button"
                      className={
                        reminders.length
                          ? 'trash-reminder-summary is-active'
                          : 'trash-reminder-summary'
                      }
                      onClick={() =>
                        setReminderEvent({
                          ...item,
                          allDay: true,
                          reminderKind: 'trash',
                          reminders
                        })
                      }
                    >
                      {reminders.length ? (
                        <Bell size={13} />
                      ) : (
                        <BellOff size={13} />
                      )}
                      {reminders.length
                        ? reminders
                            .map(minutes => formatReminderLead(minutes, true))
                            .join(' · ')
                        : 'Erinnerung aus'}
                    </button>
                  </div>
                  <div className="trash-schedule-row-actions">
                    <button
                      type="button"
                      className="icon-circle-btn"
                      onClick={() =>
                        setReminderEvent({
                          ...item,
                          allDay: true,
                          reminderKind: 'trash',
                          reminders
                        })
                      }
                      title="Erinnerung ändern"
                      aria-label={`Erinnerung für ${item.title} ändern`}
                    >
                      <Bell size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-circle-btn trash-delete-button"
                      onClick={() => deleteTrashEvent(item.id)}
                      title="Termin entfernen"
                      aria-label={`${item.title} entfernen`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isAddOpen
        ? createPortal(
          <div className="modal-backdrop" onClick={closeAddDialog}>
          <div
            className="modal-card trash-add-dialog"
            onClick={event => event.stopPropagation()}
          >
            <div className="card-header">
              <div>
                <span className="trash-dialog-eyebrow">Neue Abholung</span>
                <h2 className="card-title">Mülltermin eintragen</h2>
              </div>
              <button
                type="button"
                className="icon-circle-btn"
                onClick={closeAddDialog}
                aria-label="Schließen"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddManual}>
              <div className="form-group">
                <label className="form-label">Müllart</label>
                <select
                  className="form-select"
                  value={newType}
                  onChange={event => {
                    setNewType(event.target.value);
                    const type = TRASH_TYPES.find(
                      item => item.id === event.target.value
                    );
                    if (type) setNewTitle(type.name);
                  }}
                >
                  {TRASH_TYPES.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Bezeichnung</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTitle}
                  onChange={event => setNewTitle(event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Abholdatum</label>
                <input
                  type="date"
                  className="form-input"
                  value={newDate}
                  onChange={event => setNewDate(event.target.value)}
                  required
                />
              </div>

              <EventReminderPicker
                value={newReminders}
                onChange={setNewReminders}
              />

              <div className="trash-add-actions">
                <button type="button" className="btn-secondary" onClick={closeAddDialog}>
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary">
                  Termin speichern
                </button>
              </div>
            </form>
          </div>
          </div>,
          document.body
        )
        : null}

      <EventReminderDialog
        event={reminderEvent}
        onClose={() => setReminderEvent(null)}
        onSave={saveTrashReminders}
      />
    </div>
  );
}
