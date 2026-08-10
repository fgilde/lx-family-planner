import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  DEFAULT_SERVER_URL,
  getStoredServerUrl,
  hydrateStoredServerUrl,
  normalizeServerUrl
} from '../src/utils/apiConfig.js';

test('native client configuration has no preselected deployment server', () => {
  assert.equal(DEFAULT_SERVER_URL, '');
});

test('server configuration accepts a family-owned domain and local address', () => {
  assert.equal(
    normalizeServerUrl('https://family.example.test/'),
    'https://family.example.test'
  );
  assert.equal(
    normalizeServerUrl('192.168.178.50:3001'),
    'http://192.168.178.50:3001'
  );
});

test('a web installation keeps its chosen server address through hydration', async () => {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const values = new Map([
    ['lx_family_server_url', 'https://family.example.test']
  ]);
  globalThis.window = { Capacitor: { isNativePlatform: () => false } };
  globalThis.localStorage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  try {
    assert.equal(await hydrateStoredServerUrl(), 'https://family.example.test');
    assert.equal(getStoredServerUrl(), 'https://family.example.test');
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
  }
});

test('Android stores the selected server outside WebView storage for updates', async () => {
  const [plugin, activity] = await Promise.all([
    readFile(
      new URL(
        '../android/app/src/main/java/com/lxfamily/planner/LXServerPreferencesPlugin.java',
        import.meta.url
      ),
      'utf8'
    ),
    readFile(
      new URL(
        '../android/app/src/main/java/com/lxfamily/planner/MainActivity.java',
        import.meta.url
      ),
      'utf8'
    )
  ]);
  assert.match(plugin, /SharedPreferences/);
  assert.match(plugin, /getServerUrl/);
  assert.match(plugin, /setServerUrl/);
  assert.match(plugin, /"lx_server_preferences"/);
  assert.match(activity, /registerPlugin\(LXServerPreferencesPlugin\.class\)/);
});
