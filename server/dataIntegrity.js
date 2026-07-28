import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'url';

const DEFAULT_DATABASE_FILE = process.env.DATABASE_FILE
  ? path.resolve(process.env.DATABASE_FILE)
  : path.join(process.cwd(), 'family_planner.sqlite');

const PROTECTED_TABLES = [
  { name: 'app_meta', key: ['key'] },
  { name: 'families', key: ['id'] },
  { name: 'members', key: ['id'] },
  { name: 'family_records', key: ['family_id', 'type', 'id'] },
  { name: 'push_subscriptions', key: ['id'] },
  { name: 'native_push_devices', key: ['id'] },
  { name: 'inbox_notifications', key: ['id'] },
  {
    name: 'event_reminder_deliveries',
    key: [
      'family_id',
      'event_id',
      'event_start_key',
      'reminder_minutes'
    ]
  },
  { name: 'calendar_subscriptions', key: ['id'] },
  { name: 'integrations', key: ['family_id', 'provider'] },
  {
    name: 'integration_sync_items',
    key: ['family_id', 'provider', 'item_type', 'local_id']
  },
  { name: 'family_relationships', key: ['id'] },
  { name: 'shared_family_events', key: ['id'] },
  {
    name: 'shared_family_event_recipients',
    key: ['event_id', 'family_id']
  },
  { name: 'problem_reports', key: ['id'] }
];

const OBSERVED_TABLES = [
  ...PROTECTED_TABLES,
  { name: 'family_versions', key: ['family_id'], mutable: true },
  { name: 'sessions', key: ['token_hash'], mutable: true },
  { name: 'schema_migrations', key: ['version'], mutable: true }
];

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function normalizeValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString('base64');
  }
  return value;
}

function stableRow(row, columns) {
  return Object.fromEntries(
    columns.map(column => [column, normalizeValue(row[column])])
  );
}

function rowDigest(row, columns) {
  return createHash('sha256')
    .update(JSON.stringify(stableRow(row, columns)))
    .digest('hex');
}

function rowKey(row, columns) {
  return columns.map(column => String(row[column] ?? '')).join('\u001f');
}

function tableExists(database, tableName) {
  return Boolean(
    database
      .prepare(`
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
      `)
      .get(tableName)
  );
}

function tableColumns(database, tableName) {
  return database
    .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
    .all()
    .map(column => column.name);
}

function readIntegrity(database) {
  const integrityRows = database.prepare('PRAGMA integrity_check').all();
  const integrityMessages = integrityRows.map(
    row => String(Object.values(row)[0] ?? '')
  );
  const foreignKeyRows = database.prepare('PRAGMA foreign_key_check').all();
  return {
    ok:
      integrityMessages.length === 1 &&
      integrityMessages[0].toLowerCase() === 'ok' &&
      foreignKeyRows.length === 0,
    messages: integrityMessages,
    foreignKeyErrors: foreignKeyRows
  };
}

function readTableSnapshot(database, specification, columnsOverride = null) {
  if (!tableExists(database, specification.name)) {
    return {
      exists: false,
      columns: [],
      count: 0,
      records: {}
    };
  }
  const availableColumns = tableColumns(database, specification.name);
  const columns = columnsOverride || availableColumns;
  const missingColumns = columns.filter(
    column => !availableColumns.includes(column)
  );
  if (missingColumns.length) {
    return {
      exists: true,
      columns: availableColumns,
      count: 0,
      records: {},
      missingColumns
    };
  }
  const selectedColumns = columns.map(quoteIdentifier).join(', ');
  const orderColumns = specification.key.map(quoteIdentifier).join(', ');
  const statement = database.prepare(`
    SELECT ${selectedColumns}
    FROM ${quoteIdentifier(specification.name)}
    ORDER BY ${orderColumns}
  `);
  const records = {};
  let count = 0;
  for (const row of statement.iterate()) {
    records[rowKey(row, specification.key)] = rowDigest(row, columns);
    count += 1;
  }
  return {
    exists: true,
    columns,
    count,
    records
  };
}

function invalidFamilyRecords(database) {
  if (!tableExists(database, 'family_records')) return [];
  const invalid = [];
  const statement = database.prepare(`
    SELECT family_id, type, id, data_json
    FROM family_records
    ORDER BY family_id, type, id
  `);
  for (const row of statement.iterate()) {
    try {
      const parsed = JSON.parse(row.data_json);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Kein Objekt');
      }
    } catch {
      invalid.push({
        familyId: row.family_id,
        type: row.type,
        id: row.id
      });
    }
  }
  return invalid;
}

function resourceTypeCounts(database) {
  if (!tableExists(database, 'family_records')) return {};
  return Object.fromEntries(
    database
      .prepare(`
        SELECT type, COUNT(*) AS count
        FROM family_records
        GROUP BY type
        ORDER BY type
      `)
      .all()
      .map(row => [row.type, Number(row.count || 0)])
  );
}

function fileHash(databaseFile) {
  const hash = createHash('sha256');
  const descriptor = fs.openSync(databaseFile, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(
        descriptor,
        buffer,
        0,
        buffer.length,
        null
      );
      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
    return hash.digest('hex');
  } finally {
    fs.closeSync(descriptor);
  }
}

export function createDataManifest(
  databaseFile = DEFAULT_DATABASE_FILE,
  { includeFileHash = false } = {}
) {
  const resolvedFile = path.resolve(databaseFile);
  const database = new DatabaseSync(resolvedFile, {
    open: true,
    readOnly: true
  });
  try {
    const integrity = readIntegrity(database);
    const invalidRecords = invalidFamilyRecords(database);
    const tables = Object.fromEntries(
      OBSERVED_TABLES.map(specification => [
        specification.name,
        {
          mutable: Boolean(specification.mutable),
          ...readTableSnapshot(database, specification)
        }
      ])
    );
    return {
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      databaseFile: path.basename(resolvedFile),
      databaseBytes: fs.statSync(resolvedFile).size,
      databaseSha256: includeFileHash ? fileHash(resolvedFile) : '',
      sqliteUserVersion: Number(
        database.prepare('PRAGMA user_version').get()?.user_version || 0
      ),
      integrity,
      invalidFamilyRecords: invalidRecords,
      resourceTypeCounts: resourceTypeCounts(database),
      tables,
      ok: integrity.ok && invalidRecords.length === 0
    };
  } finally {
    database.close();
  }
}

export function verifyDataManifest(
  databaseFile = DEFAULT_DATABASE_FILE,
  baselineManifest
) {
  const baseline = baselineManifest || {};
  const resolvedFile = path.resolve(databaseFile);
  const database = new DatabaseSync(resolvedFile, {
    open: true,
    readOnly: true
  });
  const errors = [];
  const warnings = [];
  try {
    const integrity = readIntegrity(database);
    if (!integrity.ok) {
      errors.push('Die SQLite-Integritätsprüfung ist fehlgeschlagen.');
    }
    const invalidRecords = invalidFamilyRecords(database);
    if (invalidRecords.length) {
      errors.push(
        `${invalidRecords.length} gespeicherte Einträge enthalten ungültige Daten.`
      );
    }

    PROTECTED_TABLES.forEach(specification => {
      const expected = baseline.tables?.[specification.name];
      if (!expected?.exists) return;
      const current = readTableSnapshot(
        database,
        specification,
        expected.columns
      );
      if (!current.exists) {
        errors.push(`Datentabelle fehlt: ${specification.name}`);
        return;
      }
      if (current.missingColumns?.length) {
        errors.push(
          `${specification.name}: Spalten fehlen (${current.missingColumns.join(', ')}).`
        );
        return;
      }
      const missingKeys = Object.keys(expected.records || {}).filter(
        key => !Object.hasOwn(current.records, key)
      );
      if (missingKeys.length) {
        errors.push(
          `${specification.name}: ${missingKeys.length} bestehende Datensätze fehlen.`
        );
      }
      const changedKeys = Object.entries(expected.records || {})
        .filter(([key, digest]) =>
          Object.hasOwn(current.records, key) &&
          current.records[key] !== digest
        )
        .map(([key]) => key);
      if (changedKeys.length) {
        errors.push(
          `${specification.name}: ${changedKeys.length} bestehende Datensätze wurden unerwartet verändert.`
        );
      }
      if (current.count > expected.count) {
        warnings.push(
          `${specification.name}: ${current.count - expected.count} neue Datensätze kamen hinzu.`
        );
      }
    });

    return {
      ok: errors.length === 0,
      checkedAt: new Date().toISOString(),
      databaseFile: resolvedFile,
      integrity,
      invalidFamilyRecords: invalidRecords,
      errors,
      warnings
    };
  } finally {
    database.close();
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function runCli() {
  const databaseFile = argumentValue('--database') || DEFAULT_DATABASE_FILE;
  const manifestTarget = argumentValue('--write-manifest');
  const compareTarget = argumentValue('--compare');

  if (manifestTarget) {
    const manifest = createDataManifest(databaseFile, {
      includeFileHash: true
    });
    fs.writeFileSync(
      path.resolve(manifestTarget),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8'
    );
    if (!manifest.ok) {
      console.error('Datenprüfung fehlgeschlagen.');
      process.exitCode = 1;
      return;
    }
    console.log(`Datenmanifest erstellt: ${path.resolve(manifestTarget)}`);
    return;
  }

  if (compareTarget) {
    const baseline = JSON.parse(
      fs.readFileSync(path.resolve(compareTarget), 'utf8')
    );
    const result = verifyDataManifest(databaseFile, baseline);
    if (!result.ok) {
      console.error('Datenvergleich fehlgeschlagen:');
      result.errors.forEach(error => console.error(`- ${error}`));
      process.exitCode = 1;
      return;
    }
    console.log('Datenvergleich erfolgreich: Alle bestehenden Inhalte und Einstellungen sind vollständig.');
    result.warnings.forEach(warning => console.log(`Hinweis: ${warning}`));
    return;
  }

  const manifest = createDataManifest(databaseFile);
  if (!manifest.ok) {
    console.error(JSON.stringify(manifest, null, 2));
    process.exitCode = 1;
    return;
  }
  const protectedCounts = Object.fromEntries(
    PROTECTED_TABLES.map(({ name }) => [
      name,
      manifest.tables[name]?.count || 0
    ])
  );
  console.log('Datenbank ist konsistent.');
  console.log(JSON.stringify({
    sqliteUserVersion: manifest.sqliteUserVersion,
    resourceTypeCounts: manifest.resourceTypeCounts,
    protectedCounts
  }, null, 2));
}

const entryPoint = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : '';
if (entryPoint === import.meta.url) {
  runCli();
}
