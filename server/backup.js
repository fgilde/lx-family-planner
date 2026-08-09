import {
  createDatabaseBackup,
  pruneDatabaseBackups
} from './backupService.js';

const args = process.argv.slice(2);
const mode = args[0] === '--prune' ? 'prune' : 'create';
const keepArgument =
  mode === 'prune'
    ? args[1]
    : args[0] === '--keep'
      ? args[1]
      : undefined;

if (args.length && !(mode === 'prune' || args[0] === '--keep')) {
  throw new Error(
    'Verwendung: node server/backup.js [--keep ANZAHL | --prune ANZAHL]'
  );
}

const keep = keepArgument === undefined ? 3 : Number(keepArgument);
if (mode === 'prune') {
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
