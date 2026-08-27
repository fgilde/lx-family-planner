import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-family-transfer-'));
process.env.DATABASE_FILE = path.join(testDirectory, 'family.sqlite');
process.env.DISABLE_LEGACY_IMPORT = 'true';

const {
  createFamily,
  createRecord,
  exportFamilyTransferData,
  importFamilyTransferData,
  getBootstrap,
  getFamily,
  deleteFamily
} = await import('./database.js');
const {
  encryptFamilyTransfer,
  decryptFamilyTransfer
} = await import('./familyTransfer.js');

test('a family transfer is encrypted and restores only the family content', () => {
  const created = createFamily({
    id: 'fam-transfer-test',
    familyName: 'Umzugstest',
    password: 'familienpasswort-123',
    members: [
      { id: 'mem-transfer-adult', name: 'Pat', role: 'adult', position: 'papa', pin: '1234' },
      { id: 'mem-transfer-child', name: 'Kind', role: 'child', position: 'kind', stars: 12 }
    ]
  });
  createRecord(created.family.id, 'events', {
    id: 'event-transfer',
    title: 'Fußball',
    familyId: created.family.id,
    memberId: 'mem-transfer-child',
    date: '2026-09-01'
  });
  createRecord(created.family.id, 'notes', {
    id: 'note-transfer',
    title: 'Nicht vergessen',
    familyId: created.family.id
  });

  const source = exportFamilyTransferData(created.family.id);
  const bundle = encryptFamilyTransfer(source, 'sicheres-umzugskennwort');
  assert.equal(bundle.data.includes('Fußball'), false);
  const decrypted = decryptFamilyTransfer(bundle, 'sicheres-umzugskennwort');
  assert.equal(decrypted.family.name, 'Umzugstest');

  deleteFamily(created.family.id);
  const imported = importFamilyTransferData(decrypted);
  assert.equal(imported.family.familyName, 'Umzugstest');
  assert.equal(imported.members.length, 2);
  assert.equal(getFamily(created.family.id)?.familyName, 'Umzugstest');
  const bootstrap = getBootstrap(created.family.id);
  assert.equal(bootstrap.resources.events[0].title, 'Fußball');
  assert.equal(bootstrap.resources.events[0].memberId, 'mem-transfer-child');
  assert.equal(bootstrap.resources.notes[0].title, 'Nicht vergessen');
});

test('a family transfer refuses the wrong passphrase', () => {
  const bundle = encryptFamilyTransfer({
    format: 'lx-family-transfer',
    version: 1,
    family: { id: 'fam-any' }
  }, 'sicheres-umzugskennwort');
  assert.throws(
    () => decryptFamilyTransfer(bundle, 'anderes-umzugskennwort'),
    /falsch|verändert/i
  );
});
