import { createDatabaseBackup } from './backupService.js';

const backup = createDatabaseBackup();
console.log(`Datenbanksicherung erstellt: ${backup.file}`);
console.log(`Prüfmanifest erstellt: ${backup.manifestFile}`);
