import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const projectRoot = process.cwd();
const scriptPaths = [
  path.join(projectRoot, 'scripts', 'pve-helper.sh'),
  path.join(projectRoot, 'scripts', 'pve-guest-install.sh'),
  path.join(projectRoot, 'scripts', 'pve-manage.sh'),
  path.join(projectRoot, 'scripts', 'docker-update.sh')
];
const scripts = Object.fromEntries(
  scriptPaths.map(file => [
    path.basename(file),
    fs.readFileSync(file, 'utf8')
  ])
);
const windowsGitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
const bashExecutable =
  process.platform === 'win32' && fs.existsSync(windowsGitBash)
    ? windowsGitBash
    : 'bash';

test('PVE helper scripts remain valid Bash', t => {
  const check = spawnSync(
    bashExecutable,
    ['-n', ...scriptPaths],
    { encoding: 'utf8' }
  );
  if (check.error?.code === 'ENOENT') {
    t.skip('Bash ist in dieser Umgebung nicht installiert.');
    return;
  }
  assert.equal(
    check.status,
    0,
    check.stderr || check.stdout || 'Bash-Syntaxprüfung fehlgeschlagen.'
  );
});

test('PVE helper exposes a non-destructive help command', t => {
  const help = spawnSync(
    bashExecutable,
    [scriptPaths[0], '--help'],
    { encoding: 'utf8' }
  );
  if (help.error?.code === 'ENOENT') {
    t.skip('Bash ist in dieser Umgebung nicht installiert.');
    return;
  }
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--dry-run/);
  assert.match(help.stdout, /--non-interactive/);
  assert.match(help.stdout, /PUBLIC_APP_URL/);
  assert.doesNotMatch(help.stdout, /Container jetzt erstellen/);
});

test('PVE host helper creates a guarded unprivileged LXC', () => {
  const helper = scripts['pve-helper.sh'];
  assert.match(helper, /pveversion/);
  assert.match(helper, /pct create/);
  assert.match(helper, /--unprivileged 1/);
  assert.match(helper, /nesting=1,keyctl=1/);
  assert.match(helper, /pct status "\$CTID".*bereits vergeben/s);
  assert.match(helper, /Container jetzt erstellen\?/);
  assert.doesNotMatch(helper, /pct destroy|rm\s+-rf/);
});

test('PVE guest installer protects secrets and uses official Docker packages', () => {
  const installer = scripts['pve-guest-install.sh'];
  assert.match(installer, /download\.docker\.com\/linux\/debian/);
  assert.match(installer, /openssl rand -hex 48/);
  assert.match(installer, /chmod 600 "\$APP_DIR\/\.env"/);
  assert.match(installer, /docker compose build --pull/);
  assert.match(installer, /node server\/dataIntegrity\.js/);
});

test('PVE management command reuses protected update and backup paths', () => {
  const manager = scripts['pve-manage.sh'];
  assert.match(manager, /bash scripts\/docker-update\.sh/);
  assert.match(manager, /node server\/backup\.js/);
  assert.match(manager, /PUBLIC_APP_URL/);
  assert.match(manager, /docker compose/);
  assert.doesNotMatch(manager, /git reset|pct destroy|rm\s+-rf/);
});

test('Linux Docker updates do not require Node.js on the host', () => {
  const updateScript = fs.readFileSync(
    path.join(projectRoot, 'scripts', 'docker-update.sh'),
    'utf8'
  );
  assert.match(updateScript, /grep -oP/);
  assert.doesNotMatch(
    updateScript,
    /expected_version="\$\(node\s+-p/
  );
});

test('Docker and PVE builds retain the signed public Android package', () => {
  const dockerIgnore = fs.readFileSync(
    path.join(projectRoot, '.dockerignore'),
    'utf8'
  );
  const globalApkRule = dockerIgnore.indexOf('*.apk');
  const publicApkRule = dockerIgnore.indexOf('!public/apk/latest.apk');
  assert.equal(globalApkRule >= 0, true);
  assert.equal(publicApkRule > globalApkRule, true);
  assert.equal(
    fs.statSync(
      path.join(projectRoot, 'public', 'apk', 'latest.apk')
    ).size > 1_000_000,
    true
  );
});
