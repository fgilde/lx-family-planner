import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import express from 'express';

import { registerRuntimeRoutes } from './routes/runtimeRoutes.js';

const fixtureDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'lx-family-runtime-routes-')
);

after(() => {
  fs.rmSync(fixtureDirectory, { recursive: true, force: true });
});

const sha256 = value =>
  createHash('sha256').update(value).digest('hex');

test('APK routes never announce metadata for a different APK file', async () => {
  const staleApk = Buffer.from('old-apk-content');
  const currentApk = Buffer.from('current-apk-content');
  const staleDirectory = path.join(fixtureDirectory, 'data', 'apk');
  const currentDirectory = path.join(fixtureDirectory, 'dist', 'apk');
  fs.mkdirSync(staleDirectory, { recursive: true });
  fs.mkdirSync(currentDirectory, { recursive: true });
  fs.writeFileSync(path.join(staleDirectory, 'latest.apk'), staleApk);
  fs.writeFileSync(path.join(currentDirectory, 'latest.apk'), currentApk);

  const currentMetadata = {
    versionName: '1.18.2',
    versionCode: 43,
    buildKind: 'release',
    sha256: sha256(currentApk)
  };
  fs.writeFileSync(
    path.join(staleDirectory, 'version.json'),
    JSON.stringify(currentMetadata)
  );
  fs.writeFileSync(
    path.join(currentDirectory, 'version.json'),
    JSON.stringify(currentMetadata)
  );

  const app = express();
  const { availableApkRelease } = registerRuntimeRoutes(app, {
    appVersion: '1.18.2',
    appLanguage: 'de',
    supportedLanguages: ['de'],
    normalizeRequestLanguage: value => value,
    publicAppUrl: 'http://127.0.0.1',
    isProduction: true,
    cleanText: (value, fallback) => String(value || fallback || ''),
    projectRoot: fixtureDirectory
  });
  const release = availableApkRelease();
  assert.equal(release.file, path.join(currentDirectory, 'latest.apk'));
  assert.equal(release.metadata.sha256, sha256(currentApk));
});
