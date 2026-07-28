import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BellRing,
  CalendarClock,
  Check,
  MapPin,
  X
} from 'lucide-react';
import {
  formatReminderLead,
  normalizeEventReminders
} from '../../../shared/eventReminders.js';
import EventReminderPicker from './EventReminderPicker';

export default function EventReminderDialog({
  event,
  onClose,
  onSave
}) {
  const [reminders, setReminders] = useState(
    normalizeEventReminders(event?.reminders)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReminders(normalizeEventReminders(event?.reminders));
  }, [event]);

  useEffect(() => {
    const onKeyDown = keyboardEvent => {
      if (keyboardEvent.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  if (!event) return null;
  const isTrashReminder = event.reminderKind === 'trash';

  const submit = async formEvent => {
    formEvent.preventDefault();
    setSaving(true);
    try {
      const result = await onSave(event, reminders);
      if (result) onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="event-reminder-layer"
      onPointerDown={() => !saving && onClose()}
    >
      <form
        className="event-reminder-dialog"
        onSubmit={submit}
        onPointerDown={pointerEvent => pointerEvent.stopPropagation()}
      >
        <header>
          <span className="event-reminder-dialog-mark">
            <CalendarClock size={25} />
          </span>
          <div>
            <span>{isTrashReminder ? 'Abhol-Wecker' : 'Termin-Wecker'}</span>
            <h2>{event.title}</h2>
            <p>
              {new Date(`${event.date}T12:00:00`).toLocaleDateString(
                'de-DE',
                {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long'
                }
              )}
              {!event.allDay && event.time ? ` · ${event.time} Uhr` : ''}
              {event.location ? (
                <>
                  {' · '}
                  <MapPin size={12} /> {event.location}
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            aria-label="Schließen"
            disabled={saving}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        <EventReminderPicker
          value={reminders}
          onChange={setReminders}
        />

        <aside>
          <BellRing size={17} />
          <span>
            <strong>
              {reminders.length
                ? reminders
                    .map(minutes => formatReminderLead(minutes))
                    .join(' · ')
                : 'Keine Erinnerung aktiv'}
            </strong>
            Benachrichtigungen müssen im jeweiligen Profil einmal aktiviert
            sein. Der Hinweis erscheint zusätzlich im Familien-Posteingang.
          </span>
        </aside>

        <footer>
          <button
            type="button"
            className="event-reminder-cancel"
            disabled={saving}
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="event-reminder-save"
            disabled={saving}
          >
            {saving ? (
              'Wird gespeichert …'
            ) : (
              <>
                <Check size={16} /> Erinnerungen speichern
              </>
            )}
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}
