import { promises as dns } from 'dns';
import { isIP } from 'net';
import { spawn } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { parseICalendar } from '../shared/icsCalendar.js';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const SYNLOGY_CURL_MARKER = '__LX_CALDAV_STATUS__';
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

function insecureLocalHttpAllowed() {
  return process.env.CALENDAR_ALLOW_INSECURE_HTTP === 'true'
    && process.env.CALENDAR_ALLOW_PRIVATE_HOSTS === 'true';
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
  if (url.protocol !== 'https:' && process.env.NODE_ENV !== 'test' && !insecureLocalHttpAllowed()) {
    throw failure(
      'CalDAV-Zugangsdaten werden nur über eine HTTPS-Adresse übertragen. '
      + 'Für einen isolierten LAN-Test müssen CALENDAR_ALLOW_PRIVATE_HOSTS=true und CALENDAR_ALLOW_INSECURE_HTTP=true bewusst gesetzt werden.',
      400
    );
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

function privateLanAddress(address) {
  const normalized = String(address || '').toLowerCase().replace(/^::ffff:/, '');
  if (isIP(normalized) === 4) {
    const [first, second] = normalized.split('.').map(Number);
    return first === 10
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  }
  return isIP(normalized) === 6 && (normalized.startsWith('fc') || normalized.startsWith('fd'));
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
  if (url.protocol === 'http:' && process.env.NODE_ENV !== 'test'
    && (!insecureLocalHttpAllowed() || !addresses.every(entry => privateLanAddress(entry.address)))) {
    throw failure('Unverschlüsseltes CalDAV ist nur für eine bewusst freigegebene private LAN-Adresse erlaubt.', 400);
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

function calendarQueryBody() {
  return `<?xml version="1.0" encoding="utf-8"?>
    <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
      <d:prop><d:getetag/><c:calendar-data/></d:prop>
      <c:filter><c:comp-filter name="VCALENDAR"/></c:filter>
    </c:calendar-query>`;
}

export function shouldUseSynologyCurlFallback(url, status, body) {
  return url.pathname.startsWith('/caldav.php/')
    && status === 400
    && /<\s*invalid-xml\b/i.test(String(body || ''));
}

function curlConfigValue(value) {
  return String(value).replace(/([\\"])/g, '\\$1');
}

async function synologyCurlCalendarQuery(url, username, password, body) {
  const bodyFile = join(tmpdir(), `lx-caldav-${randomUUID()}.xml`);
  await writeFile(bodyFile, body, { encoding: 'utf8', mode: 0o600 });
  try {
    const output = await new Promise((resolve, reject) => {
      const child = spawn('curl', [
        '--silent',
        '--show-error',
        '--request', 'REPORT',
        '--max-time', String(Math.ceil(REQUEST_TIMEOUT_MS / 1000)),
        '--max-redirs', '0',
        '--proto', '=http,https',
        '--header', 'Depth: 1',
        '--header', 'Accept: application/xml, text/xml;q=0.9',
        '--header', 'Content-Type: application/xml; charset=utf-8',
        '--data-binary', `@${bodyFile}`,
        '--output', '-',
        '--write-out', `\n${SYNLOGY_CURL_MARKER}%{http_code}`,
        '--config', '-',
        url.toString()
      ], { stdio: ['pipe', 'pipe', 'pipe'] });
      const chunks = [];
      let size = 0;
      let stderr = '';
      child.stdout.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES + 100) {
          child.kill();
          reject(failure('Die Antwort des CalDAV-Servers ist zu groß.', 413));
          return;
        }
        chunks.push(chunk);
      });
      child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
      child.once('error', error => reject(error));
      child.once('close', code => {
        if (code !== 0) {
          reject(new Error(stderr.trim() || 'Der Synology-CalDAV-Abruf ist fehlgeschlagen.'));
          return;
        }
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
      child.stdin.end(`user = "${curlConfigValue(username)}:${curlConfigValue(password)}"\n`);
    });
    const marker = output.lastIndexOf(SYNLOGY_CURL_MARKER);
    if (marker < 0) throw new Error('Der Synology-CalDAV-Abruf lieferte keinen Status.');
    return {
      status: Number(output.slice(marker + SYNLOGY_CURL_MARKER.length).trim()),
      body: output.slice(0, marker).replace(/\n$/, '')
    };
  } finally {
    await unlink(bodyFile).catch(() => {});
  }
}

function authorization(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

export function calDavFetchErrorMessage(error) {
  const codes = [error?.code, error?.cause?.code]
    .filter(Boolean)
    .map(code => String(code).toUpperCase());
  if (codes.some(code => code.includes('ALTNAME') || code.includes('HOSTNAME'))) {
    return 'Das HTTPS-Zertifikat passt nicht zur CalDAV-Adresse. Bitte einen Servernamen verwenden, der im Zertifikat enthalten ist.';
  }
  if (codes.some(code => code.includes('CERT') || code.includes('TLS') || code.includes('UNABLE_TO_VERIFY'))) {
    return 'Das HTTPS-Zertifikat des CalDAV-Servers wird nicht vertraut. Bitte ein gültiges Zertifikat oder eine im System vertrauenswürdige eigene Zertifizierungsstelle verwenden.';
  }
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return 'Der CalDAV-Server hat nicht rechtzeitig geantwortet.';
  }
  return 'Der CalDAV-Server ist unter dieser Adresse gerade nicht erreichbar.';
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
  const body = calendarQueryBody();
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
      body
    });
  } catch (error) {
    throw failure(calDavFetchErrorMessage(error));
  }
  if (![200, 207].includes(response.status)) {
    const responseBody = await readText(response);
    if (shouldUseSynologyCurlFallback(url, response.status, responseBody)) {
      let fallback;
      try {
        fallback = await synologyCurlCalendarQuery(url, user, secret, body);
      } catch (error) {
        throw failure(calDavFetchErrorMessage(error));
      }
      if (![200, 207].includes(fallback.status)) {
        const message = fallback.status === 401 || fallback.status === 403
          ? 'CalDAV hat Benutzername oder Passwort abgelehnt.'
          : `Der CalDAV-Server antwortet mit HTTP ${fallback.status}.`;
        throw failure(message);
      }
      const documents = calendarDataFromMultistatus(fallback.body);
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
    const message = response.status === 401 || response.status === 403
      ? 'CalDAV hat Benutzername oder Passwort abgelehnt.'
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
