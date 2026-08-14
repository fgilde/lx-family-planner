import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
  PRODUCT_TITLE
} from '../shared/brand.js';
import { releaseNotesForVersion } from '../shared/releaseNotes.js';

const projectRoot = process.cwd();

test('public brand uses LX Family while update identifiers stay stable', () => {
  assert.equal(PRODUCT_NAME, 'LX Family');
  assert.equal(PRODUCT_TAGLINE, 'Private Family OS');
  assert.equal(PRODUCT_TITLE, 'LX Family · Private Family OS');

  const manifest = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'public/manifest.json'), 'utf8')
  );
  const capacitor = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'capacitor.config.json'), 'utf8')
  );
  assert.equal(manifest.name, PRODUCT_NAME);
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  assert.match(indexHtml, /apple-mobile-web-app-capable/);
  assert.match(indexHtml, /apple-touch-icon/);
  assert.equal(capacitor.appName, PRODUCT_NAME);
  assert.equal(capacitor.appId, 'com.lxfamily.planner');

  const currentNotes = releaseNotesForVersion('1.18.1');
  assert.equal(
    currentNotes.highlights.some(note => note.id === 'lx-family-name'),
    true
  );
});
