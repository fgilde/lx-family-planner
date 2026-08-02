#!/usr/bin/env node
// Prüft, ob alle Sprachen dieselben Übersetzungsschlüssel enthalten.
// Verglichen wird jede Sprache gegen Deutsch (Quelle der Wahrheit).
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = [
  { dir: 'src/i18n/locales', perNamespace: true },
  { dir: 'server/locales', perNamespace: false }
];
const REFERENCE_LANGUAGE = 'de';

function flattenKeys(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    problems.push(`${file}: JSON nicht lesbar (${error.message})`);
    return null;
  }
}

const problems = [];
let comparedFiles = 0;

for (const root of ROOTS) {
  const rootPath = path.resolve(root.dir);
  if (!fs.existsSync(rootPath)) continue;

  const languages = root.perNamespace
    ? fs.readdirSync(rootPath).filter(entry =>
        fs.statSync(path.join(rootPath, entry)).isDirectory()
      )
    : fs.readdirSync(rootPath)
        .filter(entry => entry.endsWith('.json'))
        .map(entry => entry.replace(/\.json$/, ''));

  if (!languages.includes(REFERENCE_LANGUAGE)) {
    problems.push(`${root.dir}: Referenzsprache "${REFERENCE_LANGUAGE}" fehlt.`);
    continue;
  }

  const fileFor = (language, namespace) =>
    root.perNamespace
      ? path.join(rootPath, language, `${namespace}.json`)
      : path.join(rootPath, `${language}.json`);

  const namespaces = root.perNamespace
    ? fs.readdirSync(path.join(rootPath, REFERENCE_LANGUAGE))
        .filter(entry => entry.endsWith('.json'))
        .map(entry => entry.replace(/\.json$/, ''))
    : [''];

  for (const namespace of namespaces) {
    const referenceData = readJson(fileFor(REFERENCE_LANGUAGE, namespace));
    if (!referenceData) continue;
    const referenceKeys = new Set(flattenKeys(referenceData));

    for (const language of languages) {
      if (language === REFERENCE_LANGUAGE) continue;
      const file = fileFor(language, namespace);
      const relativeFile = path.relative(process.cwd(), file);
      if (!fs.existsSync(file)) {
        problems.push(`${relativeFile}: Datei fehlt.`);
        continue;
      }
      const data = readJson(file);
      if (!data) continue;
      comparedFiles += 1;
      const keys = new Set(flattenKeys(data));
      for (const key of referenceKeys) {
        if (!keys.has(key)) {
          problems.push(`${relativeFile}: Schlüssel fehlt: ${key}`);
        }
      }
      for (const key of keys) {
        if (!referenceKeys.has(key)) {
          problems.push(`${relativeFile}: Überzähliger Schlüssel: ${key}`);
        }
      }
    }
  }
}

if (problems.length) {
  console.error(`i18n-Prüfung fehlgeschlagen (${problems.length} Probleme):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`i18n-Prüfung erfolgreich: ${comparedFiles} Dateien verglichen.`);
