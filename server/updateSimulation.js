import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  createDataManifest,
  verifyDataManifest
} from './dataIntegrity.js';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}
const sourceFile = argumentValue('--database');
if (!sourceFile) {
  throw new Error(
    'Bitte die zu prüfende Sicherung mit --database angeben.'
  );
}

const resolvedSource = path.resolve(sourceFile);
const baseline = createDataManifest(resolvedSource);
if (!baseline.ok) {
  throw new Error(
    'Die Ausgangssicherung ist nicht konsistent und wird nicht migriert.'
  );
}

const simulationDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'lx-family-update-')
);
const simulationDatabase = path.join(
  simulationDirectory,
  'family_planner.sqlite'
);

try {
  fs.copyFileSync(resolvedSource, simulationDatabase);
  process.env.DATABASE_FILE = simulationDatabase;
  process.env.DISABLE_LEGACY_IMPORT = 'true';

  const databaseModule = await import(
    `./database.js?update-simulation=${Date.now()}`
  );
  databaseModule.database.close();

  const result = verifyDataManifest(simulationDatabase, baseline);
  if (!result.ok) {
    result.errors.forEach(error => console.error(`- ${error}`));
    throw new Error(
      'Die neue Version verändert bestehende Familieninhalte unerwartet.'
    );
  }
  const migrated = createDataManifest(simulationDatabase);
  console.log(
    `Update-Simulation erfolgreich (Datenbankschema ${migrated.sqliteUserVersion}).`
  );
} finally {
  fs.rmSync(simulationDirectory, { recursive: true, force: true });
}
