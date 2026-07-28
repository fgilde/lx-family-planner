export const EVENT_REMINDER_OPTIONS = Object.freeze([
  { minutes: 10_080, label: '1 Woche vorher', shortLabel: '1 Woche' },
  { minutes: 2_880, label: '2 Tage vorher', shortLabel: '2 Tage' },
  { minutes: 1_440, label: '1 Tag vorher', shortLabel: '1 Tag' },
  { minutes: 600, label: '10 Stunden vorher', shortLabel: '10 Std.' },
  { minutes: 120, label: '2 Stunden vorher', shortLabel: '2 Std.' },
  { minutes: 60, label: '1 Stunde vorher', shortLabel: '1 Std.' },
  { minutes: 30, label: '30 Minuten vorher', shortLabel: '30 Min.' },
  { minutes: 10, label: '10 Minuten vorher', shortLabel: '10 Min.' },
  { minutes: 5, label: '5 Minuten vorher', shortLabel: '5 Min.' },
  { minutes: 0, label: 'Wenn es losgeht', shortLabel: 'Zum Start' }
]);

const MAX_REMINDERS_PER_EVENT = 8;
const MAX_REMINDER_MINUTES = 60 * 24 * 7;
const EVENT_GRACE_MS = 5 * 60 * 1000;

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

export function formatReminderLead(minutes, short = false) {
  const normalized = Number(minutes);
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

export function eventReminderMessage(event, now = Date.now()) {
  const startAt = eventStartTimestamp(event);
  if (!Number.isFinite(startAt)) return 'Ein Termin beginnt bald.';
  const minutes = Math.max(0, Math.round((startAt - now) / 60_000));
  let timing;
  if (minutes <= 1) {
    timing = 'beginnt jetzt';
  } else if (minutes < 60) {
    timing = `beginnt in ${minutes} Minuten`;
  } else if (minutes < 1_440) {
    const hours = Math.max(1, Math.round(minutes / 60));
    timing = `beginnt in ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
  } else {
    const date = new Date(startAt).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });
    timing = `beginnt am ${date}`;
  }
  const location = String(event?.location || '').trim();
  return location ? `${timing} · ${location}` : timing;
}
