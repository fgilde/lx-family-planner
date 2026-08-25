import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calendarTimelineBounds,
  layoutTimelineEvents,
  timelineAllDayEvents,
  timelineEventsForDay
} from '../shared/calendarTimeline.js';

test('calendar timeline stacks overlaps without narrowing the day column', () => {
  const laidOut = layoutTimelineEvents([
    { event: { title: 'Praktikum' }, start: 8 * 60 + 30, end: 16 * 60 },
    { event: { title: 'LILALU' }, start: 8 * 60 + 45, end: 15 * 60 + 30 },
    { event: { title: 'Klettern' }, start: 10 * 60, end: 12 * 60 }
  ]);
  assert.deepEqual(
    laidOut.map(item => [item.event.title, item.stackIndex]),
    [['Praktikum', 0], ['LILALU', 1], ['Klettern', 2]]
  );
});

test('calendar timeline carries timed and all-day events across days safely', () => {
  const events = [
    {
      id: 'trip',
      title: 'Fahrt',
      date: '2026-08-04',
      time: '22:30',
      endDate: '2026-08-05',
      endTime: '09:00'
    },
    {
      id: 'holiday',
      title: 'Urlaub',
      date: '2026-08-04',
      allDay: true,
      endDate: '2026-08-07'
    }
  ];
  const timed = timelineEventsForDay(events, '2026-08-05');
  assert.deepEqual(
    timed.map(item => [item.start, item.end, item.continuesFromPrevious]),
    [[0, 540, true]]
  );
  assert.deepEqual(
    timelineAllDayEvents(events, '2026-08-05').map(event => event.id),
    ['holiday']
  );
  assert.deepEqual(calendarTimelineBounds(timed), {
    startHour: 0,
    endHour: 22
  });
});

test('calendar timeline renders an event without an end as one hour', () => {
  const [event] = timelineEventsForDay([
    { id: 'appointment', title: 'Arzt', date: '2026-08-05', time: '14:00' }
  ], '2026-08-05');
  assert.deepEqual([event.start, event.end], [840, 900]);
});
