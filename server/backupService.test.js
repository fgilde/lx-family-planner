import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pruneDatabaseBackups } from './backupService.js';

function backupName(second) {
  return `family-planner-2026-08-09T12-00-${String(second).padStart(2, '0')}-000Z.sqlite`;
}

test('backup retention keeps the newest three backup pairs and no other file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lx-family-backups-'));
  try {
    for (let index = 1; index <= 5; index += 1) {
      const file = path.join(directory, backupName(index));
      fs.writeFileSync(file, `backup ${index}`);
      fs.writeFileSync(`${file}.manifest.json`, `{\"index\":${index}}`);
      const timestamp = new Date(
        `2026-08-09T12:00:${String(index).padStart(2, '0')}.000Z`
      );
      fs.utimesSync(file, timestamp, timestamp);
    }
    fs.writeFileSync(path.join(directory, 'keep-me.txt'), 'not an LX backup');

    const retention = pruneDatabaseBackups({ backupDirectory: directory, keep: 3 });

    assert.equal(retention.kept.length, 3);
    assert.equal(retention.removed.length, 2);
    assert.ok(fs.existsSync(path.join(directory, backupName(5))));
    assert.ok(fs.existsSync(`${path.join(directory, backupName(5))}.manifest.json`));
    assert.equal(fs.existsSync(path.join(directory, backupName(1))), false);
    assert.equal(fs.existsSync(`${path.join(directory, backupName(1))}.manifest.json`), false);
    assert.equal(
      fs.readFileSync(path.join(directory, 'keep-me.txt'), 'utf8'),
      'not an LX backup'
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
