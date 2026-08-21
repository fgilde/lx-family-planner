import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { fetchCalDavEvents, normalizeCalDavUrl } from './caldav.js';

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
