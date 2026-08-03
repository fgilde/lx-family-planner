import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventAudienceIds,
  eventAudienceMembers,
  eventIsForEveryone,
  eventIsForMember
} from '../shared/calendarAudience.js';

test('calendar audience keeps legacy events compatible', () => {
  assert.deepEqual(eventAudienceIds({ memberId: 'member-a' }), ['member-a']);
  assert.deepEqual(eventAudienceIds({ memberId: 'all' }), []);
  assert.equal(eventIsForEveryone({}), true);
  assert.equal(eventIsForMember({ memberId: 'all' }, 'member-b'), true);
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
