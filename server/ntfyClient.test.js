import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeNtfyTopic,
  ntfyMessageBody,
  ntfyPriority
} from './ntfyClient.js';

test('ntfy topics follow the documented safe topic format', () => {
  assert.equal(normalizeNtfyTopic('lx-family_home'), 'lx-family_home');
  assert.equal(normalizeNtfyTopic('family topic'), '');
  assert.equal(normalizeNtfyTopic('../secret'), '');
});

test('ntfy notification payload maps LX priorities and click target', () => {
  assert.equal(ntfyPriority(9), 5);
  assert.equal(ntfyPriority(5), 4);
  assert.equal(ntfyPriority(3), 3);
  assert.equal(ntfyPriority(-1), 2);
  assert.deepEqual(
    ntfyMessageBody(
      { topic: 'family', plannerUrl: 'https://family.example.test' },
      { title: 'Calendar', message: 'Tomorrow', priority: 8 }
    ),
    {
      topic: 'family',
      title: 'Calendar',
      message: 'Tomorrow',
      priority: 5,
      click: 'https://family.example.test'
    }
  );
});
