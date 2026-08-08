import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calendarDaysForView,
  calendarEventsForDay,
  shiftCalendarAnchor,
  startOfCalendarWeek
} from '../shared/calendarGrid.js';

test('calendar grid starts weeks on Monday and keeps complete months', () => {
  assert.equal(startOfCalendarWeek('2026-08-05'), '2026-08-03');
  assert.deepEqual(calendarDaysForView('2026-08-05', 'week'), [
    '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06',
    '2026-08-07', '2026-08-08', '2026-08-09'
  ]);
  const august = calendarDaysForView('2026-08-05', 'month');
  assert.equal(august[0], '2026-07-27');
  assert.equal(august.at(-1), '2026-09-06');
  assert.equal(august.length, 42);
});

test('calendar grid keeps multi-day events visible on every covered day', () => {
  const events = [
    { id: 'trip', title: 'Kurzurlaub', date: '2026-08-04', endDate: '2026-08-06' },
    { id: 'meeting', title: 'Arzt', date: '2026-08-05', time: '09:00' }
  ];
  assert.deepEqual(
    calendarEventsForDay(events, '2026-08-05').map(event => event.id),
    ['trip', 'meeting']
  );
  assert.deepEqual(
    calendarEventsForDay(events, '2026-08-07').map(event => event.id),
    []
  );
});

test('calendar navigation advances weeks and months predictably', () => {
  assert.equal(shiftCalendarAnchor('2026-08-05', 'week', -1), '2026-07-29');
  assert.equal(shiftCalendarAnchor('2026-08-05', 'month', 1), '2026-09-05');
});
