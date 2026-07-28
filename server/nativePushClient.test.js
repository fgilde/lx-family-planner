import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNativeInstallationId,
  launchNativePushRegistration,
  nativePushPermissionNeedsPrompt,
  withNativePushTimeout
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

test('native registration launch never waits for a stuck plugin call', () => {
  let started = false;
  const neverSettles = new Promise(() => {});
  const result = launchNativePushRegistration(
    {
      register() {
        started = true;
        return neverSettles;
      }
    },
    () => {}
  );
  assert.equal(started, true);
  assert.equal(result, undefined);
});

test('native push timeout rejects any stuck setup stage', async () => {
  const neverSettles = new Promise(() => {});
  await assert.rejects(
    withNativePushTimeout(
      neverSettles,
      5,
      'Android setup timed out.'
    ),
    error =>
      error.code === 'native-push-timeout' &&
      error.message === 'Android setup timed out.'
  );
});
