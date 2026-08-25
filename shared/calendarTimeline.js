import { eventLastDate } from './calendarAudience.js';

export function timeToMinutes(value, fallback = 0) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}

function timedSegmentForDay(event, dateKey) {
  const starts = String(event?.date || '').slice(0, 10);
  const ends = String(eventLastDate(event)).slice(0, 10);
  if (!starts || !ends || starts > dateKey || ends < dateKey) return null;
  if (event?.allDay || !event?.time) return null;

  const startsToday = starts === dateKey;
  const endsToday = ends === dateKey;
  const start = startsToday ? timeToMinutes(event.time) : 0;
  let end = 24 * 60;
  if (endsToday) {
    end = event.endTime
      ? timeToMinutes(event.endTime, start + 60)
      // LX shows appointments without an end as one-hour entries elsewhere.
      // A timed multi-day event still ends at its original start time.
      : startsToday
        ? start + 60
        : timeToMinutes(event.time, 60);
  }

  return {
    event,
    start: Math.max(0, Math.min(24 * 60 - 1, start)),
    end: Math.max(start + 1, Math.min(24 * 60, end)),
    continuesFromPrevious: !startsToday,
    continuesToNext: !endsToday
  };
}

export function timelineEventsForDay(events, dateKey) {
  return (Array.isArray(events) ? events : [])
    .map(event => timedSegmentForDay(event, dateKey))
    .filter(Boolean)
    .sort((left, right) =>
      left.start - right.start ||
      right.end - left.end ||
      String(left.event?.title || '').localeCompare(String(right.event?.title || ''))
    );
}

export function timelineAllDayEvents(events, dateKey) {
  return (Array.isArray(events) ? events : [])
    .filter(event => {
      const starts = String(event?.date || '').slice(0, 10);
      const ends = String(eventLastDate(event)).slice(0, 10);
      return starts && ends && starts <= dateKey && ends >= dateKey &&
        (event?.allDay || !event?.time);
    })
    .sort((left, right) => String(left.title || '').localeCompare(String(right.title || '')));
}

/**
 * Keep a day column stable when events collide. The calendar reference uses
 * stacked cards instead of turning one day into increasingly narrow columns.
 * A small, capped offset keeps the coloured edges of concurrent cards visible.
 */
export function layoutTimelineEvents(segments) {
  const sorted = (Array.isArray(segments) ? segments : [])
    .map(segment => ({ ...segment }))
    .sort((left, right) => left.start - right.start || right.end - left.end);
  let active = [];

  sorted.forEach(segment => {
    active = active.filter(item => item.end > segment.start);
    segment.stackIndex = Math.min(active.length, 3);
    active.push(segment);
  });

  return sorted;
}

export function calendarTimelineBounds(segments) {
  const values = Array.isArray(segments) ? segments : [];
  const earliest = values.reduce(
    (lowest, segment) => Math.min(lowest, Number(segment?.start ?? lowest)),
    6 * 60
  );
  const latest = values.reduce(
    (highest, segment) => Math.max(highest, Number(segment?.end ?? highest)),
    22 * 60
  );
  const startHour = Math.max(0, Math.floor(earliest / 60));
  const endHour = Math.min(24, Math.max(startHour + 1, Math.ceil(latest / 60)));
  return { startHour, endHour };
}
