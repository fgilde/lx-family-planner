// Leichtgewichtige Server-Übersetzung ohne Zusatzabhängigkeiten.
// Die Sprache ist pro Installation fest (APP_LANGUAGE), daher genügt
// ein einfacher Katalog-Lookup mit {{platzhalter}}-Interpolation und
// _one/_other-Pluralformen wie bei i18next.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const localesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'locales'
);

const catalogs = new Map();

function loadCatalog(language) {
  if (catalogs.has(language)) return catalogs.get(language);
  let data = {};
  try {
    data = JSON.parse(
      fs.readFileSync(path.join(localesDir, `${language}.json`), 'utf8')
    );
  } catch {
    data = {};
  }
  catalogs.set(language, data);
  return data;
}

function lookup(catalog, key) {
  let current = catalog;
  for (const part of String(key).split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template, vars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) =>
    vars[name] === undefined ? match : String(vars[name])
  );
}

export function createTranslator(language = 'de') {
  const primary = loadCatalog(language);
  const fallback = language === 'de' ? primary : loadCatalog('de');

  return function t(key, vars = {}) {
    let resolvedKey = key;
    if (typeof vars.count === 'number') {
      const plural = vars.count === 1 ? `${key}_one` : `${key}_other`;
      if (
        lookup(primary, plural) !== undefined ||
        lookup(fallback, plural) !== undefined
      ) {
        resolvedKey = plural;
      }
    }
    const template =
      lookup(primary, resolvedKey) ?? lookup(fallback, resolvedKey);
    if (template === undefined) return key;
    return interpolate(template, vars);
  };
}
