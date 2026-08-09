import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SERVER_URL,
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
