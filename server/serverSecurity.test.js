import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configuredCorsOrigins,
  configuredTrustProxy
} from './serverSecurity.js';

test('CORS origins are explicit and never contain the developer deployment', () => {
  const origins = configuredCorsOrigins(
    'https://family.example.test/, http://192.168.178.50:3001, https://evil.example/path'
  );
  assert.equal(origins.has('capacitor://localhost'), true);
  assert.equal(origins.has('https://family.example.test'), true);
  assert.equal(origins.has('http://192.168.178.50:3001'), true);
  assert.equal(origins.has('https://evil.example/path'), false);
  assert.equal(origins.has('https://familie.laxxx-lab.de'), false);
});

test('trust proxy stays disabled until a deployment explicitly opts in', () => {
  assert.equal(configuredTrustProxy(), false);
  assert.equal(configuredTrustProxy('false'), false);
  assert.equal(configuredTrustProxy('true'), 1);
  assert.equal(configuredTrustProxy('2'), 2);
  assert.equal(configuredTrustProxy('untrusted value'), false);
});
