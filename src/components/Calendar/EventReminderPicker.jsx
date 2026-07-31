import React from 'react';
import { useTranslation } from 'react-i18next';
import { BellRing, Check, Clock3 } from 'lucide-react';
import {
  EVENT_REMINDER_OPTIONS,
  formatReminderLead,
  normalizeEventReminders
} from '../../../shared/eventReminders.js';

export default function EventReminderPicker({
  value,
  onChange,
  maxSelections = 6
}) {
  const { t } = useTranslation('calendar');
  const { t: tShared } = useTranslation('shared');
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
          <strong>{t('reminderPicker.title')}</strong>
          <small>{t('reminderPicker.subtitle')}</small>
        </span>
        <b>{selected.length || t('reminderPicker.off')}</b>
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
              {formatReminderLead(option.minutes, false, tShared)}
            </button>
          );
        })}
      </div>

      <p>
        {selected.length
          ? t('reminderPicker.activeHint')
          : t('reminderPicker.inactiveHint')}
      </p>
    </fieldset>
  );
}
