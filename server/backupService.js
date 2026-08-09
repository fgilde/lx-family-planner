import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { createDataManifest } from './dataIntegrity.js';

const BACKUP_FILE_NAME =
  /^family-planner-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.sqlite$/;
const DEFAULT_BACKUP_KEEP_COUNT = 3;

export function databaseFilePath() {
  return process.env.DATABASE_FILE
    ? path.resolve(process.env.DATABASE_FILE)
    : path.join(process.cwd(), 'family_planner.sqlite');
}

export function backupDirectoryPath() {
  return process.env.BACKUP_DIRECTORY
    ? path.resolve(process.env.BACKUP_DIRECTORY)
    : path.join(process.cwd(), 'backups');
}

function normalizedKeepCount(value) {
  const keep = Number(value);
  if (!Number.isInteger(keep) || keep < 1) {
    throw new Error('Mindestens eine Sicherung muss erhalten bleiben.');
  }
  return keep;
}

function safeBackupEntryPath(backupDirectory, fileName) {
  const directory = path.resolve(backupDirectory);
  const candidate = path.resolve(directory, fileName);
  if (path.dirname(candidate) !== directory) {
    throw new Error('Ungültiger Sicherungsdateiname.');
  }
  return candidate;
}

/**
 * Keeps only verified LX database backup pairs. Files outside the strict LX
 * naming convention are intentionally never touched.
 */
export function pruneDatabaseBackups({
  backupDirectory = backupDirectoryPath(),
  keep = DEFAULT_BACKUP_KEEP_COUNT
} = {}) {
  const retain = normalizedKeepCount(keep);
  const directory = path.resolve(backupDirectory);
  if (!fs.existsSync(directory)) {
    return { kept: [], removed: [] };
  }

  const backups = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && BACKUP_FILE_NAME.test(entry.name))
    .map(entry => {
      const file = safeBackupEntryPath(directory, entry.name);
      return {
        file,
        manifestFile: `${file}.manifest.json`,
        modifiedAt: fs.statSync(file).mtimeMs
      };
    })
    .sort((left, right) =>
      right.modifiedAt - left.modifiedAt || right.file.localeCompare(left.file)
    );

  const kept = backups.slice(0, retain);
  const removed = backups.slice(retain);
  removed.forEach(backup => {
    fs.rmSync(backup.file, { force: false });
    if (fs.existsSync(backup.manifestFile)) {
      fs.rmSync(backup.manifestFile, { force: false });
    }
  });

  return {
    kept: kept.map(backup => backup.file),
    removed: removed.map(backup => backup.file)
  };
}

export function createDatabaseBackup({
  databaseFile = databaseFilePath(),
  backupDirectory = backupDirectoryPath(),
  keep = DEFAULT_BACKUP_KEEP_COUNT
} = {}) {
  const retentionKeep = normalizedKeepCount(keep);
  fs.mkdirSync(backupDirectory, { recursive: true });
  const timestamp = new Date()
    .toISOString()
    .replaceAll(':', '-')
    .replaceAll('.', '-');
  const target = path.join(
    backupDirectory,
    `family-planner-${timestamp}.sqlite`
  );
  const escapedTarget = target.replaceAll("'", "''");
  const database = new DatabaseSync(databaseFile);
  try {
    database.exec('PRAGMA wal_checkpoint(FULL)');
    database.exec(`VACUUM INTO '${escapedTarget}'`);
  } finally {
    database.close();
  }

  const manifestTarget = `${target}.manifest.json`;
  const manifest = createDataManifest(target, { includeFileHash: true });
  fs.writeFileSync(
    manifestTarget,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
  if (!manifest.ok) {
    throw new Error(
      'Die Sicherung wurde erstellt, hat die Integritätsprüfung aber nicht bestanden.'
    );
  }
  const retention = pruneDatabaseBackups({
    backupDirectory,
    keep: retentionKeep
  });
  return {
    file: target,
    manifestFile: manifestTarget,
    manifest,
    retention
  };
}

export { DEFAULT_BACKUP_KEEP_COUNT };
