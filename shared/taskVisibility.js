import { normalizeTaskDate } from './taskRecurrence.js';

function formatUtcDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

export function localTaskDateKey(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function taskIsVisibleOnDate(task, date = localTaskDateKey()) {
  if (!task || task.completed || task.completionStatus === 'pending_approval') {
    return true;
  }
  const dueDate = normalizeTaskDate(task.dueDate || task.occurrenceDate);
  if (!dueDate) return true;

  // Existing tasks keep their previous behaviour until somebody edits them.
  const configuredDays = Number(task.visibilityDaysBefore);
  if (!Number.isFinite(configuredDays)) return true;
  const daysBefore = Math.max(0, Math.min(365, Math.floor(configuredDays)));
  const [year, month, day] = dueDate.split('-').map(Number);
  const visibleFrom = new Date(Date.UTC(year, month - 1, day));
  visibleFrom.setUTCDate(visibleFrom.getUTCDate() - daysBefore);
  return date >= formatUtcDate(visibleFrom);
}
