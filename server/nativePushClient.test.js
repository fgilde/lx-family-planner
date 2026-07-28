import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createNativeInstallationId,
  nativePluginContainer,
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

test('Capacitor plugin proxies never pass through Promise thenable adoption', async () => {
  let thenReads = 0;
  const pluginProxy = new Proxy(
    {},
    {
      get(target, property) {
        if (property === 'then') {
          thenReads += 1;
          return () => {};
        }
        return Reflect.get(target, property);
      }
    }
  );
  const wrapped = await Promise.resolve(nativePluginContainer(pluginProxy));
  assert.equal(thenReads, 0);
  assert.equal(wrapped.plugin, pluginProxy);
});

test('Android app requests the Firebase token through the direct native bridge', () => {
  const pluginSource = fs.readFileSync(
    path.join(
      process.cwd(),
      'android/app/src/main/java/com/lxfamily/planner/LXNativePushPlugin.java'
    ),
    'utf8'
  );
  const activitySource = fs.readFileSync(
    path.join(
      process.cwd(),
      'android/app/src/main/java/com/lxfamily/planner/MainActivity.java'
    ),
    'utf8'
  );
  assert.match(pluginSource, /@CapacitorPlugin\(name = "LXNativePush"\)/);
  assert.match(pluginSource, /FirebaseMessaging\s*\.getInstance\(\)/);
  assert.match(pluginSource, /\.getToken\(\)/);
  assert.ok(
    activitySource.indexOf('registerPlugin(LXNativePushPlugin.class)') <
      activitySource.indexOf('super.onCreate(savedInstanceState)')
  );
});
