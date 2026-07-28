import React from 'react';
import { BellRing, Check, Clock3 } from 'lucide-react';
import {
  EVENT_REMINDER_OPTIONS,
  normalizeEventReminders
} from '../../../shared/eventReminders.js';

export default function EventReminderPicker({
  value,
  onChange,
  maxSelections = 6
}) {
  const selected = normalizeEventReminders(value);

  const toggle = minutes => {
    if (selected.includes(minutes)) {
      onChange(selected.filter(entry => entry !== minutes));
      return;
    }
    if (selected.length >= maxSelections) return;
    onChange(normalizeEventReminders([...selected, minutes]));
  };

  return (
    <fieldset className="event-reminder-picker">
      <legend>
        <span className="event-reminder-picker-icon">
          <BellRing size={17} />
        </span>
        <span>
          <strong>Erinnerungen</strong>
          <small>Mehrere Zeitpunkte sind möglich</small>
        </span>
        <b>{selected.length || 'Aus'}</b>
      </legend>

      <div className="event-reminder-options">
        {EVENT_REMINDER_OPTIONS.map(option => {
          const active = selected.includes(option.minutes);
          const limitReached =
            !active && selected.length >= maxSelections;
          return (
            <button
              type="button"
              key={option.minutes}
              className={active ? 'is-selected' : ''}
              aria-pressed={active}
              disabled={limitReached}
              onClick={() => toggle(option.minutes)}
            >
              <span>
                {active
                  ? <Check size={14} />
                  : <Clock3 size={14} />}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>

      <p>
        {selected.length
          ? 'LX erinnert das ausgewählte Profil auf allen freigeschalteten Geräten.'
          : 'Ohne Auswahl wird für diesen Termin keine Erinnerung gesendet.'}
      </p>
    </fieldset>
  );
}
