import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { releaseNotesForVersion } from '../shared/releaseNotes.js';

const projectRoot = process.cwd();

test('the login screen makes the current release and iOS PWA work visible before sign-in', () => {
  const version = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
  ).version;
  const notes = releaseNotesForVersion(version);
  const login = fs.readFileSync(
    path.join(projectRoot, 'src', 'components', 'Auth', 'FamilyLoginScreen.jsx'),
    'utf8'
  );
  const previewCard = fs.readFileSync(
    path.join(projectRoot, 'src', 'components', 'Auth', 'ReleasePreviewCard.jsx'),
    'utf8'
  );

  assert.equal(version, '1.18.5');
  assert.match(login, /<ReleasePreviewCard\s*\/>/);
  assert.match(previewCard, /releaseNotesForVersion\(APP_VERSION\)/);
  assert.equal(
    notes.highlights.some(highlight => highlight.id === 'ios-home-screen-install'),
    true
  );
});
