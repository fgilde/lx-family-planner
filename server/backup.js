import fs from 'fs';
import path from 'path';
import { database } from './database.js';

const backupDirectory = path.join(process.cwd(), 'backups');
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

database.exec('PRAGMA wal_checkpoint(FULL)');
database.exec(`VACUUM INTO '${escapedTarget}'`);
database.close();

console.log(`Datenbanksicherung erstellt: ${target}`);
