import fs from 'fs';
import path from 'path';
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual
} from 'crypto';
import { DatabaseSync } from 'node:sqlite';

const DATABASE_FILE = process.env.DATABASE_FILE
  ? path.resolve(process.env.DATABASE_FILE)
  : path.join(process.cwd(), 'family_planner.sqlite');
const LEGACY_DATABASE_FILE = process.env.LEGACY_DATABASE_FILE
  ? path.resolve(process.env.LEGACY_DATABASE_FILE)
  : path.join(process.cwd(), 'family_db.json');

const RECORD_TYPES = new Set([
  'events',
  'shoppingItems',
  'tasks',
  'notes',
  'meals',
  'savedRecipes',
  'rewards',
  'chatMessages',
  'familyTree',
  'dashboardLinks',
  'trashEvents',
  'moodCheckins'
]);

const database = new DatabaseSync(DATABASE_FILE);
database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '',
    badge TEXT NOT NULL DEFAULT 'Familie',
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    position TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#2563eb',
    bg_color TEXT NOT NULL DEFAULT '#eff6ff',
    theme TEXT NOT NULL DEFAULT 'light',
    stars INTEGER NOT NULL DEFAULT 0 CHECK(stars >= 0),
    pin_hash TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS members_family_idx
    ON members(family_id);

  CREATE TABLE IF NOT EXISTS family_records (
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    id TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (family_id, type, id)
  );

  CREATE INDEX IF NOT EXISTS family_records_lookup_idx
    ON family_records(family_id, type, updated_at);

  CREATE TABLE IF NOT EXISTS family_versions (
    family_id TEXT PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_expiry_idx
    ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_name TEXT NOT NULL DEFAULT 'Dieses Gerät',
    preferences_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(family_id, member_id, endpoint)
  );

  CREATE INDEX IF NOT EXISTS push_subscriptions_family_idx
    ON push_subscriptions(family_id, member_id);

  CREATE TABLE IF NOT EXISTS integrations (
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    config_json TEXT NOT NULL DEFAULT '{}',
    secret_encrypted TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (family_id, provider)
  );

  CREATE TABLE IF NOT EXISTS family_relationships (
    id TEXT PRIMARY KEY,
    requester_family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    target_family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK(
      relation_type IN ('parent', 'child', 'sibling', 'relative')
    ),
    status TEXT NOT NULL CHECK(
      status IN ('pending', 'accepted', 'declined')
    ),
    requested_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    responded_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK(requester_family_id <> target_family_id),
    UNIQUE(requester_family_id, target_family_id)
  );

  CREATE INDEX IF NOT EXISTS family_relationships_requester_idx
    ON family_relationships(requester_family_id, status);

  CREATE INDEX IF NOT EXISTS family_relationships_target_idx
    ON family_relationships(target_family_id, status);
`);

const familyColumns = database.prepare('PRAGMA table_info(families)').all();
if (
  !familyColumns.some(
    column => column.name === 'grandparents_household_enabled'
  )
) {
  database.exec(`
    ALTER TABLE families
    ADD COLUMN grandparents_household_enabled INTEGER NOT NULL DEFAULT 1
      CHECK(grandparents_household_enabled IN (0, 1));
  `);
}

const pushSubscriptionTable = database
  .prepare(`
    SELECT sql FROM sqlite_master
    WHERE type = 'table' AND name = 'push_subscriptions'
  `)
  .get();
if (
  pushSubscriptionTable?.sql &&
  /endpoint\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(pushSubscriptionTable.sql)
) {
  database.exec(`
    BEGIN IMMEDIATE;
    DROP INDEX IF EXISTS push_subscriptions_family_idx;
    ALTER TABLE push_subscriptions RENAME TO push_subscriptions_legacy;
    CREATE TABLE push_subscriptions (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      device_name TEXT NOT NULL DEFAULT 'Dieses Gerät',
      preferences_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(family_id, member_id, endpoint)
    );
    INSERT INTO push_subscriptions(
      id, family_id, member_id, endpoint, p256dh, auth,
      device_name, preferences_json, created_at, updated_at
    )
    SELECT
      id, family_id, member_id, endpoint, p256dh, auth,
      device_name, preferences_json, created_at, updated_at
    FROM push_subscriptions_legacy;
    DROP TABLE push_subscriptions_legacy;
    CREATE INDEX push_subscriptions_family_idx
      ON push_subscriptions(family_id, member_id);
    COMMIT;
  `);
}

function withTransaction(work) {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function hashSecret(secret) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(secret), salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifySecret(secret, encodedHash) {
  if (!encodedHash || !encodedHash.includes(':')) return false;
  try {
    const [saltHex, hashHex] = encodedHash.split(':');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(String(secret), Buffer.from(saltHex, 'hex'), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function inferRoleType(legacyRole = '', name = '') {
  const value = `${legacyRole} ${name}`.toLowerCase();
  if (value.includes('haustier')) return 'pet';
  if (value.includes('kind')) return 'child';
  if (value.includes('teen')) return 'teen';
  if (value.includes('groß') || value.includes('oma') || value.includes('opa')) return 'senior';
  if (
    value.includes('eltern') ||
    value.includes('mama') ||
    value.includes('papa') ||
    value.includes('mutter') ||
    value.includes('vater')
  ) {
    return 'adult';
  }
  return 'member';
}

function inferPosition(member = {}) {
  if (member.position) return member.position;
  const value = `${member.role || ''} ${member.name || ''}`.toLowerCase();
  if (value.includes('mama') || value.includes('mutter')) return 'mama';
  if (value.includes('papa') || value.includes('vater')) return 'papa';
  if (value.includes('oma')) return 'oma';
  if (value.includes('opa')) return 'opa';
  if (value.includes('teen')) return 'teenager';
  if (value.includes('kind')) return 'kind';
  if (value.includes('haustier')) return 'haustier';
  return 'familienmitglied';
}

function mapFamilyRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    familyName: row.name,
    familyAvatar: row.avatar,
    badge: row.badge,
    grandparentsHouseholdEnabled:
      Number(row.grandparents_household_enabled ?? 1) === 1,
    isConfigured: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMemberRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    role: row.role,
    position: row.position,
    avatar: row.avatar,
    color: row.color,
    bgColor: row.bg_color,
    theme: row.theme,
    stars: row.stars,
    hasPin: Boolean(row.pin_hash),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeRecord(type, record, familyId) {
  const id = String(record?.id || `${type}-${randomUUID()}`);
  return {
    ...(record || {}),
    id,
    familyId
  };
}

function parseRecordRow(row) {
  if (!row) return null;
  try {
    return normalizeRecord(row.type, JSON.parse(row.data_json), row.family_id);
  } catch {
    return {
      id: row.id,
      familyId: row.family_id,
      invalid: true
    };
  }
}

export function getAppMeta(key) {
  return database.prepare('SELECT value FROM app_meta WHERE key = ?').get(key)?.value;
}

export function setAppMeta(key, value) {
  database
    .prepare(`
      INSERT INTO app_meta(key, value) VALUES(?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    .run(key, String(value));
}

export function bumpFamilyVersion(familyId) {
  const now = Date.now();
  database
    .prepare(`
      INSERT INTO family_versions(family_id, version, updated_at)
      VALUES(?, 1, ?)
      ON CONFLICT(family_id) DO UPDATE SET
        version = family_versions.version + 1,
        updated_at = excluded.updated_at
    `)
    .run(familyId, now);
  return getFamilyVersion(familyId);
}

export function getFamilyVersion(familyId) {
  return database
    .prepare('SELECT version FROM family_versions WHERE family_id = ?')
    .get(familyId)?.version || 1;
}

export function listPublicFamilies() {
  const rows = database.prepare(`
    SELECT
      f.id,
      f.name,
      f.avatar,
      f.badge,
      f.created_at,
      f.updated_at,
      COUNT(m.id) AS members_count
    FROM families f
    LEFT JOIN members m ON m.family_id = f.id
    GROUP BY f.id
    ORDER BY f.created_at ASC
  `).all();

  return rows.map(row => ({
    ...mapFamilyRow(row),
    membersCount: Number(row.members_count || 0)
  }));
}

export function getFamily(familyId) {
  return mapFamilyRow(
    database.prepare('SELECT * FROM families WHERE id = ?').get(familyId)
  );
}

export function getFamilyAuthRow(familyId) {
  return database.prepare('SELECT * FROM families WHERE id = ?').get(familyId);
}

export function getMembers(familyId) {
  return database
    .prepare('SELECT * FROM members WHERE family_id = ? ORDER BY created_at ASC')
    .all(familyId)
    .map(mapMemberRow);
}

export function getMember(familyId, memberId) {
  return mapMemberRow(
    database
      .prepare('SELECT * FROM members WHERE family_id = ? AND id = ?')
      .get(familyId, memberId)
  );
}

export function getMemberAuthRow(familyId, memberId) {
  return database
    .prepare('SELECT * FROM members WHERE family_id = ? AND id = ?')
    .get(familyId, memberId);
}

export function createFamily({
  id = `fam-${randomUUID()}`,
  familyName,
  familyAvatar = '',
  badge = 'Familie',
  password,
  members = []
}) {
  const now = Date.now();
  return withTransaction(() => {
    database
      .prepare(`
        INSERT INTO families(id, name, avatar, badge, password_hash, created_at, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, ?)
      `)
      .run(id, familyName.trim(), familyAvatar, badge, hashSecret(password), now, now);

    database
      .prepare(`
        INSERT INTO family_versions(family_id, version, updated_at)
        VALUES(?, 1, ?)
      `)
      .run(id, now);

    for (const member of members) {
      insertMember(id, member, now);
    }

    return {
      family: getFamily(id),
      members: getMembers(id)
    };
  });
}

function insertMember(familyId, member, now = Date.now()) {
  const id = String(member.id || `mem-${randomUUID()}`);
  const role = member.role || inferRoleType(member.legacyRole, member.name);
  const position = member.position || inferPosition(member);
  database
    .prepare(`
      INSERT INTO members(
        id, family_id, name, role, position, avatar, color, bg_color,
        theme, stars, pin_hash, created_at, updated_at
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      familyId,
      String(member.name || 'Familienmitglied').trim(),
      role,
      position,
      member.avatar || '',
      member.color || '#2563eb',
      member.bgColor || '#eff6ff',
      member.theme || (role === 'child' ? 'adventure' : 'light'),
      Math.max(0, Number(member.stars || 0)),
      member.pin ? hashSecret(member.pin) : null,
      now,
      now
    );
  return getMember(familyId, id);
}

export function createMember(familyId, member) {
  return withTransaction(() => {
    const created = insertMember(familyId, member);
    bumpFamilyVersion(familyId);
    return created;
  });
}

export function updateMember(familyId, memberId, changes) {
  const existing = getMemberAuthRow(familyId, memberId);
  if (!existing) return null;
  const now = Date.now();
  const nextPinHash = Object.prototype.hasOwnProperty.call(changes, 'pin')
    ? (changes.pin ? hashSecret(changes.pin) : null)
    : existing.pin_hash;

  return withTransaction(() => {
    database
      .prepare(`
        UPDATE members SET
          name = ?,
          role = ?,
          position = ?,
          avatar = ?,
          color = ?,
          bg_color = ?,
          theme = ?,
          stars = ?,
          pin_hash = ?,
          updated_at = ?
        WHERE family_id = ? AND id = ?
      `)
      .run(
        changes.name ?? existing.name,
        changes.role ?? existing.role,
        changes.position ?? existing.position,
        changes.avatar ?? existing.avatar,
        changes.color ?? existing.color,
        changes.bgColor ?? existing.bg_color,
        changes.theme ?? existing.theme,
        Math.max(0, Number(changes.stars ?? existing.stars)),
        nextPinHash,
        now,
        familyId,
        memberId
      );
    bumpFamilyVersion(familyId);
    return getMember(familyId, memberId);
  });
}

export function deleteMember(familyId, memberId) {
  return withTransaction(() => {
    const result = database
      .prepare('DELETE FROM members WHERE family_id = ? AND id = ?')
      .run(familyId, memberId);
    if (result.changes > 0) bumpFamilyVersion(familyId);
    return result.changes > 0;
  });
}

export function updateFamily(familyId, changes) {
  const existing = getFamilyAuthRow(familyId);
  if (!existing) return null;
  const nextPasswordHash = changes.password
    ? hashSecret(changes.password)
    : existing.password_hash;
  const now = Date.now();

  return withTransaction(() => {
    database
      .prepare(`
        UPDATE families SET
          name = ?,
          avatar = ?,
          badge = ?,
          grandparents_household_enabled = ?,
          password_hash = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .run(
        changes.familyName ?? existing.name,
        changes.familyAvatar ?? existing.avatar,
        changes.badge ?? existing.badge,
        changes.grandparentsHouseholdEnabled === undefined
          ? Number(existing.grandparents_household_enabled ?? 1)
          : changes.grandparentsHouseholdEnabled
            ? 1
            : 0,
        nextPasswordHash,
        now,
        familyId
      );
    bumpFamilyVersion(familyId);
    return getFamily(familyId);
  });
}

export function deleteFamily(familyId) {
  const connectedFamilyIds = database
    .prepare(`
      SELECT requester_family_id, target_family_id
      FROM family_relationships
      WHERE requester_family_id = ? OR target_family_id = ?
    `)
    .all(familyId, familyId)
    .map(row =>
      row.requester_family_id === familyId
        ? row.target_family_id
        : row.requester_family_id
    );

  return withTransaction(() => {
    const deleted = database
      .prepare('DELETE FROM families WHERE id = ?')
      .run(familyId).changes > 0;
    if (deleted) {
      [...new Set(connectedFamilyIds)].forEach(bumpFamilyVersion);
    }
    return deleted;
  });
}

export function assertRecordType(type) {
  if (!RECORD_TYPES.has(type)) {
    const error = new Error(`Unbekannter Datentyp: ${type}`);
    error.statusCode = 404;
    throw error;
  }
}

export function listRecords(familyId, type) {
  assertRecordType(type);
  return database
    .prepare(`
      SELECT * FROM family_records
      WHERE family_id = ? AND type = ?
      ORDER BY created_at ASC
    `)
    .all(familyId, type)
    .map(parseRecordRow);
}

export function getRecord(familyId, type, id) {
  assertRecordType(type);
  return parseRecordRow(
    database
      .prepare(`
        SELECT * FROM family_records
        WHERE family_id = ? AND type = ? AND id = ?
      `)
      .get(familyId, type, id)
  );
}

export function createRecord(familyId, type, record) {
  assertRecordType(type);
  const normalized = normalizeRecord(type, record, familyId);
  const now = Date.now();
  return withTransaction(() => {
    database
      .prepare(`
        INSERT INTO family_records(
          family_id, type, id, data_json, created_at, updated_at
        )
        VALUES(?, ?, ?, ?, ?, ?)
      `)
      .run(
        familyId,
        type,
        normalized.id,
        JSON.stringify(normalized),
        now,
        now
      );
    bumpFamilyVersion(familyId);
    return normalized;
  });
}

export function upsertRecord(familyId, type, record, { bump = true } = {}) {
  assertRecordType(type);
  const normalized = normalizeRecord(type, record, familyId);
  const now = Date.now();
  database
    .prepare(`
      INSERT INTO family_records(
        family_id, type, id, data_json, created_at, updated_at
      )
      VALUES(?, ?, ?, ?, ?, ?)
      ON CONFLICT(family_id, type, id) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
    `)
    .run(
      familyId,
      type,
      normalized.id,
      JSON.stringify(normalized),
      now,
      now
    );
  if (bump) bumpFamilyVersion(familyId);
  return normalized;
}

export function upsertRecords(familyId, type, records) {
  assertRecordType(type);
  return withTransaction(() => {
    const saved = records.map(record =>
      upsertRecord(familyId, type, record, { bump: false })
    );
    if (saved.length) bumpFamilyVersion(familyId);
    return saved;
  });
}

export function updateRecord(familyId, type, id, changes) {
  const existing = getRecord(familyId, type, id);
  if (!existing) return null;
  return withTransaction(() => {
    const updated = upsertRecord(
      familyId,
      type,
      {
        ...existing,
        ...(changes || {}),
        id,
        familyId
      },
      { bump: false }
    );
    bumpFamilyVersion(familyId);
    return updated;
  });
}

export function deleteRecord(familyId, type, id) {
  assertRecordType(type);
  return withTransaction(() => {
    const result = database
      .prepare(`
        DELETE FROM family_records
        WHERE family_id = ? AND type = ? AND id = ?
      `)
      .run(familyId, type, id);
    if (result.changes > 0) bumpFamilyVersion(familyId);
    return result.changes > 0;
  });
}

export function deleteTaskRecords(
  familyId,
  { memberId = '', completedOnly = false } = {}
) {
  const tasks = listRecords(familyId, 'tasks');
  const deleteIds = tasks
    .filter(task => !memberId || task.memberId === memberId)
    .filter(task => !completedOnly || Boolean(task.completed))
    .map(task => task.id);

  return withTransaction(() => {
    const remove = database.prepare(`
      DELETE FROM family_records
      WHERE family_id = ? AND type = 'tasks' AND id = ?
    `);
    deleteIds.forEach(id => remove.run(familyId, id));
    if (deleteIds.length) bumpFamilyVersion(familyId);
    return {
      deleted: deleteIds.length,
      records: listRecords(familyId, 'tasks')
    };
  });
}

function relationshipFamilySummary(row, prefix) {
  return {
    id: row[`${prefix}_id`],
    familyName: row[`${prefix}_name`],
    familyAvatar: row[`${prefix}_avatar`],
    badge: row[`${prefix}_badge`],
    membersCount: Number(row[`${prefix}_members_count`] || 0)
  };
}

function mapRelationshipRow(row, familyId) {
  if (!row) return null;
  const requesterFamily = relationshipFamilySummary(row, 'requester');
  const targetFamily = relationshipFamilySummary(row, 'target');
  return {
    id: row.id,
    relationType: row.relation_type,
    status: row.status,
    direction: row.requester_family_id === familyId ? 'outgoing' : 'incoming',
    requesterFamily,
    targetFamily,
    otherFamily:
      row.requester_family_id === familyId ? targetFamily : requesterFamily,
    requestedByMemberId: row.requested_by_member_id,
    respondedByMemberId: row.responded_by_member_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const RELATIONSHIP_SELECT = `
  SELECT
    relationship.*,
    requester.id AS requester_id,
    requester.name AS requester_name,
    requester.avatar AS requester_avatar,
    requester.badge AS requester_badge,
    (
      SELECT COUNT(*) FROM members
      WHERE family_id = requester.id
    ) AS requester_members_count,
    target.id AS target_id,
    target.name AS target_name,
    target.avatar AS target_avatar,
    target.badge AS target_badge,
    (
      SELECT COUNT(*) FROM members
      WHERE family_id = target.id
    ) AS target_members_count
  FROM family_relationships relationship
  JOIN families requester ON requester.id = relationship.requester_family_id
  JOIN families target ON target.id = relationship.target_family_id
`;

export function listFamilyRelationships(familyId) {
  return database
    .prepare(`
      ${RELATIONSHIP_SELECT}
      WHERE (
        relationship.requester_family_id = ?
        OR relationship.target_family_id = ?
      )
      AND relationship.status <> 'declined'
      ORDER BY relationship.created_at DESC
    `)
    .all(familyId, familyId)
    .map(row => mapRelationshipRow(row, familyId));
}

export function createFamilyRelationshipRequest(
  requesterFamilyId,
  targetFamilyId,
  relationType,
  requestedByMemberId
) {
  if (requesterFamilyId === targetFamilyId) {
    const error = new Error('Eine Familie kann sich nicht selbst verknüpfen.');
    error.statusCode = 400;
    throw error;
  }
  if (!getFamily(targetFamilyId)) {
    const error = new Error('Die ausgewählte Familie wurde nicht gefunden.');
    error.statusCode = 404;
    throw error;
  }

  const existing = database
    .prepare(`
      SELECT * FROM family_relationships
      WHERE (
        requester_family_id = ? AND target_family_id = ?
      ) OR (
        requester_family_id = ? AND target_family_id = ?
      )
    `)
    .get(
      requesterFamilyId,
      targetFamilyId,
      targetFamilyId,
      requesterFamilyId
    );

  if (existing && existing.status !== 'declined') {
    const error = new Error(
      existing.status === 'accepted'
        ? 'Diese Familien sind bereits verknüpft.'
        : 'Zwischen diesen Familien wartet bereits eine Anfrage.'
    );
    error.statusCode = 409;
    throw error;
  }

  const now = Date.now();
  const id = existing?.id || `relationship-${randomUUID()}`;
  return withTransaction(() => {
    if (existing) {
      database
        .prepare(`
          UPDATE family_relationships SET
            requester_family_id = ?,
            target_family_id = ?,
            relation_type = ?,
            status = 'pending',
            requested_by_member_id = ?,
            responded_by_member_id = NULL,
            created_at = ?,
            updated_at = ?
          WHERE id = ?
        `)
        .run(
          requesterFamilyId,
          targetFamilyId,
          relationType,
          requestedByMemberId,
          now,
          now,
          id
        );
    } else {
      database
        .prepare(`
          INSERT INTO family_relationships(
            id,
            requester_family_id,
            target_family_id,
            relation_type,
            status,
            requested_by_member_id,
            created_at,
            updated_at
          )
          VALUES(?, ?, ?, ?, 'pending', ?, ?, ?)
        `)
        .run(
          id,
          requesterFamilyId,
          targetFamilyId,
          relationType,
          requestedByMemberId,
          now,
          now
        );
    }
    bumpFamilyVersion(requesterFamilyId);
    bumpFamilyVersion(targetFamilyId);
    return listFamilyRelationships(requesterFamilyId).find(
      relationship => relationship.id === id
    );
  });
}

export function respondFamilyRelationship(
  targetFamilyId,
  relationshipId,
  accepted,
  respondedByMemberId
) {
  const existing = database
    .prepare(`
      SELECT * FROM family_relationships
      WHERE id = ? AND target_family_id = ? AND status = 'pending'
    `)
    .get(relationshipId, targetFamilyId);
  if (!existing) return null;

  return withTransaction(() => {
    database
      .prepare(`
        UPDATE family_relationships SET
          status = ?,
          responded_by_member_id = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .run(
        accepted ? 'accepted' : 'declined',
        respondedByMemberId,
        Date.now(),
        relationshipId
      );
    bumpFamilyVersion(existing.requester_family_id);
    bumpFamilyVersion(existing.target_family_id);
    return listFamilyRelationships(targetFamilyId).find(
      relationship => relationship.id === relationshipId
    ) || {
      id: relationshipId,
      status: 'declined'
    };
  });
}

export function deleteFamilyRelationship(familyId, relationshipId) {
  const existing = database
    .prepare(`
      SELECT * FROM family_relationships
      WHERE id = ? AND (
        requester_family_id = ? OR target_family_id = ?
      )
    `)
    .get(relationshipId, familyId, familyId);
  if (!existing) return false;

  return withTransaction(() => {
    database
      .prepare('DELETE FROM family_relationships WHERE id = ?')
      .run(relationshipId);
    bumpFamilyVersion(existing.requester_family_id);
    bumpFamilyVersion(existing.target_family_id);
    return true;
  });
}

export function replaceRecordsBySource(familyId, type, source, records) {
  assertRecordType(type);
  return withTransaction(() => {
    const existing = listRecords(familyId, type);
    const removeIds = existing
      .filter(record => record.source === source)
      .map(record => record.id);
    const remove = database.prepare(`
      DELETE FROM family_records
      WHERE family_id = ? AND type = ? AND id = ?
    `);
    removeIds.forEach(id => remove.run(familyId, type, id));
    const inserted = records.map(record =>
      upsertRecord(
        familyId,
        type,
        { ...record, source },
        { bump: false }
      )
    );
    bumpFamilyVersion(familyId);
    return inserted;
  });
}

export function getBootstrap(familyId) {
  const resources = {};
  for (const type of RECORD_TYPES) {
    resources[type] = listRecords(familyId, type);
  }
  return {
    family: getFamily(familyId),
    members: getMembers(familyId),
    resources,
    version: getFamilyVersion(familyId)
  };
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(familyId, { memberId = null, maxAgeMs = 1000 * 60 * 60 * 24 * 30 } = {}) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  database
    .prepare(`
      INSERT INTO sessions(token_hash, family_id, member_id, created_at, expires_at)
      VALUES(?, ?, ?, ?, ?)
    `)
    .run(hashToken(token), familyId, memberId, now, now + maxAgeMs);
  return token;
}

export function getSession(token) {
  if (!token) return null;
  const now = Date.now();
  database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  const row = database
    .prepare(`
      SELECT s.*, f.name AS family_name
      FROM sessions s
      JOIN families f ON f.id = s.family_id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `)
    .get(hashToken(token), now);
  if (!row) return null;
  return {
    tokenHash: row.token_hash,
    familyId: row.family_id,
    memberId: row.member_id,
    expiresAt: row.expires_at
  };
}

export function setSessionMember(token, familyId, memberId) {
  return database
    .prepare(`
      UPDATE sessions SET member_id = ?
      WHERE token_hash = ? AND family_id = ?
    `)
    .run(memberId, hashToken(token), familyId).changes > 0;
}

export function deleteSession(token) {
  if (!token) return false;
  return database
    .prepare('DELETE FROM sessions WHERE token_hash = ?')
    .run(hashToken(token)).changes > 0;
}

function mapPushSubscriptionRow(row) {
  if (!row) return null;
  let preferences = {};
  try {
    preferences = JSON.parse(row.preferences_json || '{}');
  } catch {
    preferences = {};
  }
  return {
    id: row.id,
    familyId: row.family_id,
    memberId: row.member_id,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth
    },
    deviceName: row.device_name,
    preferences,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listPushSubscriptions(familyId, { memberId } = {}) {
  const rows = memberId
    ? database
        .prepare(`
          SELECT * FROM push_subscriptions
          WHERE family_id = ? AND member_id = ?
          ORDER BY updated_at DESC
        `)
        .all(familyId, memberId)
    : database
        .prepare(`
          SELECT * FROM push_subscriptions
          WHERE family_id = ?
          ORDER BY updated_at DESC
        `)
        .all(familyId);
  return rows.map(mapPushSubscriptionRow);
}

export function savePushSubscription({
  familyId,
  memberId,
  endpoint,
  keys,
  deviceName = 'Dieses Gerät',
  preferences = {}
}) {
  const now = Date.now();
  const id = `push-${randomUUID()}`;
  database
    .prepare(`
      INSERT INTO push_subscriptions(
        id, family_id, member_id, endpoint, p256dh, auth,
        device_name, preferences_json, created_at, updated_at
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(family_id, member_id, endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        device_name = excluded.device_name,
        preferences_json = excluded.preferences_json,
        updated_at = excluded.updated_at
    `)
    .run(
      id,
      familyId,
      memberId,
      endpoint,
      keys.p256dh,
      keys.auth,
      deviceName,
      JSON.stringify(preferences || {}),
      now,
      now
    );
  return mapPushSubscriptionRow(
    database
      .prepare(`
        SELECT * FROM push_subscriptions
        WHERE family_id = ? AND member_id = ? AND endpoint = ?
      `)
      .get(familyId, memberId, endpoint)
  );
}

export function deletePushSubscription(familyId, memberId, endpoint) {
  return database
    .prepare(`
      DELETE FROM push_subscriptions
      WHERE family_id = ? AND member_id = ? AND endpoint = ?
    `)
    .run(familyId, memberId, endpoint).changes > 0;
}

export function deletePushSubscriptionById(familyId, subscriptionId) {
  return database
    .prepare(`
      DELETE FROM push_subscriptions
      WHERE family_id = ? AND id = ?
    `)
    .run(familyId, subscriptionId).changes > 0;
}

export function countPushSubscriptionsByEndpoint(endpoint) {
  return Number(
    database
      .prepare(`
        SELECT COUNT(*) AS count FROM push_subscriptions
        WHERE endpoint = ?
      `)
      .get(endpoint)?.count || 0
  );
}

export function deletePushSubscriptionsByEndpoint(endpoint) {
  return database
    .prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
    .run(endpoint).changes;
}

export function getIntegration(familyId, provider) {
  const row = database
    .prepare(`
      SELECT * FROM integrations
      WHERE family_id = ? AND provider = ?
    `)
    .get(familyId, provider);
  if (!row) return null;
  return {
    familyId: row.family_id,
    provider: row.provider,
    config: JSON.parse(row.config_json || '{}'),
    secretEncrypted: row.secret_encrypted,
    updatedAt: row.updated_at
  };
}

export function saveIntegration(familyId, provider, config, secretEncrypted) {
  const now = Date.now();
  database
    .prepare(`
      INSERT INTO integrations(
        family_id, provider, config_json, secret_encrypted, updated_at
      )
      VALUES(?, ?, ?, ?, ?)
      ON CONFLICT(family_id, provider) DO UPDATE SET
        config_json = excluded.config_json,
        secret_encrypted = excluded.secret_encrypted,
        updated_at = excluded.updated_at
    `)
    .run(familyId, provider, JSON.stringify(config || {}), secretEncrypted, now);
  bumpFamilyVersion(familyId);
}

export function deleteIntegration(familyId, provider) {
  const changes = database
    .prepare(`
      DELETE FROM integrations
      WHERE family_id = ? AND provider = ?
    `)
    .run(familyId, provider).changes;
  if (changes > 0) bumpFamilyVersion(familyId);
  return changes > 0;
}

function updateTaskMemberStars(familyId, task, direction) {
  if (!task.memberId || !direction) return null;
  const existingMember = getMemberAuthRow(familyId, task.memberId);
  if (!existingMember) return null;
  const points = Math.max(0, Number(task.stars || 10));
  const nextStars = Math.max(
    0,
    Number(existingMember.stars || 0) + direction * points
  );
  database
    .prepare(`
      UPDATE members SET stars = ?, updated_at = ?
      WHERE family_id = ? AND id = ?
    `)
    .run(nextStars, Date.now(), familyId, task.memberId);
  return getMember(familyId, task.memberId);
}

export function toggleTaskRecord(familyId, taskId, actorMemberId = '') {
  return withTransaction(() => {
    const task = getRecord(familyId, 'tasks', taskId);
    if (!task) return null;
    const completed = !task.completed;
    const now = Date.now();
    const updatedTask = upsertRecord(
      familyId,
      'tasks',
      completed
        ? {
            ...task,
            completed: true,
            completionStatus: 'approved',
            completionApprovedByMemberId: actorMemberId || null,
            completionApprovedAt: now,
            completionRequestedByMemberId: null,
            completionRequestedAt: null
          }
        : {
            ...task,
            completed: false,
            completionStatus: 'open',
            completionApprovedByMemberId: null,
            completionApprovedAt: null,
            completionRequestedByMemberId: null,
            completionRequestedAt: null
          },
      { bump: false }
    );
    const member = updateTaskMemberStars(familyId, task, completed ? 1 : -1);
    bumpFamilyVersion(familyId);
    return {
      task: updatedTask,
      member,
      action: completed ? 'completed' : 'reopened'
    };
  });
}

export function requestTaskApprovalRecord(familyId, taskId, memberId) {
  return withTransaction(() => {
    const task = getRecord(familyId, 'tasks', taskId);
    if (!task) return null;
    if (task.completed) {
      return { task, member: null, action: 'already_completed' };
    }
    const isPending = task.completionStatus === 'pending_approval';
    const updatedTask = upsertRecord(
      familyId,
      'tasks',
      isPending
        ? {
            ...task,
            completionStatus: 'open',
            completionRequestedByMemberId: null,
            completionRequestedAt: null
          }
        : {
            ...task,
            completed: false,
            completionStatus: 'pending_approval',
            completionRequestedByMemberId: memberId,
            completionRequestedAt: Date.now(),
            completionRejectedByMemberId: null,
            completionRejectedAt: null
          },
      { bump: false }
    );
    bumpFamilyVersion(familyId);
    return {
      task: updatedTask,
      member: null,
      action: isPending ? 'approval_cancelled' : 'approval_requested'
    };
  });
}

export function reviewTaskRecord(
  familyId,
  taskId,
  reviewerMemberId,
  approved
) {
  return withTransaction(() => {
    const task = getRecord(familyId, 'tasks', taskId);
    if (!task) return null;
    if (task.completed || task.completionStatus !== 'pending_approval') {
      return { task, member: null, action: 'not_pending' };
    }
    const now = Date.now();
    const updatedTask = upsertRecord(
      familyId,
      'tasks',
      approved
        ? {
            ...task,
            completed: true,
            completionStatus: 'approved',
            completionApprovedByMemberId: reviewerMemberId,
            completionApprovedAt: now,
            completionRejectedByMemberId: null,
            completionRejectedAt: null
          }
        : {
            ...task,
            completed: false,
            completionStatus: 'open',
            completionRequestedByMemberId: null,
            completionRequestedAt: null,
            completionRejectedByMemberId: reviewerMemberId,
            completionRejectedAt: now
          },
      { bump: false }
    );
    const member = approved
      ? updateTaskMemberStars(familyId, task, 1)
      : null;
    bumpFamilyVersion(familyId);
    return {
      task: updatedTask,
      member,
      action: approved ? 'approved' : 'rejected'
    };
  });
}

export function redeemRewardRecord(familyId, rewardId, memberId) {
  return withTransaction(() => {
    const reward = getRecord(familyId, 'rewards', rewardId);
    const memberRow = getMemberAuthRow(familyId, memberId);
    if (!reward || !memberRow) return null;
    const cost = Math.max(0, Number(reward.costStars || 0));
    if (Number(memberRow.stars || 0) < cost) {
      const error = new Error('Nicht genügend Sterne');
      error.statusCode = 409;
      throw error;
    }
    database
      .prepare(`
        UPDATE members SET stars = ?, updated_at = ?
        WHERE family_id = ? AND id = ?
      `)
      .run(Number(memberRow.stars) - cost, Date.now(), familyId, memberId);
    bumpFamilyVersion(familyId);
    return {
      reward,
      member: getMember(familyId, memberId)
    };
  });
}

function importLegacyDatabase() {
  if (getAppMeta('legacy_json_imported_at')) return;
  if (!fs.existsSync(LEGACY_DATABASE_FILE)) return;

  let legacy;
  try {
    legacy = JSON.parse(fs.readFileSync(LEGACY_DATABASE_FILE, 'utf8'));
  } catch (error) {
    console.error('Legacy-Datenbank konnte nicht gelesen werden:', error);
    return;
  }

  const legacyFamilies = Array.isArray(legacy.familiesList)
    ? legacy.familiesList
    : [];
  if (legacyFamilies.length === 0) return;

  withTransaction(() => {
    const now = Date.now();
    legacyFamilies.forEach((family, index) => {
      const familyId = String(family.id || `fam-import-${index + 1}`);
      database
        .prepare(`
          INSERT OR IGNORE INTO families(
            id, name, avatar, badge, password_hash, created_at, updated_at
          )
          VALUES(?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          familyId,
          family.familyName || `Familie ${index + 1}`,
          family.familyAvatar || '',
          family.badge || 'Familie',
          hashSecret(family.password || '1234'),
          now + index,
          now
        );

      database
        .prepare(`
          INSERT OR IGNORE INTO family_versions(family_id, version, updated_at)
          VALUES(?, 1, ?)
        `)
        .run(familyId, now);

      const familyMembers = Array.isArray(family.members)
        ? family.members
        : (index === 0 && Array.isArray(legacy.members) ? legacy.members : []);
      familyMembers.forEach(member => {
        const exists = database
          .prepare('SELECT 1 FROM members WHERE id = ?')
          .get(member.id);
        if (!exists) {
          insertMember(
            familyId,
            {
              ...member,
              role: inferRoleType(member.role, member.name),
              position: inferPosition(member)
            },
            now
          );
        }
      });
    });

    const fallbackFamilyId =
      legacy.familyAccount?.id ||
      legacyFamilies[0]?.id;
    for (const type of RECORD_TYPES) {
      const records = Array.isArray(legacy[type]) ? legacy[type] : [];
      records.forEach(record => {
        const familyId = record.familyId || fallbackFamilyId;
        if (!familyId || !getFamily(familyId)) return;
        upsertRecord(
          familyId,
          type,
          normalizeRecord(type, record, familyId),
          { bump: false }
        );
      });
    }

    setAppMeta('legacy_json_imported_at', new Date().toISOString());
  });
}

if (process.env.DISABLE_LEGACY_IMPORT !== 'true') {
  importLegacyDatabase();
}

export { DATABASE_FILE, RECORD_TYPES, database };
