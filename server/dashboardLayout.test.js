import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dashboardPreviewItems,
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

test('tablet preview limits are normalized and can show every item', () => {
  const layout = normalizeDashboardLayout({
    preferences: { tabletEventLimit: '8', tabletTaskLimit: 'all' }
  }, ['calendar', 'tasks']);
  assert.equal(layout.preferences.tabletEventLimit, '8');
  assert.equal(layout.preferences.tabletTaskLimit, 'all');
  assert.deepEqual(dashboardPreviewItems([1, 2, 3, 4, 5], '4'), [1, 2, 3, 4]);
  assert.deepEqual(dashboardPreviewItems([1, 2, 3, 4, 5], 'all'), [1, 2, 3, 4, 5]);
  assert.deepEqual(dashboardPreviewItems([1, 2, 3, 4, 5], 'invalid'), [1, 2, 3, 4]);
});

test('trash visibility preferences survive layout normalization', () => {
  const layout = normalizeDashboardLayout({
    preferences: { trashVisibility: 'never', trashWindowDays: 99 }
  }, ['trash', 'tasks']);
  assert.equal(layout.preferences.trashVisibility, 'never');
  assert.equal(layout.preferences.trashWindowDays, 30);
});
