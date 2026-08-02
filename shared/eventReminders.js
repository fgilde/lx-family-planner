export const EVENT_REMINDER_OPTIONS = Object.freeze([
  { minutes: 10_080, label: '1 Woche vorher', shortLabel: '1 Woche' },
  { minutes: 2_880, label: '2 Tage vorher', shortLabel: '2 Tage' },
  { minutes: 1_440, label: '1 Tag vorher', shortLabel: '1 Tag' },
  { minutes: 720, label: '12 Stunden vorher', shortLabel: '12 Std.' },
  { minutes: 600, label: '10 Stunden vorher', shortLabel: '10 Std.' },
  { minutes: 120, label: '2 Stunden vorher', shortLabel: '2 Std.' },
  { minutes: 60, label: '1 Stunde vorher', shortLabel: '1 Std.' },
  { minutes: 30, label: '30 Minuten vorher', shortLabel: '30 Min.' },
  { minutes: 15, label: '15 Minuten vorher', shortLabel: '15 Min.' },
  { minutes: 10, label: '10 Minuten vorher', shortLabel: '10 Min.' },
  { minutes: 5, label: '5 Minuten vorher', shortLabel: '5 Min.' },
  { minutes: 0, label: 'Wenn es losgeht', shortLabel: 'Zum Start' }
]);

const MAX_REMINDERS_PER_EVENT = 8;
const MAX_REMINDER_MINUTES = 60 * 24 * 7;
const EVENT_GRACE_MS = 5 * 60 * 1000;
export const TRASH_DEFAULT_REMINDERS = Object.freeze([1_440]);

export function normalizeEventReminders(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return [...new Set(
    source
      .map(entry => Number(entry))
      .filter(
        entry =>
          Number.isInteger(entry) &&
          entry >= 0 &&
          entry <= MAX_REMINDER_MINUTES
      )
  )]
    .sort((left, right) => right - left)
    .slice(0, MAX_REMINDERS_PER_EVENT);
}

export function normalizeTrashReminders(value) {
  return normalizeEventReminders(
    value,
    TRASH_DEFAULT_REMINDERS
  );
}

export function trashReminderEvent(record) {
  return {
    ...(record || {}),
    allDay: true,
    time: '',
    memberId: 'all',
    reminders: normalizeTrashReminders(record?.reminders)
  };
}

export function eventStartKey(event) {
  const date = String(event?.date || '');
  const time = event?.allDay
    ? '09:00'
    : String(event?.time || '09:00');
  return `${date}T${time}`;
}

export function eventStartTimestamp(event) {
  const date = String(event?.date || '');
  const time = event?.allDay
    ? '09:00'
    : String(event?.time || '09:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Number.NaN;
  if (!/^\d{2}:\d{2}$/.test(time)) return Number.NaN;
  const timestamp = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

export function selectDueEventReminder(
  event,
  deliveredReminderMinutes = [],
  now = Date.now()
) {
  const startAt = eventStartTimestamp(event);
  if (
    !Number.isFinite(startAt) ||
    startAt < now - EVENT_GRACE_MS
  ) {
    return null;
  }
  const delivered = new Set(
    normalizeEventReminders(deliveredReminderMinutes)
  );
  const due = normalizeEventReminders(event?.reminders).filter(
    minutes =>
      !delivered.has(minutes) &&
      startAt - minutes * 60_000 <= now
  );
  if (!due.length) return null;
  return {
    startAt,
    startKey: eventStartKey(event),
    reminderMinutes: Math.min(...due),
    consumedReminderMinutes: due
  };
}

// `t` ist optional: eine Übersetzungsfunktion (key, options) => string mit
// Schlüsseln aus dem "shared"-Namespace (reminderLead.*, reminderLeadShort.*).
// Ohne `t` bleibt das bisherige deutsche Verhalten erhalten.
export function formatReminderLead(minutes, short = false, t = null) {
  const normalized = Number(minutes);
  if (typeof t === 'function') {
    const prefix = short ? 'reminderLeadShort' : 'reminderLead';
    if (normalized === 0) return t(`${prefix}.atStart`);
    if (normalized % 10_080 === 0) {
      return t(`${prefix}.weeks`, { count: normalized / 10_080 });
    }
    if (normalized % 1_440 === 0) {
      return t(`${prefix}.days`, { count: normalized / 1_440 });
    }
    if (normalized % 60 === 0) {
      return t(`${prefix}.hours`, { count: normalized / 60 });
    }
    return t(`${prefix}.minutes`, { count: normalized });
  }
  const preset = EVENT_REMINDER_OPTIONS.find(
    option => option.minutes === normalized
  );
  if (preset) return short ? preset.shortLabel : preset.label;
  if (normalized === 0) return short ? 'Zum Start' : 'Wenn es losgeht';
  if (normalized % 1_440 === 0) {
    const days = normalized / 1_440;
    return short
      ? `${days} T.`
      : `${days} ${days === 1 ? 'Tag' : 'Tage'} vorher`;
  }
  if (normalized % 60 === 0) {
    const hours = normalized / 60;
    return short
      ? `${hours} Std.`
      : `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'} vorher`;
  }
  return short
    ? `${normalized} Min.`
    : `${normalized} Minuten vorher`;
}

// Optionales `options`-Objekt: { t, locale } – Schlüssel aus dem
// "shared"-Namespace (eventReminder.*). Ohne `t` bleibt Deutsch erhalten.
export function eventReminderMessage(event, now = Date.now(), options = {}) {
  const t = typeof options.t === 'function' ? options.t : null;
  const locale = options.locale || 'de-DE';
  const startAt = eventStartTimestamp(event);
  if (!Number.isFinite(startAt)) {
    return t ? t('eventReminder.fallback') : 'Ein Termin beginnt bald.';
  }
  const minutes = Math.max(0, Math.round((startAt - now) / 60_000));
  let timing;
  if (minutes <= 1) {
    timing = t ? t('eventReminder.startsNow') : 'beginnt jetzt';
  } else if (minutes < 60) {
    timing = t
      ? t('eventReminder.startsInMinutes', { count: minutes })
      : `beginnt in ${minutes} Minuten`;
  } else if (minutes < 1_440) {
    const hours = Math.max(1, Math.round(minutes / 60));
    timing = t
      ? t('eventReminder.startsInHours', { count: hours })
      : `beginnt in ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
  } else {
    const date = new Date(startAt).toLocaleDateString(locale, {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });
    timing = t
      ? t('eventReminder.startsOnDate', { date })
      : `beginnt am ${date}`;
  }
  const location = String(event?.location || '').trim();
  return location ? `${timing} · ${location}` : timing;
}

// Optionales `options`-Objekt: { t } – Schlüssel aus dem "shared"-Namespace
// (trashReminder.*). Ohne `t` bleibt Deutsch erhalten.
export function trashReminderCopy(record, reminderMinutes, options = {}) {
  const t = typeof options.t === 'function' ? options.t : null;
  const title =
    String(record?.title || '').trim() ||
    (t ? t('trashReminder.defaultTitle') : 'Müllabfuhr');
  if (Number(reminderMinutes) === 1_440) {
    return {
      title: t
        ? t('trashReminder.tomorrowTitle', { title })
        : `🗑️ Morgen: ${title}`,
      body: t
        ? t('trashReminder.tomorrowBody', { title })
        : `Morgen wird ${title} abgeholt. Bitte rechtzeitig rausstellen.`
    };
  }
  if (Number(reminderMinutes) === 0) {
    return {
      title: t
        ? t('trashReminder.todayTitle', { title })
        : `🗑️ Heute: ${title}`,
      body: t
        ? t('trashReminder.todayBody', { title })
        : `${title} wird heute abgeholt.`
    };
  }
  const lead = formatReminderLead(reminderMinutes, false, t);
  return {
    title: t
      ? t('trashReminder.reminderTitle', { title })
      : `🗑️ Erinnerung: ${title}`,
    body: t
      ? t('trashReminder.reminderBody', { lead })
      : `Abholung ${lead}. Bitte rechtzeitig rausstellen.`
  };
}
