import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const testDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'lx-registration-security-')
);
process.env.DATABASE_FILE = path.join(testDirectory, 'test.sqlite');
process.env.DISABLE_LEGACY_IMPORT = 'true';
process.env.APP_SECRET = 'registration-security-test-secret';
process.env.NODE_ENV = 'test';
process.env.REGISTRATION_MODE = 'first-family';
process.env.PUBLIC_FAMILY_DIRECTORY = 'false';
process.env.NEXTCLOUD_AUTO_PROVISION = 'false';

const [{ createApp }, { database }] = await Promise.all([
  import('./app.js'),
  import('./database.js')
]);

const server = createApp().listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test('public login copy never suggests a concrete family account', () => {
  const projectRoot = path.resolve(import.meta.dirname, '..');
  const german = JSON.parse(
    fs.readFileSync(
      path.join(projectRoot, 'src', 'i18n', 'locales', 'de', 'auth.json'),
      'utf8'
    )
  );
  const english = JSON.parse(
    fs.readFileSync(
      path.join(projectRoot, 'src', 'i18n', 'locales', 'en', 'auth.json'),
      'utf8'
    )
  );
  assert.equal(
    german.login.familyStep.familyNamePlaceholder,
    'Familienname eingeben'
  );
  assert.equal(
    english.login.familyStep.familyNamePlaceholder,
    'Enter family name'
  );
});

async function request(pathname, options = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(body));
  return { response, body };
}

after(async () => {
  await new Promise(resolve => server.close(resolve));
  database.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('default registration admits only the first family and never exposes names', async () => {
  const initial = await request('/api/public/families');
  assert.equal(initial.body.directoryEnabled, false);
  assert.deepEqual(initial.body.families, []);
  assert.deepEqual(initial.body.registration, {
    mode: 'first-family',
    allowed: true,
    requiresInvite: false
  });

  const password = 'private-family-password';
  const first = await request(
    '/api/public/register',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        familyName: 'Verborgene Testfamilie',
        password,
        members: [
          { name: 'Erstes Profil', position: 'mama', role: 'adult' }
        ]
      })
    },
    201
  );
  assert.equal(first.body.family.familyName, 'Verborgene Testfamilie');

  const protectedDirectory = await request('/api/public/families');
  assert.deepEqual(protectedDirectory.body.families, []);
  assert.equal(protectedDirectory.body.registration.allowed, false);

  await request(
    '/api/public/register',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        familyName: 'Fremde Familie',
        password: 'must-not-be-created',
        members: [
          { name: 'Fremdes Profil', position: 'papa', role: 'adult' }
        ]
      })
    },
    403
  );

  const login = await request(
    '/api/auth/family',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        familyName: 'Verborgene Testfamilie',
        password
      })
    }
  );
  assert.equal(login.body.family.familyName, 'Verborgene Testfamilie');

  const rejected = await request(
    '/api/auth/family',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        familyName: 'Verborgene Testfamilie',
        password: 'wrong-password'
      })
    },
    401
  );
  assert.equal(rejected.body.error, 'Familie oder Passwort ist nicht korrekt.');
});
