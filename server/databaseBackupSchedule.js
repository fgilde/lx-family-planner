export const DEFAULT_DATABASE_BACKUP_SETTINGS = Object.freeze({
  enabled: false,
  frequency: 'weekly',
  dayOfWeek: 2,
  hour: 20,
  keep: 8,
  lastBackupAt: 0,
  lastAttemptAt: 0,
  lastError: ''
});

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(number)));
}

export function normalizeDatabaseBackupSettings(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    enabled: Boolean(input.enabled),
    frequency: input.frequency === 'daily' ? 'daily' : 'weekly',
    dayOfWeek: boundedInteger(input.dayOfWeek, 2, 0, 6),
    hour: boundedInteger(input.hour, 20, 0, 23),
    keep: boundedInteger(input.keep, 8, 1, 52),
    lastBackupAt: Math.max(0, Number(input.lastBackupAt || 0)),
    lastAttemptAt: Math.max(0, Number(input.lastAttemptAt || 0)),
    lastError: String(input.lastError || '').slice(0, 300)
  };
}

export function databaseBackupScheduledAt(settings, now = new Date()) {
  const normalized = normalizeDatabaseBackupSettings(settings);
  const scheduled = new Date(now);
  scheduled.setHours(normalized.hour, 0, 0, 0);
  if (normalized.frequency === 'weekly') {
    const daysBack =
      (scheduled.getDay() - normalized.dayOfWeek + 7) % 7;
    scheduled.setDate(scheduled.getDate() - daysBack);
  }
  if (scheduled.getTime() > now.getTime()) {
    scheduled.setDate(
      scheduled.getDate() - (normalized.frequency === 'daily' ? 1 : 7)
    );
  }
  return scheduled;
}

export function databaseBackupIsDue(settings, now = new Date()) {
  const normalized = normalizeDatabaseBackupSettings(settings);
  if (!normalized.enabled) return false;
  const scheduledAt = databaseBackupScheduledAt(normalized, now).getTime();
  return (
    normalized.lastBackupAt < scheduledAt &&
    now.getTime() - normalized.lastAttemptAt >= 60 * 60 * 1000
  );
}
