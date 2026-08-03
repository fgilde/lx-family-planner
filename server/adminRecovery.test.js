import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  hasFamilyAdmin,
  repairFamiliesWithoutAdmin
} from './adminRecovery.js';

function createTestDatabase() {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE members (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      is_managed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return database;
}

test('families softlocked with a regular login profile regain one administrator', () => {
  const database = createTestDatabase();
  try {
    database.prepare(`
      INSERT INTO members
        (id, family_id, name, role, is_managed, created_at, updated_at)
      VALUES
        ('member-1', 'family-locked', 'Alex', 'member', 0, 1, 1),
        ('member-2', 'family-locked', 'Sam', 'member', 0, 2, 2),
        ('adult-1', 'family-safe', 'Mara', 'adult', 0, 1, 1),
        ('member-3', 'family-safe', 'Kim', 'member', 0, 2, 2),
        ('child-1', 'family-child', 'Lina', 'child', 0, 1, 1)
    `).run();

    assert.deepEqual(
      repairFamiliesWithoutAdmin(database, 99),
      ['family-locked']
    );
    assert.deepEqual(
      database.prepare(`
        SELECT id, role, updated_at AS updatedAt
        FROM members
        ORDER BY id
      `).all().map(row => ({ ...row })),
      [
        { id: 'adult-1', role: 'adult', updatedAt: 1 },
        { id: 'child-1', role: 'child', updatedAt: 1 },
        { id: 'member-1', role: 'adult', updatedAt: 99 },
        { id: 'member-2', role: 'member', updatedAt: 2 },
        { id: 'member-3', role: 'member', updatedAt: 2 }
      ]
    );
  } finally {
    database.close();
  }
});

test('admin detection excludes managed profiles and accepts seniors', () => {
  assert.equal(hasFamilyAdmin([{ role: 'member' }]), false);
  assert.equal(hasFamilyAdmin([{ role: 'adult', isManaged: true }]), false);
  assert.equal(hasFamilyAdmin([{ role: 'senior', isManaged: false }]), true);
});
