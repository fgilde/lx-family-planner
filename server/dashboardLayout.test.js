import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dashboardLayoutForTrash,
  normalizeDashboardLayout
} from '../src/utils/dashboardLayout.js';

test('trash widget can appear only within its configured pickup window', () => {
  const layout = normalizeDashboardLayout({
    preferences: {
      trashVisibility: 'upcoming',
      trashWindowDays: 3
    }
  }, ['calendar', 'trash']);
  assert.deepEqual(
    dashboardLayoutForTrash(layout, '2026-08-07', '2026-08-03').hidden,
    ['trash']
  );
  assert.deepEqual(
    dashboardLayoutForTrash(layout, '2026-08-06', '2026-08-03').hidden,
    []
  );
});

test('trash visibility preferences survive layout normalization', () => {
  const layout = normalizeDashboardLayout({
    preferences: { trashVisibility: 'never', trashWindowDays: 99 }
  }, ['trash', 'tasks']);
  assert.equal(layout.preferences.trashVisibility, 'never');
  assert.equal(layout.preferences.trashWindowDays, 30);
});
