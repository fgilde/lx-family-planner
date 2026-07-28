import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  eventReminderMessage,
  eventStartKey,
  eventStartTimestamp,
  formatReminderLead,
  normalizeEventReminders,
  normalizeTrashReminders,
  selectDueEventReminder,
  trashReminderCopy,
  trashReminderEvent
} from '../shared/eventReminders.js';
import { recipeShareTargetFromUrl } from '../shared/recipeShareTarget.js';
import { normalizeServerUrl } from '../src/utils/apiConfig.js';

test('calendar reminders are normalized, sorted and limited safely', () => {
  assert.deepEqual(
    normalizeEventReminders([10, 60, 10, -1, 20_000, '1440']),
    [1440, 60, 10]
  );
  assert.equal(
    normalizeEventReminders([0, 5, 10, 30, 60, 120, 600, 1440, 2880])
      .length,
    8
  );
});

test('only the most useful due calendar reminder is selected after downtime', () => {
  const now = new Date('2026-08-03T13:30:00').getTime();
  const event = {
    date: '2026-08-03',
    time: '14:00',
    reminders: [1440, 60, 10]
  };
  const due = selectDueEventReminder(event, [], now);
  assert.equal(due.reminderMinutes, 60);
  assert.deepEqual(due.consumedReminderMinutes, [1440, 60]);
  assert.equal(due.startKey, '2026-08-03T14:00');
  assert.equal(
    selectDueEventReminder(event, [1440, 60], now),
    null
  );
});

test('calendar reminder labels and messages stay human readable', () => {
  const now = new Date('2026-08-03T13:00:00').getTime();
  const event = {
    date: '2026-08-03',
    time: '14:00',
    location: 'Zahnarzt'
  };
  assert.equal(formatReminderLead(600), '10 Stunden vorher');
  assert.equal(formatReminderLead(10, true), '10 Min.');
  assert.equal(
    eventReminderMessage(event, now),
    'beginnt in 1 Stunde · Zahnarzt'
  );
  assert.equal(eventStartKey(event), '2026-08-03T14:00');
  assert.equal(Number.isFinite(eventStartTimestamp(event)), true);
});

test('all-day calendar reminders use a predictable morning time', () => {
  const event = {
    date: '2026-08-04',
    allDay: true,
    reminders: [60]
  };
  assert.equal(eventStartKey(event), '2026-08-04T09:00');
});

test('trash pickup reminders default to the previous morning and can be disabled', () => {
  assert.deepEqual(normalizeTrashReminders(undefined), [1440]);
  assert.deepEqual(normalizeTrashReminders([]), []);
  const event = trashReminderEvent({
    title: 'Hausmüll',
    date: '2026-08-04'
  });
  assert.equal(event.allDay, true);
  assert.equal(eventStartKey(event), '2026-08-04T09:00');
  assert.deepEqual(event.reminders, [1440]);
  assert.deepEqual(trashReminderCopy(event, 1440), {
    title: '🗑️ Morgen: Hausmüll',
    body: 'Morgen wird Hausmüll abgeholt. Bitte rechtzeitig rausstellen.'
  });
});

test('recipe share targets extract links from app share text', () => {
  const shared = recipeShareTargetFromUrl(
    'https://family.example/share-recipe?' +
      new URLSearchParams({
        title: 'Gefüllte Zucchini',
        text: 'Schau mal: https://www.chefkoch.de/rezepte/123/test.html'
      })
  );
  assert.equal(shared.isShareTarget, true);
  assert.equal(
    shared.url,
    'https://www.chefkoch.de/rezepte/123/test.html'
  );
  assert.equal(shared.title, 'Gefüllte Zucchini');
});

test('the web manifest registers LX as a recipe share target', () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      new URL('../public/manifest.json', import.meta.url),
      'utf8'
    )
  );
  assert.equal(manifest.share_target.action, '/share-recipe');
  assert.equal(manifest.share_target.params.url, 'url');
  assert.equal(
    manifest.shortcuts.some(entry => entry.url === '/share-recipe'),
    true
  );
});

test('native server addresses prefer safe protocols without breaking LAN use', () => {
  assert.equal(
    normalizeServerUrl('192.168.178.50:3001'),
    'http://192.168.178.50:3001'
  );
  assert.equal(
    normalizeServerUrl('family.example.de'),
    'https://family.example.de'
  );
  assert.throws(
    () => normalizeServerUrl('ftp://family.example.de'),
    /HTTP- und HTTPS/
  );
});
