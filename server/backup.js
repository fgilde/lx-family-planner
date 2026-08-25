import {
  createDatabaseBackup,
  pruneDatabaseBackups,
  restoreDatabaseBackup
} from './backupService.js';

const args = process.argv.slice(2);
const mode = args[0] === '--prune'
  ? 'prune'
  : args[0] === '--restore'
    ? 'restore'
    : 'create';
const keepArgument =
  mode === 'prune'
    ? args[1]
    : mode === 'create' && args[0] === '--keep'
      ? args[1]
      : undefined;

if (
  args.length &&
  !(
    mode === 'prune' ||
    mode === 'restore' ||
    args[0] === '--keep'
  )
) {
  throw new Error(
    'Verwendung: node server/backup.js [--keep ANZAHL | --prune ANZAHL | --restore [DATEI] --confirm-stopped]'
  );
}

const keep = keepArgument === undefined ? 3 : Number(keepArgument);
if (mode === 'restore') {
  if (!args.includes('--confirm-stopped')) {
    throw new Error(
      'Wiederherstellung abgebrochen: --confirm-stopped fehlt.'
    );
  }
  const requestedFile = args[1]?.startsWith('--') ? '' : args[1] || '';
  const restored = restoreDatabaseBackup({
    backupFile: requestedFile,
    serverStopped: true
  });
  console.log(`Datenbank wiederhergestellt: ${restored.file}`);
  console.log(`Verwendete Sicherung: ${restored.source}`);
  if (restored.safetyBackupFile) {
    console.log(`Sicherung vor Wiederherstellung: ${restored.safetyBackupFile}`);
  }
} else if (mode === 'prune') {
  const retention = pruneDatabaseBackups({ keep });
  console.log(`Sicherungen behalten: ${retention.kept.length}`);
  console.log(`Alte Sicherungen entfernt: ${retention.removed.length}`);
} else {
  const backup = createDatabaseBackup({ keep });
  console.log(`Datenbanksicherung erstellt: ${backup.file}`);
  console.log(`Prüfmanifest erstellt: ${backup.manifestFile}`);
  console.log(`Sicherungen behalten: ${backup.retention.kept.length}`);
  console.log(`Alte Sicherungen entfernt: ${backup.retention.removed.length}`);
}
