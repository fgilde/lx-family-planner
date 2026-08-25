import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test, { after } from 'node:test';

process.env.NODE_ENV = 'test';

const {
  createWebDavFolder,
  deleteWebDavEntry,
  downloadWebDavFile,
  inspectWebDav,
  listWebDavEntries,
  normalizeWebDavBaseUrl,
  normalizeWebDavRelativePath,
  uploadWebDavFile
} = await import('./webdav.js');

const files = new Map([
  ['plan.txt', {
    content: Buffer.from('Familienplan'),
    contentType: 'text/plain; charset=utf-8',
    etag: '"initial"'
  }]
]);
const folders = new Set(['Archive']);
const expectedAuthorization = `Basic ${Buffer.from(
  'familie:sicheres-app-passwort',
  'utf8'
).toString('base64')}`;

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function resourceXml(path, { folder = false, file } = {}) {
  const name = path.split('/').filter(Boolean).at(-1) || 'Familie';
  return `<d:response>
    <d:href>/dav/familie/${path
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/')}${folder ? '/' : ''}</d:href>
    <d:propstat><d:prop>
      <d:displayname>${xmlEscape(name)}</d:displayname>
      <d:resourcetype>${folder ? '<d:collection/>' : ''}</d:resourcetype>
      ${file ? `<d:getcontentlength>${file.content.length}</d:getcontentlength>` : ''}
      ${file ? `<d:getcontenttype>${xmlEscape(file.contentType)}</d:getcontenttype>` : ''}
      ${file ? `<d:getetag>${xmlEscape(file.etag)}</d:getetag>` : ''}
      <d:getlastmodified>Tue, 25 Aug 2026 10:00:00 GMT</d:getlastmodified>
    </d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
  </d:response>`;
}

function multiStatus(resources) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<d:multistatus xmlns:d="DAV:">${resources.join('')}</d:multistatus>`;
}

function directChildren(path, entries) {
  const prefix = path ? `${path}/` : '';
  return [...entries].filter(entry => {
    if (!entry.startsWith(prefix) || entry === path) return false;
    return !entry.slice(prefix.length).includes('/');
  });
}

const server = createServer(async (request, response) => {
  if (request.headers.authorization !== expectedAuthorization) {
    response.statusCode = 401;
    response.end('Unauthorized');
    return;
  }

  const requestUrl = new URL(request.url, 'http://localhost');
  const prefix = '/dav/familie/';
  if (!requestUrl.pathname.startsWith(prefix)) {
    response.statusCode = 404;
    response.end('Not found');
    return;
  }
  const relativePath = decodeURIComponent(
    requestUrl.pathname.slice(prefix.length).replace(/\/+$/, '')
  );

  if (request.method === 'PROPFIND') {
    response.statusCode = 207;
    response.setHeader('content-type', 'application/xml; charset=utf-8');
    response.setHeader('dav', '1, 2');
    const resources = [resourceXml(relativePath, { folder: true })];
    if (request.headers.depth === '1') {
      for (const folder of directChildren(relativePath, folders)) {
        resources.push(resourceXml(folder, { folder: true }));
      }
      for (const filePath of directChildren(relativePath, files.keys())) {
        resources.push(resourceXml(filePath, { file: files.get(filePath) }));
      }
    }
    response.end(multiStatus(resources));
    return;
  }

  if (request.method === 'MKCOL') {
    folders.add(relativePath);
    response.statusCode = 201;
    response.end();
    return;
  }

  if (request.method === 'PUT') {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    files.set(relativePath, {
      content: Buffer.concat(chunks),
      contentType: request.headers['content-type'] || 'application/octet-stream',
      etag: '"uploaded"'
    });
    response.statusCode = 201;
    response.setHeader('etag', '"uploaded"');
    response.end();
    return;
  }

  if (request.method === 'GET' && files.has(relativePath)) {
    const file = files.get(relativePath);
    response.statusCode = 200;
    response.setHeader('content-type', file.contentType);
    response.setHeader('content-length', String(file.content.length));
    response.setHeader('etag', file.etag);
    response.end(file.content);
    return;
  }

  if (request.method === 'DELETE') {
    const removed = files.delete(relativePath) || folders.delete(relativePath);
    response.statusCode = removed ? 204 : 404;
    response.end();
    return;
  }

  response.statusCode = 404;
  response.end('Not found');
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
after(() => new Promise(resolve => server.close(resolve)));

const address = server.address();
const connection = {
  baseUrl: `http://127.0.0.1:${address.port}/dav/familie`,
  username: 'familie',
  password: 'sicheres-app-passwort',
  appVersion: 'test'
};

test('WebDAV URLs und relative Pfade werden sicher normalisiert', () => {
  assert.equal(
    normalizeWebDavBaseUrl('https://nas.example.test/dav/familie///'),
    'https://nas.example.test/dav/familie/'
  );
  assert.equal(normalizeWebDavRelativePath(' Fotos\\2026 '), 'Fotos/2026');
  assert.throws(
    () => normalizeWebDavRelativePath('../andere-familie'),
    /WebDAV-Pfad ist ungültig/
  );
  assert.throws(
    () => normalizeWebDavBaseUrl('file:///etc/passwd'),
    /http:\/\/ oder https:\/\//
  );
});

test('WebDAV-Verbindung und Ordnerinhalt werden erkannt', async () => {
  const details = await inspectWebDav(connection);
  assert.equal(details.displayName, 'Familie');
  assert.equal(details.davCapabilities, '1, 2');
  assert.equal(details.baseUrl, `${connection.baseUrl}/`);

  const entries = await listWebDavEntries(connection);
  assert.deepEqual(
    entries.map(entry => [entry.name, entry.type]),
    [['Archive', 'folder'], ['plan.txt', 'file']]
  );
  assert.equal(entries[1].size, Buffer.byteLength('Familienplan'));
});

test('WebDAV unterstützt Ordner, Upload, Download und Löschen', async () => {
  const folder = await createWebDavFolder(connection, '', 'Fotos 2026');
  assert.equal(folder.path, 'Fotos 2026');

  const uploaded = await uploadWebDavFile(
    connection,
    folder.path,
    'Sommer.jpg',
    Buffer.from('bilddaten'),
    'image/jpeg'
  );
  assert.equal(uploaded.path, 'Fotos 2026/Sommer.jpg');
  assert.equal(uploaded.etag, '"uploaded"');

  const listing = await listWebDavEntries(connection, folder.path);
  assert.deepEqual(listing.map(entry => entry.name), ['Sommer.jpg']);

  const downloaded = await downloadWebDavFile(connection, uploaded.path);
  assert.equal(downloaded.content.toString('utf8'), 'bilddaten');
  assert.equal(downloaded.contentType, 'image/jpeg');

  assert.equal(await deleteWebDavEntry(connection, uploaded.path), true);
  assert.deepEqual(await listWebDavEntries(connection, folder.path), []);
});

test('WebDAV-Zugangsdatenfehler werden verständlich gemeldet', async () => {
  await assert.rejects(
    inspectWebDav({ ...connection, password: 'falsch' }),
    error => error.statusCode === 401 && /Passwort abgelehnt/.test(error.message)
  );
});
