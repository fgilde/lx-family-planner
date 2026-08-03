import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarClock,
  CakeSlice,
  Check,
  LockKeyhole,
  MapPin,
  Trash2,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { eventAudienceIds } from '../../../shared/calendarAudience.js';
import { normalizeEventReminders } from '../../../shared/eventReminders.js';
import { birthdayEventCopy } from '../../../shared/birthdays.js';
import EventAudiencePicker from './EventAudiencePicker';
import EventReminderPicker from './EventReminderPicker';

function addLocalDays(value, days) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function formState(event, t) {
  const displayEvent = birthdayEventCopy(event, t);
  return {
    title: displayEvent.title,
    date: event?.date || '',
    time: event?.time || '09:00',
    allDay: Boolean(event?.allDay),
    endDate:
      event?.allDay && event?.endDate
        ? addLocalDays(event.endDate, -1)
        : event?.endDate || '',
    endTime: event?.endTime || '',
    memberIds: eventAudienceIds(event),
    location: displayEvent.location,
    notes: displayEvent.notes,
    reminders: normalizeEventReminders(event?.reminders)
  };
}

export default function CalendarEventDialog({
  event,
  members,
  onClose,
  onSave,
  onDelete
}) {
  const { t } = useTranslation('calendar');
  const [form, setForm] = useState(() => formState(event, t));
  const [saving, setSaving] = useState(false);
  const editable = Boolean(event && !event.readOnly);
  const isBirthday = Boolean(event?.birthdayMemberId);

  useEffect(
    () => setForm(formState(event, t)),
    [event, t]
  );

  useEffect(() => {
    const onKeyDown = keyboardEvent => {
      if (keyboardEvent.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  const endDateInvalid = useMemo(
    () => Boolean(form.endDate && form.date && form.endDate < form.date),
    [form.date, form.endDate]
  );

  if (!event) return null;

  const displayEvent = birthdayEventCopy(event, t);

  const patch = changes => setForm(previous => ({ ...previous, ...changes }));
  const submit = async formEvent => {
    formEvent.preventDefault();
    if (!editable || saving || endDateInvalid) return;
    setSaving(true);
    try {
      const result = await onSave(event, {
        title: form.title.trim(),
        date: form.date,
        time: form.allDay ? '' : form.time,
        allDay: form.allDay,
        endDate:
          form.allDay && form.endDate
            ? addLocalDays(form.endDate, 1)
            : form.endDate,
        endTime: form.allDay ? '' : form.endTime,
        memberIds: form.memberIds,
        memberId: form.memberIds[0] || 'all',
        location: form.location.trim(),
        notes: form.notes.trim(),
        reminders: form.reminders
      });
      if (result) onClose();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editable || saving) return;
    if (!window.confirm(t('editor.deleteConfirm', { title: event.title }))) {
      return;
    }
    setSaving(true);
    try {
      const result = await onDelete(event);
      if (result !== null) onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="calendar-editor-layer"
      onPointerDown={() => !saving && onClose()}
    >
      <form
        className="calendar-editor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-dialog-title"
        onSubmit={submit}
        onPointerDown={pointerEvent => pointerEvent.stopPropagation()}
      >
        <header>
          <span className="calendar-editor-mark">
            {editable
              ? <CalendarClock size={25} />
              : isBirthday
                ? <CakeSlice size={24} />
                : <LockKeyhole size={23} />}
          </span>
          <div>
            <span>
              {editable
                ? t('editor.kicker')
                : isBirthday
                  ? t('editor.birthdayKicker')
                  : t('editor.readOnlyKicker')}
            </span>
            <h2 id="calendar-event-dialog-title">
              {editable ? t('editor.title') : displayEvent.title}
            </h2>
            <p>
              {editable
                ? t('editor.description')
                : isBirthday
                  ? t('editor.birthdayDescription')
                  : t('editor.readOnlyDescription')}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('common:actions.close')}
            disabled={saving}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        <div className="calendar-editor-body">
          <label className="calendar-editor-field is-wide">
            <span>{t('editor.fields.title')}</span>
            <input
              value={form.title}
              onChange={change => patch({ title: change.target.value })}
              disabled={!editable}
              required
              autoFocus={editable}
            />
          </label>

          <label className="calendar-editor-all-day is-wide">
            <input
              type="checkbox"
              checked={form.allDay}
              disabled={!editable}
              onChange={change => patch({
                allDay: change.target.checked,
                endTime: change.target.checked ? '' : form.endTime
              })}
            />
            <span>
              <strong>{t('editor.fields.allDay')}</strong>
              <small>{t('editor.fields.allDayHint')}</small>
            </span>
          </label>

          <label className="calendar-editor-field">
            <span>{t('editor.fields.startDate')}</span>
            <input
              type="date"
              value={form.date}
              disabled={!editable}
              onChange={change => patch({ date: change.target.value })}
              required
            />
          </label>
          {!form.allDay && (
            <label className="calendar-editor-field">
              <span>{t('editor.fields.startTime')}</span>
              <input
                type="time"
                value={form.time}
                disabled={!editable}
                onChange={change => patch({ time: change.target.value })}
                required
              />
            </label>
          )}
          <label className="calendar-editor-field">
            <span>
              {form.allDay
                ? t('editor.fields.endDateInclusive')
                : t('editor.fields.endDate')}
            </span>
            <input
              type="date"
              min={form.date}
              value={form.endDate}
              disabled={!editable}
              onChange={change => patch({ endDate: change.target.value })}
            />
          </label>
          {!form.allDay && (
            <label className="calendar-editor-field">
              <span>{t('editor.fields.endTime')}</span>
              <input
                type="time"
                value={form.endTime}
                disabled={!editable}
                onChange={change => patch({ endTime: change.target.value })}
              />
            </label>
          )}

          <div className="is-wide">
            <EventAudiencePicker
              members={members}
              value={form.memberIds}
              onChange={memberIds => patch({ memberIds })}
              disabled={!editable}
            />
          </div>

          <label className="calendar-editor-field is-wide">
            <span><MapPin size={14} /> {t('editor.fields.location')}</span>
            <input
              value={form.location}
              disabled={!editable}
              onChange={change => patch({ location: change.target.value })}
              placeholder={t('editor.fields.locationPlaceholder')}
            />
          </label>

          <label className="calendar-editor-field is-wide">
            <span>{t('editor.fields.notes')}</span>
            <textarea
              rows="4"
              value={form.notes}
              disabled={!editable}
              onChange={change => patch({ notes: change.target.value })}
            />
          </label>

          <div className="is-wide">
            <EventReminderPicker
              value={form.reminders}
              onChange={reminders => patch({ reminders })}
              disabled={!editable}
            />
          </div>
        </div>

        <footer>
          {editable && (
            <button
              type="button"
              className="calendar-editor-delete"
              disabled={saving}
              onClick={remove}
            >
              <Trash2 size={16} /> {t('editor.delete')}
            </button>
          )}
          <span />
          <button
            type="button"
            className="calendar-editor-cancel"
            disabled={saving}
            onClick={onClose}
          >
            {editable
              ? t('common:actions.cancel')
              : t('common:actions.close')}
          </button>
          {editable && (
            <button
              type="submit"
              className="calendar-editor-save"
              disabled={saving || endDateInvalid}
            >
              <Check size={16} />
              {saving
                ? t('common:status.saving')
                : t('editor.save')}
            </button>
          )}
        </footer>
      </form>
    </div>,
    document.body
  );
}
