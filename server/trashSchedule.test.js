import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupTrashEventsByDate,
  trashGroupIcons,
  trashGroupTitle
} from '../shared/trashSchedule.js';

test('trash pickups on the same day become one readable schedule group', () => {
  const groups = groupTrashEventsByDate([
    { id: 'bio', title: 'Bio', type: 'bio', date: '2026-08-07' },
    { id: 'rest', title: 'Restmüll', type: 'rest', date: '2026-08-07' },
    { id: 'paper', title: 'Papier', type: 'papier', date: '2026-08-10' }
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].items.map(item => item.id), ['bio', 'rest']);
  assert.equal(trashGroupTitle(groups[0]), 'Bio · Restmüll');
});

test('trash dashboard symbols reflect the bin types in a grouped pickup', () => {
  const groups = groupTrashEventsByDate([
    { id: 'paper', title: 'Papier', type: 'papier', date: '2026-08-07' },
    { id: 'yellow', title: 'Gelber Sack', type: 'gelb', date: '2026-08-07' }
  ]);
  assert.deepEqual(trashGroupIcons(groups[0]), ['🟡', '📦']);
});
