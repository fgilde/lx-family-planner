import assert from 'node:assert/strict';
import test from 'node:test';
import {
  databaseBackupIsDue,
  databaseBackupScheduledAt,
  normalizeDatabaseBackupSettings
} from './databaseBackupSchedule.js';

process.env.TZ = 'Europe/Berlin';

test('Datenbanksicherungs-Zeitplan normalisiert sichere Grenzen', () => {
  assert.deepEqual(
    normalizeDatabaseBackupSettings({
      enabled: true,
      frequency: 'weekly',
      dayOfWeek: 99,
      hour: -4,
      keep: 500
    }),
    {
      enabled: true,
      frequency: 'weekly',
      dayOfWeek: 6,
      hour: 0,
      keep: 52,
      lastBackupAt: 0,
      lastAttemptAt: 0,
      lastError: ''
    }
  );
});

test('Dienstag 20 Uhr wird nach Ausfall genau einmal nachgeholt', () => {
  const now = new Date('2026-08-25T20:15:00+02:00');
  const settings = {
    enabled: true,
    frequency: 'weekly',
    dayOfWeek: 2,
    hour: 20,
    keep: 8
  };
  const scheduled = databaseBackupScheduledAt(settings, now);
  assert.equal(scheduled.getDay(), 2);
  assert.equal(scheduled.getHours(), 20);
  assert.equal(databaseBackupIsDue(settings, now), true);
  assert.equal(
    databaseBackupIsDue(
      { ...settings, lastBackupAt: scheduled.getTime() + 1 },
      now
    ),
    false
  );
});

test('Tägliche Sicherungen warten bis zur gewünschten Stunde', () => {
  const before = new Date('2026-08-25T02:30:00+02:00');
  const settings = {
    enabled: true,
    frequency: 'daily',
    hour: 3,
    lastBackupAt: new Date('2026-08-24T03:05:00+02:00').getTime()
  };
  assert.equal(databaseBackupIsDue(settings, before), false);
  assert.equal(
    databaseBackupIsDue(settings, new Date('2026-08-25T03:05:00+02:00')),
    true
  );
});
