import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventAudienceIds,
  eventAudienceMembers,
  eventIsCurrentOrFuture,
  eventIsForEveryone,
  eventIsForMember,
  eventLastDate,
  eventSpansToday
} from '../shared/calendarAudience.js';

test('calendar audience keeps legacy events compatible', () => {
  assert.deepEqual(eventAudienceIds({ memberId: 'member-a' }), ['member-a']);
  assert.deepEqual(eventAudienceIds({ memberId: 'all' }), []);
  assert.equal(eventIsForEveryone({}), true);
  assert.equal(eventIsForMember({ memberId: 'all' }, 'member-b'), true);
});

test('calendar dashboard keeps only current, ongoing and future events', () => {
  assert.equal(
    eventIsCurrentOrFuture({ date: '2026-08-03' }, '2026-08-04'),
    false
  );
  assert.equal(
    eventIsCurrentOrFuture({ date: '2026-08-04' }, '2026-08-04'),
    true
  );
  assert.equal(
    eventIsCurrentOrFuture(
      { date: '2026-08-01', endDate: '2026-08-05' },
      '2026-08-04'
    ),
    true
  );
  assert.equal(eventIsCurrentOrFuture({}, '2026-08-04'), false);
});

test('eventLastDate returns the last visible day of an event', () => {
  assert.equal(eventLastDate({ date: '2026-08-04' }), '2026-08-04');
  assert.equal(
    eventLastDate({ date: '2026-08-01', endDate: '2026-08-05' }),
    '2026-08-05'
  );
  // Ganztägige Termine enden am Vortag des exklusiven endDate.
  assert.equal(
    eventLastDate({ date: '2026-08-01', endDate: '2026-08-05', allDay: true }),
    '2026-08-04'
  );
  // Defensives endDate vor Start bleibt am Startdatum.
  assert.equal(
    eventLastDate({ date: '2026-08-10', endDate: '2026-08-05' }),
    '2026-08-10'
  );
});

test('eventSpansToday is only true for events covering today', () => {
  const today = '2026-08-04';
  // Vergangener Termin
  assert.equal(eventSpansToday({ date: '2026-08-03' }, today), false);
  // Heutiger Termin
  assert.equal(eventSpansToday({ date: '2026-08-04' }, today), true);
  // Zukünftiger Termin
  assert.equal(eventSpansToday({ date: '2026-08-05' }, today), false);
  // Mehrtägig, liegt in der Vergangenheit
  assert.equal(
    eventSpansToday({ date: '2026-08-01', endDate: '2026-08-03' }, today),
    false
  );
  // Mehrtägig, today fällt in den Zeitraum
  assert.equal(
    eventSpansToday({ date: '2026-08-01', endDate: '2026-08-06' }, today),
    true
  );
  // MehrTägig, today ist der letzte Tag
  assert.equal(
    eventSpansToday({ date: '2026-08-02', endDate: '2026-08-04' }, today),
    true
  );
  assert.equal(eventSpansToday({}, today), false);
});

test('calendar audience supports several unique profiles', () => {
  const event = {
    memberId: 'legacy',
    memberIds: ['member-a', 'member-b', 'member-a', '', 'all']
  };
  assert.deepEqual(eventAudienceIds(event), ['member-a', 'member-b']);
  assert.equal(eventIsForMember(event, 'member-a'), true);
  assert.equal(eventIsForMember(event, 'legacy'), false);
  assert.deepEqual(
    eventAudienceMembers(event, [
      { id: 'member-b', name: 'B' },
      { id: 'member-c', name: 'C' },
      { id: 'member-a', name: 'A' }
    ]).map(member => member.id),
    ['member-b', 'member-a']
  );
});
