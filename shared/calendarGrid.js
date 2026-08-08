import { eventLastDate } from './calendarAudience.js';

function asDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calendarDateKey(value) {
  const date = asDate(value);
  if (!date) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

export function addCalendarDays(value, amount) {
  const date = asDate(value);
  if (!date) return '';
  date.setDate(date.getDate() + Number(amount || 0));
  return calendarDateKey(date);
}

export function startOfCalendarWeek(value) {
  const date = asDate(value);
  if (!date) return '';
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return calendarDateKey(date);
}

export function calendarDaysForView(anchorDate, view) {
  const anchor = asDate(anchorDate);
  if (!anchor) return [];
  if (view === 'week') {
    const start = startOfCalendarWeek(anchor);
    return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
  }
  if (view !== 'month') return [];

  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const start = startOfCalendarWeek(monthStart);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
  const end = new Date(monthEnd.getTime());
  end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
  const numberOfDays = Math.round(
    (end.getTime() - asDate(start).getTime()) / 86_400_000
  ) + 1;
  return Array.from(
    { length: numberOfDays },
    (_, index) => addCalendarDays(start, index)
  );
}

export function calendarEventsForDay(events, dateKey) {
  const target = calendarDateKey(dateKey);
  if (!target) return [];
  return (Array.isArray(events) ? events : [])
    .filter(event => {
      const starts = calendarDateKey(event?.date);
      const ends = calendarDateKey(eventLastDate(event));
      return starts && starts <= target && (!ends || ends >= target);
    })
    .sort((left, right) => {
      const leftTime = String(left?.time || '00:00');
      const rightTime = String(right?.time || '00:00');
      return leftTime.localeCompare(rightTime) ||
        String(left?.title || '').localeCompare(String(right?.title || ''));
    });
}

export function shiftCalendarAnchor(anchorDate, view, direction) {
  const date = asDate(anchorDate);
  if (!date) return '';
  if (view === 'month') {
    date.setMonth(date.getMonth() + Number(direction || 0));
    return calendarDateKey(date);
  }
  return addCalendarDays(date, Number(direction || 0) * 7);
}
