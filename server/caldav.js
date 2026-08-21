import { promises as dns } from 'dns';
import { isIP } from 'net';
import { XMLParser } from 'fast-xml-parser';
import { parseICalendar } from '../shared/icsCalendar.js';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const XML = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true
});

function failure(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeCalDavUrl(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    throw failure('Die CalDAV-Adresse ist ungültig.', 400);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw failure('Die CalDAV-Adresse muss mit http:// oder https:// beginnen.', 400);
  }
  if (url.protocol !== 'https:' && process.env.NODE_ENV !== 'test') {
    throw failure('CalDAV-Zugangsdaten werden nur über eine HTTPS-Adresse übertragen.', 400);
  }
  if (url.username || url.password || url.hash) {
    throw failure('Die CalDAV-Adresse darf keine Zugangsdaten oder Anker enthalten.', 400);
  }
  return url;
}

function privateAddress(address) {
  const normalized = String(address || '').toLowerCase().replace(/^::ffff:/, '');
  const allowed = process.env.CALENDAR_ALLOW_PRIVATE_HOSTS === 'true';
  if (isIP(normalized) === 4) {
    const [first, second] = normalized.split('.').map(Number);
    if (first === 127) {
      return process.env.NODE_ENV !== 'test' && process.env.CALENDAR_ALLOW_LOOPBACK_FOR_TESTS !== 'true';
    }
    if (first === 0 || first >= 224 || (first === 169 && second === 254)) return true;
    return !allowed && (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 100 && second >= 64 && second <= 127)
    );
  }
  if (isIP(normalized) === 6) {
    if (normalized === '::' || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff')) return true;
    if (normalized === '::1') return process.env.NODE_ENV !== 'test';
    return !allowed && (normalized.startsWith('fc') || normalized.startsWith('fd'));
  }
  return false;
}

async function validateTarget(url) {
  let addresses;
  try {
    addresses = isIP(url.hostname)
      ? [{ address: url.hostname }]
      : await dns.lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw failure('Der CalDAV-Server konnte nicht gefunden werden.', 400);
  }
  if (!addresses.length || addresses.some(entry => privateAddress(entry.address))) {
    throw failure(
      process.env.CALENDAR_ALLOW_PRIVATE_HOSTS === 'true'
        ? 'Die CalDAV-Adresse zeigt auf eine gesperrte Geräteadresse.'
        : 'Lokale CalDAV-Adressen sind aus Sicherheitsgründen gesperrt. Für einen bewusst lokal betriebenen Kalender kann CALENDAR_ALLOW_PRIVATE_HOSTS=true gesetzt werden.',
      400
    );
  }
}

async function readText(response) {
  const announced = Number(response.headers.get('content-length') || 0);
  if (announced > MAX_RESPONSE_BYTES) {
    throw failure('Die Antwort des CalDAV-Servers ist zu groß.', 413);
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw failure('Die Antwort des CalDAV-Servers ist zu groß.', 413);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function authorization(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

function calendarDataFromMultistatus(xml) {
  let parsed;
  try {
    parsed = XML.parse(xml);
  } catch {
    throw failure('Der CalDAV-Server hat keine lesbare Kalenderantwort gesendet.', 422);
  }
  const root = parsed.multistatus || parsed['d:multistatus'];
  const data = [];
  for (const response of asArray(root?.response)) {
    for (const propstat of asArray(response?.propstat)) {
      const status = String(propstat?.status || '');
      if (status && !/\s20\d\s/i.test(status)) continue;
      const content = propstat?.prop?.['calendar-data'];
      if (typeof content === 'string' && /BEGIN:VCALENDAR/i.test(content)) data.push(content);
    }
  }
  if (!data.length) {
    throw failure('Der CalDAV-Server hat keine lesbaren Termine geliefert. Bitte die URL eines einzelnen Kalenders verwenden.', 422);
  }
  return data;
}

export async function fetchCalDavEvents(
  { url: rawUrl, username, password },
  { targetTimeZone = 'Europe/Berlin', rangeStart, rangeEnd, maxEvents = 1500, appVersion = '1' } = {}
) {
  const url = normalizeCalDavUrl(rawUrl);
  const user = String(username || '').trim();
  const secret = String(password || '');
  if (!user || !secret) {
    throw failure('Für CalDAV werden Benutzername und App-Passwort benötigt.', 400);
  }
  await validateTarget(url);
  let response;
  try {
    response = await fetch(url, {
      method: 'REPORT',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: authorization(user, secret),
        Depth: '1',
        'Content-Type': 'application/xml; charset=utf-8',
        Accept: 'application/xml, text/xml;q=0.9',
        'User-Agent': `LX-Family/${appVersion} CalDAV-Sync`
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <d:prop><d:getetag/><c:calendar-data/></d:prop>
          <c:filter><c:comp-filter name="VCALENDAR"/></c:filter>
        </c:calendar-query>`
    });
  } catch {
    throw failure('Der CalDAV-Server ist unter dieser Adresse gerade nicht erreichbar.');
  }
  if (![200, 207].includes(response.status)) {
    const message = response.status === 401 || response.status === 403
      ? 'CalDAV hat Benutzername oder App-Passwort abgelehnt.'
      : `Der CalDAV-Server antwortet mit HTTP ${response.status}.`;
    throw failure(message);
  }
  const documents = calendarDataFromMultistatus(await readText(response));
  const events = [];
  for (const document of documents) {
    events.push(...parseICalendar(document, {
      targetTimeZone,
      rangeStart,
      rangeEnd,
      maxEvents: Math.max(1, maxEvents - events.length)
    }));
    if (events.length >= maxEvents) break;
  }
  return events.slice(0, maxEvents);
}
