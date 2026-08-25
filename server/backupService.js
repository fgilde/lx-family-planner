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

function backupEntries(backupDirectory) {
  const directory = path.resolve(backupDirectory);
  if (!fs.existsSync(directory)) return [];
  return fs
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
}

export function listDatabaseBackups({
  backupDirectory = backupDirectoryPath()
} = {}) {
  return backupEntries(backupDirectory).map(entry => ({ ...entry }));
}

export function listDatabaseBackupDetails({
  backupDirectory = backupDirectoryPath()
} = {}) {
  return backupEntries(backupDirectory).map(entry => {
    try {
      const { manifest } = verifiedBackupManifest(entry.file);
      return {
        fileName: path.basename(entry.file),
        createdAt: Date.parse(manifest.createdAt) || entry.modifiedAt,
        modifiedAt: entry.modifiedAt,
        size: Number(manifest.databaseBytes || fs.statSync(entry.file).size),
        verified: true,
        error: ''
      };
    } catch (error) {
      return {
        fileName: path.basename(entry.file),
        createdAt: entry.modifiedAt,
        modifiedAt: entry.modifiedAt,
        size: fs.statSync(entry.file).size,
        verified: false,
        error: String(error.message || 'Prüfung fehlgeschlagen.').slice(0, 300)
      };
    }
  });
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
  const backups = backupEntries(directory);

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

function resolveRestoreSource(backupDirectory, backupFile) {
  const directory = path.resolve(backupDirectory);
  const candidate = backupFile
    ? path.resolve(
        path.isAbsolute(backupFile) ? backupFile : path.join(directory, backupFile)
      )
    : backupEntries(directory)[0]?.file;
  if (!candidate) {
    throw new Error('Es wurde keine Datenbanksicherung gefunden.');
  }
  if (
    path.dirname(candidate) !== directory ||
    !BACKUP_FILE_NAME.test(path.basename(candidate))
  ) {
    throw new Error('Die Sicherung muss eine LX-Sicherung aus dem Backup-Ordner sein.');
  }
  if (!fs.existsSync(candidate)) {
    throw new Error('Die ausgewählte Datenbanksicherung wurde nicht gefunden.');
  }
  return candidate;
}

function verifiedBackupManifest(backupFile) {
  const manifestFile = `${backupFile}.manifest.json`;
  if (!fs.existsSync(manifestFile)) {
    throw new Error('Das Prüfmanifest der ausgewählten Sicherung fehlt.');
  }
  let expected;
  try {
    expected = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch {
    throw new Error('Das Prüfmanifest der ausgewählten Sicherung ist ungültig.');
  }
  const actual = createDataManifest(backupFile, { includeFileHash: true });
  if (
    expected.formatVersion !== 1 ||
    expected.ok !== true ||
    actual.ok !== true ||
    !expected.databaseSha256 ||
    expected.databaseSha256 !== actual.databaseSha256 ||
    Number(expected.databaseBytes) !== actual.databaseBytes
  ) {
    throw new Error(
      'Die ausgewählte Sicherung ist beschädigt oder passt nicht zu ihrem Prüfmanifest.'
    );
  }
  return { manifestFile, manifest: actual };
}

/**
 * Restores only a verified backup from the configured backup directory.
 * The caller must stop the server first so no process keeps a WAL connection
 * open while the database and its sidecars are replaced.
 */
export function restoreDatabaseBackup({
  backupFile = '',
  backupDirectory = backupDirectoryPath(),
  databaseFile = databaseFilePath(),
  serverStopped = false
} = {}) {
  if (!serverStopped) {
    throw new Error(
      'Der Server muss vor der Wiederherstellung angehalten und dies ausdrücklich bestätigt werden.'
    );
  }

  const directory = path.resolve(backupDirectory);
  const target = path.resolve(databaseFile);
  const source = resolveRestoreSource(directory, backupFile);
  const { manifestFile, manifest } = verifiedBackupManifest(source);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });

  const existingBackups = backupEntries(directory).length;
  const safetyBackup = fs.existsSync(target)
    ? createDatabaseBackup({
        databaseFile: target,
        backupDirectory: directory,
        keep: Math.max(DEFAULT_BACKUP_KEEP_COUNT, existingBackups + 1)
      })
    : null;

  const temporaryTarget = path.join(
    path.dirname(target),
    `.${path.basename(target)}.restore-${process.pid}-${Date.now()}`
  );
  let targetChanged = false;
  try {
    fs.copyFileSync(source, temporaryTarget, fs.constants.COPYFILE_EXCL);
    const copied = createDataManifest(temporaryTarget, { includeFileHash: true });
    if (!copied.ok || copied.databaseSha256 !== manifest.databaseSha256) {
      throw new Error('Die vorbereitete Wiederherstellung hat die Prüfung nicht bestanden.');
    }

    targetChanged = true;
    for (const file of [target, `${target}-wal`, `${target}-shm`]) {
      if (fs.existsSync(file)) fs.rmSync(file, { force: false });
    }
    fs.renameSync(temporaryTarget, target);

    const restored = createDataManifest(target, { includeFileHash: true });
    if (!restored.ok || restored.databaseSha256 !== manifest.databaseSha256) {
      throw new Error('Die wiederhergestellte Datenbank ist nicht identisch mit der Sicherung.');
    }
    return {
      file: target,
      source,
      manifestFile,
      safetyBackupFile: safetyBackup?.file || ''
    };
  } catch (error) {
    if (fs.existsSync(temporaryTarget)) {
      fs.rmSync(temporaryTarget, { force: false });
    }
    if (targetChanged) {
      if (fs.existsSync(target)) fs.rmSync(target, { force: false });
      if (safetyBackup?.file && fs.existsSync(safetyBackup.file)) {
        fs.copyFileSync(safetyBackup.file, target);
      }
    }
    throw error;
  }
}

export { DEFAULT_BACKUP_KEEP_COUNT };
