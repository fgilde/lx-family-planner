import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nativePushPermissionNeedsPrompt
} from '../src/hooks/useNativePushNotifications.js';

test('native Android push requests both supported prompt states', () => {
  assert.equal(nativePushPermissionNeedsPrompt('prompt'), true);
  assert.equal(
    nativePushPermissionNeedsPrompt('prompt-with-rationale'),
    true
  );
  assert.equal(nativePushPermissionNeedsPrompt('granted'), false);
  assert.equal(nativePushPermissionNeedsPrompt('denied'), false);
});
