import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import {
  calDavFetchErrorMessage,
  fetchCalDavEvents,
  isSynologyCalDavBaseUrl,
  normalizeCalDavUrl,
  synologyCalendarUrlsFromMultistatus,
  shouldUseSynologyCurlFallback
} from './caldav.js';

test('CalDAV imports a read-only calendar collection with Basic auth', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  const server = http.createServer((request, response) => {
    assert.equal(request.method, 'REPORT');
    assert.equal(request.headers.authorization, `Basic ${Buffer.from('alex:app-secret').toString('base64')}`);
    response.writeHead(207, { 'content-type': 'application/xml; charset=utf-8' });
    response.end(`<?xml version="1.0"?>
      <d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:response><d:propstat><d:prop><c:calendar-data><![CDATA[BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:caldav-test-1
DTSTART:20260822T090000
DTEND:20260822T100000
SUMMARY:CalDAV Testtermin
END:VEVENT
END:VCALENDAR]]></c:calendar-data></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>
      </d:multistatus>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const events = await fetchCalDavEvents({
      url: `http://127.0.0.1:${port}/caldav/calendar/`,
      username: 'alex',
      password: 'app-secret'
    }, {
      rangeStart: 0,
      rangeEnd: 2_000_000_000_000,
      targetTimeZone: 'Europe/Berlin'
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].title, 'CalDAV Testtermin');
    assert.equal(events[0].uid, 'caldav-test-1');
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('CalDAV rejects URLs that contain credentials', () => {
  assert.throws(
    () => normalizeCalDavUrl('https://user:secret@example.test/calendar'),
    /darf keine Zugangsdaten/
  );
});

test('CalDAV requires HTTPS outside the test environment', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPrivateHosts = process.env.CALENDAR_ALLOW_PRIVATE_HOSTS;
  const previousInsecureHttp = process.env.CALENDAR_ALLOW_INSECURE_HTTP;
  process.env.NODE_ENV = 'production';
  delete process.env.CALENDAR_ALLOW_PRIVATE_HOSTS;
  delete process.env.CALENDAR_ALLOW_INSECURE_HTTP;
  try {
    assert.throws(
      () => normalizeCalDavUrl('http://calendar.example.test/calendar'),
      /HTTPS-Adresse/
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousPrivateHosts === undefined) delete process.env.CALENDAR_ALLOW_PRIVATE_HOSTS;
    else process.env.CALENDAR_ALLOW_PRIVATE_HOSTS = previousPrivateHosts;
    if (previousInsecureHttp === undefined) delete process.env.CALENDAR_ALLOW_INSECURE_HTTP;
    else process.env.CALENDAR_ALLOW_INSECURE_HTTP = previousInsecureHttp;
  }
});

test('CalDAV only allows insecure HTTP after an explicit local test opt-in', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPrivateHosts = process.env.CALENDAR_ALLOW_PRIVATE_HOSTS;
  const previousInsecureHttp = process.env.CALENDAR_ALLOW_INSECURE_HTTP;
  process.env.NODE_ENV = 'production';
  process.env.CALENDAR_ALLOW_PRIVATE_HOSTS = 'true';
  process.env.CALENDAR_ALLOW_INSECURE_HTTP = 'true';
  try {
    assert.doesNotThrow(() => normalizeCalDavUrl('http://calendar.lan/caldav/calendar/'));
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousPrivateHosts === undefined) delete process.env.CALENDAR_ALLOW_PRIVATE_HOSTS;
    else process.env.CALENDAR_ALLOW_PRIVATE_HOSTS = previousPrivateHosts;
    if (previousInsecureHttp === undefined) delete process.env.CALENDAR_ALLOW_INSECURE_HTTP;
    else process.env.CALENDAR_ALLOW_INSECURE_HTTP = previousInsecureHttp;
  }
});

test('Synology invalid XML replies use the narrow curl compatibility fallback', () => {
  assert.equal(
    shouldUseSynologyCurlFallback(
      new URL('http://nas.local/caldav.php/patzi/calendar/'),
      400,
      '<error xmlns="DAV:"><invalid-xml/></error>'
    ),
    true
  );
  assert.equal(
    shouldUseSynologyCurlFallback(
      new URL('https://calendar.example.test/caldav/calendar/'),
      400,
      '<error xmlns="DAV:"><invalid-xml/></error>'
    ),
    false
  );
});

test('Synology base URLs are recognized without matching normal collections', () => {
  assert.equal(isSynologyCalDavBaseUrl(new URL('https://nas.example/caldav/')), true);
  assert.equal(isSynologyCalDavBaseUrl(new URL('https://nas.example/caldav')), true);
  assert.equal(isSynologyCalDavBaseUrl(new URL('https://nas.example/caldav.php/alex/family/')), false);
});

test('Synology calendar discovery keeps calendar collections on the same server', () => {
  const baseUrl = new URL('https://nas.example/caldav.php/alex/');
  const urls = synologyCalendarUrlsFromMultistatus(`<?xml version="1.0"?>
    <d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
      <d:response>
        <d:href>/caldav.php/alex/</d:href>
        <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
      </d:response>
      <d:response>
        <d:href>/caldav.php/alex/family/</d:href>
        <d:propstat><d:prop><d:resourcetype><d:collection/><c:calendar/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
      </d:response>
      <d:response>
        <d:href>https://other.example/calendar/</d:href>
        <d:propstat><d:prop><d:resourcetype><c:calendar/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>
      </d:response>
    </d:multistatus>`, baseUrl);
  assert.deepEqual(urls.map(url => url.toString()), [
    'https://nas.example/caldav.php/alex/family/'
  ]);
});

test('CalDAV explains certificate failures without suggesting insecure HTTP', () => {
  assert.match(
    calDavFetchErrorMessage({
      cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }
    }),
    /Zertifikat.*nicht vertraut/
  );
  assert.match(
    calDavFetchErrorMessage({
      cause: { code: 'ERR_TLS_CERT_ALTNAME_INVALID' }
    }),
    /passt nicht zur CalDAV-Adresse/
  );
});
