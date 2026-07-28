import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GOTIFY_RULES,
  DEFAULT_WEB_PUSH_PREFERENCES,
  NOTIFICATION_EVENT_DEFINITIONS
} from '../shared/notificationEvents.js';

test('notification catalog stays complete and internally consistent', () => {
  const keys = NOTIFICATION_EVENT_DEFINITIONS.map(
    definition => definition.key
  );
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys.length >= 16, true);
  keys.forEach(key => {
    assert.equal(
      typeof DEFAULT_WEB_PUSH_PREFERENCES[key],
      'boolean'
    );
    assert.equal(typeof DEFAULT_GOTIFY_RULES[key], 'boolean');
  });
  assert.equal(DEFAULT_WEB_PUSH_PREFERENCES.showPreviews, false);
  assert.equal(DEFAULT_GOTIFY_RULES.includeMessageText, false);
});
