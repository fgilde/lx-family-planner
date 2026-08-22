export const TASK_REPEAT_RULES = new Set([
  'none',
  'daily',
  'weekdays',
  'weekly',
  'monthly',
  'custom'
]);

export const TASK_REPEAT_UNITS = new Set(['days', 'weeks', 'months']);

export function normalizeTaskDate(value, fallback = '') {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return fallback;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return fallback;
  }
  return text;
}

function formatUtcDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

export function nextTaskDueDate(
  currentDate,
  repeatRule,
  anchorDay = 0,
  repeatInterval = 1,
  repeatUnit = 'weeks'
) {
  const normalizedRule = TASK_REPEAT_RULES.has(repeatRule)
    ? repeatRule
    : 'none';
  const normalizedDate = normalizeTaskDate(currentDate);
  if (normalizedRule === 'none' || !normalizedDate) return '';

  const [year, month, day] = normalizedDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (normalizedRule === 'daily') {
    date.setUTCDate(date.getUTCDate() + 1);
    return formatUtcDate(date);
  }

  if (normalizedRule === 'weekdays') {
    do {
      date.setUTCDate(date.getUTCDate() + 1);
    } while ([0, 6].includes(date.getUTCDay()));
    return formatUtcDate(date);
  }

  if (normalizedRule === 'weekly') {
    date.setUTCDate(date.getUTCDate() + 7);
    return formatUtcDate(date);
  }

  if (normalizedRule === 'custom') {
    const interval = Math.max(1, Math.min(365, Number(repeatInterval) || 1));
    const unit = TASK_REPEAT_UNITS.has(repeatUnit) ? repeatUnit : 'weeks';
    if (unit === 'days') {
      date.setUTCDate(date.getUTCDate() + interval);
      return formatUtcDate(date);
    }
    if (unit === 'weeks') {
      date.setUTCDate(date.getUTCDate() + interval * 7);
      return formatUtcDate(date);
    }

    const targetMonthStart = new Date(Date.UTC(year, month - 1 + interval, 1));
    const lastTargetDay = new Date(
      Date.UTC(
        targetMonthStart.getUTCFullYear(),
        targetMonthStart.getUTCMonth() + 1,
        0
      )
    ).getUTCDate();
    const requestedDay = Math.max(1, Math.min(31, Number(anchorDay || day)));
    targetMonthStart.setUTCDate(Math.min(requestedDay, lastTargetDay));
    return formatUtcDate(targetMonthStart);
  }

  const targetMonthStart = new Date(Date.UTC(year, month, 1));
  const lastTargetDay = new Date(
    Date.UTC(
      targetMonthStart.getUTCFullYear(),
      targetMonthStart.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();
  const requestedDay = Math.max(
    1,
    Math.min(31, Number(anchorDay || day))
  );
  targetMonthStart.setUTCDate(Math.min(requestedDay, lastTargetDay));
  return formatUtcDate(targetMonthStart);
}
