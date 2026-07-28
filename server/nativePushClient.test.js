import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNativeInstallationId,
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

test('native Android installations always receive a valid local id', () => {
  const installationId = createNativeInstallationId();
  assert.match(
    installationId,
    /^lx-android-[a-z0-9][a-z0-9._:-]{15,119}$/i
  );
});
