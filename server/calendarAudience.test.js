import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventAudienceIds,
  eventAudienceMembers,
  eventIsCurrentOrFuture,
  eventIsForEveryone,
  eventIsForMember
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
