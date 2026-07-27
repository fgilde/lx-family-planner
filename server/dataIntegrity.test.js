import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  createDataManifest,
  verifyDataManifest
} from './dataIntegrity.js';

test('update audit preserves existing user data and detects loss', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'lx-family-integrity-')
  );
  const databaseFile = path.join(directory, 'audit.sqlite');
  const database = new DatabaseSync(databaseFile);
  try {
    database.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE families (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '',
        badge TEXT NOT NULL DEFAULT 'Familie',
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE members (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        position TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#2563eb',
        bg_color TEXT NOT NULL DEFAULT '#eff6ff',
        theme TEXT NOT NULL DEFAULT 'light',
        stars INTEGER NOT NULL DEFAULT 0,
        pin_hash TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE family_records (
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (family_id, type, id)
      );
      INSERT INTO families
        VALUES('family-1', 'Familie Audit', '', 'Familie', 'hash', 1, 1);
      INSERT INTO members
        VALUES(
          'member-1', 'family-1', 'Mara', 'adult', 'mama', '',
          '#2563eb', '#eff6ff', 'forest', 25, NULL, 1, 1
        );
      INSERT INTO family_records
        VALUES(
          'family-1', 'savedRecipes', 'recipe-1',
          '{"id":"recipe-1","title":"Kartoffelsuppe","image":"data:image/jpeg;base64,dGVzdA=="}',
          1, 1
        );
    `);
  } finally {
    database.close();
  }

  try {
    const baseline = createDataManifest(databaseFile);
    assert.equal(baseline.ok, true);
    assert.equal(baseline.resourceTypeCounts.savedRecipes, 1);

    const unchanged = verifyDataManifest(databaseFile, baseline);
    assert.equal(unchanged.ok, true);

    const changedDatabase = new DatabaseSync(databaseFile);
    changedDatabase
      .prepare(`
        INSERT INTO families
        VALUES(?, ?, '', 'Familie', 'hash', 2, 2)
      `)
      .run('family-2', 'Neue Familie');
    changedDatabase.close();
    const withAddition = verifyDataManifest(databaseFile, baseline);
    assert.equal(withAddition.ok, true);
    assert.ok(withAddition.warnings.length > 0);

    const damagedDatabase = new DatabaseSync(databaseFile);
    damagedDatabase
      .prepare('UPDATE members SET theme = ? WHERE id = ?')
      .run('light', 'member-1');
    damagedDatabase.close();
    const changedSetting = verifyDataManifest(databaseFile, baseline);
    assert.equal(changedSetting.ok, false);
    assert.ok(
      changedSetting.errors.some(error => error.includes('members'))
    );

    const invalidDatabase = new DatabaseSync(databaseFile);
    invalidDatabase
      .prepare('UPDATE family_records SET data_json = ? WHERE id = ?')
      .run('{kaputt', 'recipe-1');
    invalidDatabase.close();
    const invalidRecord = verifyDataManifest(databaseFile, baseline);
    assert.equal(invalidRecord.ok, false);
    assert.equal(invalidRecord.invalidFamilyRecords.length, 1);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
