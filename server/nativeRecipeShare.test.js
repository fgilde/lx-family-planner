import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hasNativeRecipeShareRequest } from '../src/utils/nativeRecipeShare.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('native recipe share links are recognized without changing normal routes', () => {
  assert.equal(
    hasNativeRecipeShareRequest(
      'http://localhost/?view=meals&nativeRecipeShare=1'
    ),
    true
  );
  assert.equal(
    hasNativeRecipeShareRequest('http://localhost/?view=meals'),
    false
  );
});

test('Android advertises and processes My Recipe Box backup streams', () => {
  const manifest = readFileSync(
    join(root, 'android/app/src/main/AndroidManifest.xml'),
    'utf8'
  );
  const activity = readFileSync(
    join(
      root,
      'android/app/src/main/java/com/lxfamily/planner/MainActivity.java'
    ),
    'utf8'
  );
  const receiver = readFileSync(
    join(
      root,
      'android/app/src/main/java/com/lxfamily/planner/LXShareReceiverPlugin.java'
    ),
    'utf8'
  );

  for (const mimeType of [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ]) {
    assert.match(manifest, new RegExp(`android:mimeType="${mimeType}"`));
  }
  assert.match(activity, /registerPlugin\(LXShareReceiverPlugin\.class\)/);
  assert.match(activity, /nativeRecipeShare/);
  assert.match(receiver, /Intent\.EXTRA_STREAM/);
  assert.match(receiver, /MAX_SHARE_BYTES = 120L \* 1024L \* 1024L/);
  assert.match(receiver, /isZipArchive\(target\)/);
  assert.match(receiver, /getPendingRecipeShare/);
  assert.match(receiver, /clearPendingRecipeShare/);
});
