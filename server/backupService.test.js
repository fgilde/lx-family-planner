import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  createDatabaseBackup,
  pruneDatabaseBackups,
  restoreDatabaseBackup
} from './backupService.js';

function backupName(second) {
  return `family-planner-2026-08-09T12-00-${String(second).padStart(2, '0')}-000Z.sqlite`;
}

test('backup retention keeps the newest three backup pairs and no other file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-family-backups-'));
  try {
    for (let index = 1; index <= 5; index += 1) {
      const file = path.join(directory, backupName(index));
      fs.writeFileSync(file, `backup ${index}`);
      fs.writeFileSync(`${file}.manifest.json`, `{\"index\":${index}}`);
      const timestamp = new Date(
        `2026-08-09T12:00:${String(index).padStart(2, '0')}.000Z`
      );
      fs.utimesSync(file, timestamp, timestamp);
    }
    fs.writeFileSync(path.join(directory, 'keep-me.txt'), 'not an LX backup');

    const retention = pruneDatabaseBackups({ backupDirectory: directory, keep: 3 });

    assert.equal(retention.kept.length, 3);
    assert.equal(retention.removed.length, 2);
    assert.ok(fs.existsSync(path.join(directory, backupName(5))));
    assert.ok(fs.existsSync(`${path.join(directory, backupName(5))}.manifest.json`));
    assert.equal(fs.existsSync(path.join(directory, backupName(1))), false);
    assert.equal(fs.existsSync(`${path.join(directory, backupName(1))}.manifest.json`), false);
    assert.equal(
      fs.readFileSync(path.join(directory, 'keep-me.txt'), 'utf8'),
      'not an LX backup'
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function writeTestDatabase(file, value) {
  const database = new DatabaseSync(file);
  try {
    database.exec('CREATE TABLE IF NOT EXISTS sample (value TEXT NOT NULL)');
    database.exec('DELETE FROM sample');
    database.prepare('INSERT INTO sample (value) VALUES (?)').run(value);
  } finally {
    database.close();
  }
}

function readTestDatabase(file) {
  const database = new DatabaseSync(file, { open: true, readOnly: true });
  try {
    return database.prepare('SELECT value FROM sample').get().value;
  } finally {
    database.close();
  }
}

test('verified restore replaces the database and keeps a pre-restore safety backup', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-family-restore-'));
  const backupDirectory = path.join(directory, 'backups');
  const databaseFile = path.join(directory, 'data', 'family_planner.sqlite');
  try {
    fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
    writeTestDatabase(databaseFile, 'vorher');
    const backup = createDatabaseBackup({ databaseFile, backupDirectory, keep: 3 });
    writeTestDatabase(databaseFile, 'nachher');

    const restored = restoreDatabaseBackup({
      backupFile: path.basename(backup.file),
      backupDirectory,
      databaseFile,
      serverStopped: true
    });

    assert.equal(readTestDatabase(databaseFile), 'vorher');
    assert.ok(restored.safetyBackupFile);
    assert.ok(fs.existsSync(restored.safetyBackupFile));
    assert.equal(readTestDatabase(restored.safetyBackupFile), 'nachher');
    assert.equal(fs.existsSync(`${databaseFile}-wal`), false);
    assert.equal(fs.existsSync(`${databaseFile}-shm`), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('restore refuses tampered and out-of-directory backups', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-family-restore-'));
  const backupDirectory = path.join(directory, 'backups');
  const databaseFile = path.join(directory, 'family_planner.sqlite');
  const outsideFile = path.join(directory, backupName(44));
  try {
    writeTestDatabase(databaseFile, 'sicher');
    const backup = createDatabaseBackup({ databaseFile, backupDirectory, keep: 3 });
    fs.appendFileSync(backup.file, 'manipuliert');

    assert.throws(
      () => restoreDatabaseBackup({
        backupFile: backup.file,
        backupDirectory,
        databaseFile,
        serverStopped: true
      }),
      /beschädigt|Prüfmanifest/
    );
    fs.copyFileSync(databaseFile, outsideFile);
    assert.throws(
      () => restoreDatabaseBackup({
        backupFile: outsideFile,
        backupDirectory,
        databaseFile,
        serverStopped: true
      }),
      /Backup-Ordner/
    );
    assert.equal(readTestDatabase(databaseFile), 'sicher');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('restore requires an explicit stopped-server confirmation', () => {
  assert.throws(
    () => restoreDatabaseBackup(),
    /Server muss vor der Wiederherstellung angehalten/
  );
});
