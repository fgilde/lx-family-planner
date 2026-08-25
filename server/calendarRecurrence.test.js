import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarRecurrenceRRule,
  expandCalendarEventSeries,
  normalizeCalendarRecurrence
} from '../shared/calendarRecurrence.js';

test('weekly calendar series keeps its weekday and supports an end date', () => {
  const event = {
    id: 'football',
    title: 'Fußball',
    date: '2026-08-03',
    time: '17:00',
    recurrenceRule: 'weekly',
    recurrenceUntil: '2026-08-17'
  };
  const occurrences = expandCalendarEventSeries([event], {
    rangeStart: '2026-08-01',
    rangeEnd: '2026-08-31'
  });
  assert.deepEqual(
    occurrences.map(entry => entry.date),
    ['2026-08-03', '2026-08-10', '2026-08-17']
  );
  assert.ok(occurrences.every(entry => entry.seriesId === 'football'));
  assert.equal(
    calendarRecurrenceRRule(event),
    'FREQ=WEEKLY;BYDAY=MO;UNTIL=20260817T235959'
  );
});

test('custom calendar series preserves an overnight end date', () => {
  const occurrences = expandCalendarEventSeries([{
    id: 'night-shift',
    date: '2026-01-30',
    time: '22:00',
    endDate: '2026-01-31',
    endTime: '01:00',
    recurrenceRule: 'custom',
    recurrenceInterval: 1,
    recurrenceUnit: 'months'
  }], {
    rangeStart: '2026-02-01',
    rangeEnd: '2026-03-31'
  });
  assert.deepEqual(
    occurrences.map(entry => [entry.date, entry.endDate]),
    [
      ['2026-02-28', '2026-03-01'],
      ['2026-03-30', '2026-03-31']
    ]
  );
});

test('invalid recurrence settings fall back to a single event', () => {
  assert.deepEqual(
    normalizeCalendarRecurrence({
      recurrenceRule: 'every-minute',
      recurrenceInterval: 0,
      recurrenceUnit: 'years',
      recurrenceUntil: 'tomorrow'
    }),
    {
      recurrenceRule: 'none',
      recurrenceInterval: 1,
      recurrenceUnit: 'weeks',
      recurrenceUntil: ''
    }
  );
});
