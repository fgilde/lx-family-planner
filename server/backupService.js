import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { createDataManifest } from './dataIntegrity.js';

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

export function createDatabaseBackup({
  databaseFile = databaseFilePath(),
  backupDirectory = backupDirectoryPath()
} = {}) {
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
  return {
    file: target,
    manifestFile: manifestTarget,
    manifest
  };
}
