import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { createServer } from 'node:http';

const testDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'lx-family-api-')
);
process.env.DATABASE_FILE = path.join(testDirectory, 'test.sqlite');
process.env.DISABLE_LEGACY_IMPORT = 'true';
process.env.APP_SECRET = 'test-secret-only-for-automated-api-checks';
process.env.NODE_ENV = 'test';
process.env.CALENDAR_ALLOW_LOOPBACK_FOR_TESTS = 'true';
process.env.PUBLIC_APP_URL = 'https://familie.example.test/vorschau';

const [
  { createApp },
  { database },
  { normalizeBringCatalog },
  { getInstructionDurationMinutes, parseInstructionSteps },
  { parseICalendar },
  { nextTaskDueDate },
  { moveDashboardWidget, normalizeDashboardLayout }
] = await Promise.all([
  import('./app.js'),
  import('./database.js'),
  import('./bringCatalog.js'),
  import('../shared/recipeInstructions.js'),
  import('../shared/icsCalendar.js'),
  import('../shared/taskRecurrence.js'),
  import('../src/utils/dashboardLayout.js')
]);

const app = createApp();
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const gotifyMessages = [];
const gotifyServer = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8');
  res.setHeader('content-type', 'application/json');

  if (req.method === 'GET' && req.url === '/version') {
    res.end(JSON.stringify({ version: '3.0.0' }));
    return;
  }
  if (req.method === 'POST' && req.url === '/application') {
    if (
      req.headers.authorization !==
      `Basic ${Buffer.from('admin:admin').toString('base64')}`
    ) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    res.statusCode = 201;
    res.end(JSON.stringify({
      id: 7,
      name: 'LX Family Planner',
      token: 'A.fake-gotify-token'
    }));
    return;
  }
  if (req.method === 'POST' && req.url === '/message') {
    if (req.headers['x-gotify-key'] !== 'A.fake-gotify-token') {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    const message = JSON.parse(rawBody || '{}');
    gotifyMessages.push(message);
    res.end(JSON.stringify({ id: gotifyMessages.length, ...message }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not found' }));
});
gotifyServer.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  gotifyServer.once('listening', resolve);
  gotifyServer.once('error', reject);
});
const gotifyAddress = gotifyServer.address();
const gotifyBaseUrl = `http://127.0.0.1:${gotifyAddress.port}`;
const homeAssistantActions = [];
const homeAssistantStates = [
  {
    entity_id: 'light.kitchen',
    state: 'off',
    attributes: {
      friendly_name: 'Küchenlicht',
      icon: 'mdi:lightbulb'
    },
    last_changed: '2026-07-28T08:00:00Z',
    last_updated: '2026-07-28T08:00:00Z'
  },
  {
    entity_id: 'sensor.living_temperature',
    state: '21.4',
    attributes: {
      friendly_name: 'Wohnzimmer',
      unit_of_measurement: '°C',
      device_class: 'temperature'
    },
    last_changed: '2026-07-28T08:00:00Z',
    last_updated: '2026-07-28T08:00:00Z'
  }
];
const homeAssistantServer = createServer(async (req, res) => {
  if (req.headers.authorization !== 'Bearer ha-test-token') {
    res.statusCode = 401;
    res.end(JSON.stringify({ message: 'unauthorized' }));
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  res.setHeader('content-type', 'application/json');
  if (req.method === 'GET' && req.url === '/api/') {
    res.end(JSON.stringify({ message: 'API running.' }));
    return;
  }
  if (req.method === 'GET' && req.url === '/api/states') {
    res.end(JSON.stringify(homeAssistantStates));
    return;
  }
  if (req.method === 'GET' && req.url === '/api/states/light.kitchen') {
    res.end(JSON.stringify(homeAssistantStates[0]));
    return;
  }
  if (
    req.method === 'POST' &&
    req.url === '/api/services/light/turn_on'
  ) {
    homeAssistantActions.push(body);
    homeAssistantStates[0] = {
      ...homeAssistantStates[0],
      state: 'on'
    };
    res.end(JSON.stringify([homeAssistantStates[0]]));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ message: 'not found' }));
});
homeAssistantServer.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  homeAssistantServer.once('listening', resolve);
  homeAssistantServer.once('error', reject);
});
const homeAssistantAddress = homeAssistantServer.address();
const homeAssistantBaseUrl =
  `http://127.0.0.1:${homeAssistantAddress.port}`;
const calendarFeed = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//LX Test Calendar//DE',
  'BEGIN:VEVENT',
  'UID:school-weekly@example.test',
  'DTSTART;TZID=Europe/Berlin:20260728T081500',
  'RRULE:FREQ=WEEKLY;COUNT=3;BYDAY=TU',
  'EXDATE;TZID=Europe/Berlin:20260804T081500',
  'SUMMARY:Schulweg gemeinsam',
  'LOCATION:Grundschule',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:holiday@example.test',
  'DTSTART;VALUE=DATE:20260810',
  'SUMMARY:Ferienstart',
  'DESCRIPTION:Heute beginnt die schulfreie ',
  ' Zeit.',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');
const calendarServer = createServer((req, res) => {
  if (req.url !== '/family.ics') {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  res.setHeader('content-type', 'text/calendar; charset=utf-8');
  res.end(calendarFeed);
});
calendarServer.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  calendarServer.once('listening', resolve);
  calendarServer.once('error', reject);
});
const calendarAddress = calendarServer.address();
const calendarFeedUrl =
  `http://127.0.0.1:${calendarAddress.port}/family.ics`;

async function request(pathname, options = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json();
  assert.equal(
    response.status,
    expectedStatus,
    body.error || `${pathname} returned ${response.status}`
  );
  return { body, response };
}

after(async () => {
  app.locals.stopHomeAssistantSockets?.();
  await Promise.all([
    new Promise(resolve => server.close(resolve)),
    new Promise(resolve => gotifyServer.close(resolve)),
    new Promise(resolve => calendarServer.close(resolve)),
    new Promise(resolve => homeAssistantServer.close(resolve))
  ]);
  database.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('Bring catalog is normalized, grouped and deduplicated', () => {
  const catalog = normalizeBringCatalog({
    language: 'de-DE',
    catalog: {
      sections: [
        {
          sectionId: 'Milch & Käse',
          name: 'Milch & Käse',
          items: [
            { itemId: 'Eier', name: 'Eier' },
            { itemId: 'Eier-2', name: 'Eier' }
          ]
        },
        {
          sectionId: 'Brot & Gebäck',
          name: 'Brot & Gebäck',
          items: [{ itemId: 'Brötchen', name: 'Brötchen' }]
        }
      ]
    }
  });

  assert.equal(catalog.source, 'bring');
  assert.equal(catalog.total, 2);
  assert.equal(catalog.sections[0].icon, '🥛');
  assert.deepEqual(
    catalog.sections.flatMap(section => section.items.map(item => item.name)),
    ['Eier', 'Brötchen']
  );
});

test('recipe instructions are cleaned and scheduled in a useful order', () => {
  const steps = parseInstructionSteps([
    '1, Zubereitung',
    'Die Zucchini halbieren und aushöhlen.',
    'Das Hackfleisch anbraten und die Zucchini füllen.',
    'Im Ofen bei 180 Grad ca.',
    '25 Minuten backen.',
    'In der Zwischenzeit die Tomatensauce zubereiten.',
    'Dazu passt Reis.'
  ]);

  assert.equal(steps.includes('Zubereitung'), false);
  assert.equal(
    steps.some(step =>
      step.includes('180 Grad ca. 25 Minuten backen')
    ),
    true
  );
  const riceIndex = steps.findIndex(step => step.includes('Reis'));
  const ovenIndex = steps.findIndex(step => step.includes('180 Grad'));
  assert.equal(riceIndex >= 0 && riceIndex < ovenIndex, true);
  assert.equal(
    getInstructionDurationMinutes(steps[ovenIndex]),
    25
  );
});

test('ICS calendars keep recurring, excluded and folded events useful', () => {
  const events = parseICalendar(calendarFeed, {
    targetTimeZone: 'Europe/Berlin',
    rangeStart: new Date('2026-07-01T00:00:00Z').getTime(),
    rangeEnd: new Date('2026-09-01T00:00:00Z').getTime()
  });
  assert.equal(events.length, 3);
  assert.deepEqual(
    events.map(event => event.date),
    ['2026-07-28', '2026-08-10', '2026-08-11']
  );
  assert.equal(events[0].time, '08:15');
  assert.equal(events[1].allDay, true);
  assert.equal(events[1].notes, 'Heute beginnt die schulfreie Zeit.');
  const longRunning = parseICalendar(
    [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:old-daily',
      'DTSTART;VALUE=DATE:20200101',
      'RRULE:FREQ=DAILY',
      'SUMMARY:Langlaufende Serie',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n'),
    {
      rangeStart: new Date('2026-07-27T00:00:00Z').getTime(),
      rangeEnd: new Date('2026-07-29T23:59:59Z').getTime()
    }
  );
  assert.deepEqual(
    longRunning.map(event => event.date),
    ['2026-07-27', '2026-07-28', '2026-07-29']
  );
});

test('recurring task dates stay predictable across weekends and months', () => {
  assert.equal(nextTaskDueDate('2026-07-31', 'daily'), '2026-08-01');
  assert.equal(nextTaskDueDate('2026-07-31', 'weekdays'), '2026-08-03');
  assert.equal(nextTaskDueDate('2026-07-27', 'weekly'), '2026-08-03');
  assert.equal(nextTaskDueDate('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(nextTaskDueDate('2026-02-28', 'monthly', 31), '2026-03-31');
});

test('dashboard layouts remain complete, ordered and never fully hidden', () => {
  const normalized = normalizeDashboardLayout(
    {
      order: ['tasks', 'unknown', 'tasks', 'calendar'],
      hidden: ['tasks', 'calendar', 'shopping'],
      density: 'compact'
    },
    ['calendar', 'tasks', 'shopping']
  );
  assert.deepEqual(normalized.order, ['tasks', 'calendar', 'shopping']);
  assert.equal(normalized.hidden.length, 2);
  assert.equal(normalized.hidden.includes('tasks'), false);
  assert.equal(normalized.density, 'compact');
  assert.deepEqual(
    moveDashboardWidget(normalized, 'shopping', 'up').order,
    ['tasks', 'shopping', 'calendar']
  );
});

test('native API access only accepts trusted app origins', async () => {
  const allowed = await fetch(`${baseUrl}/api/health`, {
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'x-lx-client'
    }
  });
  assert.equal(allowed.status, 204);
  assert.equal(
    allowed.headers.get('access-control-allow-origin'),
    'http://localhost'
  );
  assert.match(
    allowed.headers.get('access-control-allow-headers'),
    /X-LX-Client/
  );

  const rejected = await fetch(`${baseUrl}/api/health`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://not-the-family-app.example',
      'access-control-request-method': 'GET'
    }
  });
  assert.equal(rejected.status, 403);
  assert.equal(
    rejected.headers.get('access-control-allow-origin'),
    null
  );
});

test('family flow stays isolated, authorized and internally consistent', async () => {
  const health = await request('/api/health');
  assert.equal(health.body.database, 'sqlite');
  assert.equal(health.body.version, '1.5.0');
  const appRelease = await request('/api/app/version');
  assert.equal(appRelease.body.versionName, '1.5.0');
  assert.equal(appRelease.body.versionCode, 7);
  assert.equal(appRelease.body.apkUrl, '/apk/latest.apk');
  assert.equal(
    appRelease.body.publicApkUrl,
    'https://familie.example.test/apk/latest.apk'
  );
  assert.equal(appRelease.body.fileSizeBytes > 1_000_000, true);
  assert.equal(appRelease.body.buildKind, 'release');

  const password = 'qa-family-4711';
  const registration = await request(
    '/api/public/register',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lx-client': 'native'
      },
      body: JSON.stringify({
        familyName: 'QA Testfamilie',
        badge: 'Automatischer Test',
        password,
        members: [
          { name: 'Testname', position: 'mama', role: 'adult' },
          { name: 'Kind Eins', position: 'kind', role: 'child' },
          { name: 'Kind Zwei', position: 'kind', role: 'child' },
          { name: 'Zweiter Elternteil', position: 'papa', role: 'adult' },
          { name: 'Luna', position: 'haustier', role: 'pet' }
        ]
      })
    },
    201
  );
  assert.match(registration.body.sessionToken, /^[a-z0-9_-]{32,}$/i);
  const cookie = registration.response.headers
    .get('set-cookie')
    .split(';')[0];
  const authenticatedHeaders = {
    cookie,
    'content-type': 'application/json'
  };
  const [adult, childOne, childTwo, secondAdult, pet] =
    registration.body.members;

  const bootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(bootstrap.body.family.id, registration.body.family.id);
  assert.equal(bootstrap.body.appVersion, '1.5.0');
  assert.equal(bootstrap.body.releaseNotes.version, '1.5.0');
  assert.ok(bootstrap.body.releaseNotes.highlights.length >= 4);
  assert.equal(bootstrap.body.members.length, 5);
  assert.equal(
    bootstrap.body.family.grandparentsHouseholdEnabled,
    true
  );

  const acknowledgedReleaseNotes = await request(
    '/api/release-notes/acknowledge',
    {
      method: 'POST',
      headers: authenticatedHeaders
    }
  );
  assert.equal(acknowledgedReleaseNotes.body.version, '1.5.0');
  assert.equal(
    acknowledgedReleaseNotes.body.member.lastSeenReleaseVersion,
    '1.5.0'
  );
  const bootstrapAfterReleaseNotes = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(bootstrapAfterReleaseNotes.body.releaseNotes, null);
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: secondAdult.id })
  });
  const secondAdultBootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(secondAdultBootstrap.body.releaseNotes.version, '1.5.0');
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: adult.id })
  });

  const updatedFamilySettings = await request('/api/family', {
    method: 'PATCH',
    headers: authenticatedHeaders,
    body: JSON.stringify({ grandparentsHouseholdEnabled: false })
  });
  assert.equal(
    updatedFamilySettings.body.family.grandparentsHouseholdEnabled,
    false
  );

  const managedProfileResponse = await request(
    '/api/members',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        name: 'Oma ohne Zugang',
        position: 'oma',
        role: 'senior',
        isManaged: true,
        pin: '1234'
      })
    },
    201
  );
  const managedProfile = managedProfileResponse.body.member;
  assert.equal(managedProfile.isManaged, true);
  assert.equal(managedProfile.hasPin, false);

  await request(
    '/api/auth/member',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ memberId: managedProfile.id })
    },
    403
  );
  await request(
    `/api/members/${adult.id}`,
    {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({ isManaged: true })
    },
    409
  );

  const managedEvent = await request(
    '/api/resources/events',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        title: 'Termin für Oma',
        date: '2026-08-03',
        time: '10:30',
        memberId: managedProfile.id
      })
    },
    201
  );
  assert.equal(managedEvent.body.record.memberId, managedProfile.id);

  const reminderEvent = await request(
    '/api/resources/events',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        title: 'Zahnarzt',
        date: '2026-08-03',
        time: '14:00',
        location: 'Praxis am Park',
        memberId: adult.id,
        reminders: [10, 60, 1440, 60, -5]
      })
    },
    201
  );
  assert.deepEqual(
    reminderEvent.body.record.reminders,
    [1440, 60, 10]
  );
  const reminderNow = new Date('2026-08-03T13:00:00').getTime();
  const firstReminderSweep =
    await app.locals.runEventReminderSweep(reminderNow);
  assert.equal(firstReminderSweep.delivered, 1);
  const repeatedReminderSweep =
    await app.locals.runEventReminderSweep(reminderNow);
  assert.equal(repeatedReminderSweep.delivered, 0);
  const reminderNotifications = await request('/api/notifications', {
    headers: authenticatedHeaders
  });
  const reminderNotification =
    reminderNotifications.body.notifications.find(
      notification =>
        notification.dedupeKey.startsWith('event-reminder-') &&
        notification.title.includes('Zahnarzt')
    );
  assert.ok(reminderNotification);
  assert.match(reminderNotification.body, /1 Stunde/);
  const updatedReminderEvent = await request(
    `/api/resources/events/${reminderEvent.body.record.id}`,
    {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({ reminders: [30, 10] })
    }
  );
  assert.deepEqual(updatedReminderEvent.body.record.reminders, [30, 10]);

  const childNotificationEvent = await request(
    '/api/resources/events',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        title: 'Kindergeburtstag',
        date: '2026-08-06',
        time: '15:00',
        memberId: childOne.id
      })
    },
    201
  );
  await request(
    `/api/resources/events/${childNotificationEvent.body.record.id}`,
    {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({ time: '16:00' })
    }
  );
  await request(
    `/api/resources/events/${childNotificationEvent.body.record.id}`,
    { method: 'DELETE', headers: authenticatedHeaders }
  );

  const managedTask = await request(
    '/api/resources/tasks',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        title: 'Unterlagen mitnehmen',
        memberId: managedProfile.id,
        stars: 50
      })
    },
    201
  );
  assert.equal(managedTask.body.record.memberId, managedProfile.id);
  assert.equal(managedTask.body.record.stars, 0);
  assert.deepEqual(managedTask.body.record.rotationMemberIds, []);

  const managedBootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(
    managedBootstrap.body.members.find(
      member => member.id === managedProfile.id
    )?.isManaged,
    true
  );

  const liveResponse = await fetch(`${baseUrl}/api/live`, {
    headers: { cookie }
  });
  assert.equal(liveResponse.status, 200);
  const liveReader = liveResponse.body.getReader();
  assert.match(
    new TextDecoder().decode((await liveReader.read()).value),
    /event: ready/
  );

  const bulk = await request('/api/resources/events/bulk', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({
      records: [
        { id: 'event-one', title: 'Termin eins' },
        { id: 'event-two', title: 'Termin zwei' }
      ]
    })
  });
  assert.equal(bulk.body.records.length, 2);
  assert.match(
    new TextDecoder().decode((await liveReader.read()).value),
    /event: family-update/
  );
  await liveReader.cancel();

  const calendarSubscription = await request(
    '/api/calendar/subscriptions',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        name: 'Schule',
        url: calendarFeedUrl,
        color: '#2563eb',
        memberId: childOne.id,
        household: 'familie'
      })
    },
    201
  );
  assert.equal(calendarSubscription.body.warning, '');
  assert.equal(calendarSubscription.body.records.length, 3);
  assert.equal(calendarSubscription.body.subscription.host, '127.0.0.1');
  assert.equal(
    Object.hasOwn(calendarSubscription.body.subscription, 'secretEncrypted'),
    false
  );
  const subscriptions = await request('/api/calendar/subscriptions', {
    headers: authenticatedHeaders
  });
  assert.equal(subscriptions.body.subscriptions.length, 1);
  const calendarBootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  const subscribedEvents = calendarBootstrap.body.resources.events.filter(
    event => event.sourceId === calendarSubscription.body.subscription.id
  );
  assert.equal(subscribedEvents.length, 3);
  assert.equal(subscribedEvents.every(event => event.readOnly), true);
  assert.equal(subscribedEvents[0].memberId, childOne.id);
  await request(
    `/api/resources/events/${subscribedEvents[0].id}`,
    {
      method: 'DELETE',
      headers: authenticatedHeaders
    },
    409
  );

  const task = await request(
    '/api/resources/tasks',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        title: 'Testmission',
        memberId: childOne.id,
        stars: 15,
        dueDate: '2026-07-27',
        repeatRule: 'weekly',
        completed: false
      })
    },
    201
  );

  const directMessage = await request(
    '/api/resources/chatMessages',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        text: 'Nur für Kind Eins',
        target: childOne.id
      })
    },
    201
  );
  assert.equal(directMessage.body.record.senderId, adult.id);

  await request(
    '/api/resources/chatMessages',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        text: 'Unpassendes Haustier-DM',
        target: pet.id
      })
    },
    403
  );
  await request(
    '/api/resources/chatMessages',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        text: 'Verwaltete Profile chatten nicht',
        target: managedProfile.id
      })
    },
    403
  );
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: pet.id })
  });
  const petBootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.deepEqual(petBootstrap.body.resources.chatMessages, []);
  await request(
    `/api/tasks/${task.body.record.id}/toggle`,
    {
      method: 'POST',
      headers: authenticatedHeaders
    },
    403
  );
  await request(
    '/api/resources/chatMessages',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        text: 'Haustiere schreiben nicht',
        target: 'group'
      })
    },
    403
  );
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: adult.id, familyPassword: password })
  });

  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: childTwo.id })
  });
  const childTwoBootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(
    childTwoBootstrap.body.resources.chatMessages.some(
      message => message.id === directMessage.body.record.id
    ),
    false
  );
  assert.equal(
    childTwoBootstrap.body.notifications.some(
      notification => notification.eventKey === 'directMessages'
    ),
    false
  );

  await request(
    '/api/auth/member',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ memberId: adult.id })
    },
    401
  );
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: adult.id, familyPassword: password })
  });
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: childOne.id })
  });

  const childOneBootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(
    childOneBootstrap.body.members.some(
      member => member.id === managedProfile.id
    ),
    false
  );
  assert.equal(
    childOneBootstrap.body.resources.events.some(
      event => event.memberId === managedProfile.id
    ),
    false
  );
  assert.equal(
    childOneBootstrap.body.resources.tasks.some(
      entry => entry.memberId === managedProfile.id
    ),
    false
  );
  assert.equal(
    childOneBootstrap.body.resources.chatMessages.some(
      message => message.id === directMessage.body.record.id
    ),
    true
  );
  assert.equal(
    childOneBootstrap.body.notifications.some(
      notification => notification.eventKey === 'taskAssigned'
    ),
    true
  );
  assert.equal(
    childOneBootstrap.body.notifications.some(
      notification => notification.eventKey === 'directMessages'
    ),
    true
  );
  for (const kind of ['created', 'updated', 'deleted']) {
    assert.equal(
      childOneBootstrap.body.notifications.some(
        notification =>
          notification.eventKey === 'events' &&
          notification.dedupeKey ===
            `event-${kind}-${childNotificationEvent.body.record.id}`
      ),
      true
    );
  }
  const moodUpdate = await request(
    '/api/resources/moodCheckins',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ mood: 'okay' })
    },
    201
  );
  const moodHelp = await request(
    '/api/resources/moodCheckins',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ mood: 'hilfe' })
    },
    201
  );
  assert.equal(moodUpdate.body.record.memberId, childOne.id);
  assert.equal(moodHelp.body.record.memberId, childOne.id);
  await request(
    '/api/calendar/subscriptions',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        name: 'Nicht erlaubt',
        url: calendarFeedUrl
      })
    },
    403
  );

  const completionRequest = await request(`/api/tasks/${task.body.record.id}/toggle`, {
    method: 'POST',
    headers: authenticatedHeaders
  });
  assert.equal(completionRequest.body.task.completed, false);
  assert.equal(
    completionRequest.body.task.completionStatus,
    'pending_approval'
  );
  assert.equal(completionRequest.body.action, 'approval_requested');
  assert.equal(completionRequest.body.member, null);

  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({
      memberId: secondAdult.id,
      familyPassword: password
    })
  });
  await request(
    `/api/tasks/${task.body.record.id}/review`,
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ approved: true })
    },
    403
  );
  await request(
    `/api/tasks/${task.body.record.id}/toggle`,
    {
      method: 'POST',
      headers: authenticatedHeaders
    },
    403
  );
  const protectedTaskPatch = await request(
    `/api/resources/tasks/${task.body.record.id}`,
    {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        completed: true,
        completionStatus: 'approved'
      })
    }
  );
  assert.equal(protectedTaskPatch.body.record.completed, false);
  assert.equal(
    protectedTaskPatch.body.record.completionStatus,
    'pending_approval'
  );

  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: adult.id })
  });
  const approval = await request(
    `/api/tasks/${task.body.record.id}/review`,
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ approved: true })
    }
  );
  assert.equal(approval.body.task.completed, true);
  assert.equal(approval.body.task.completionStatus, 'approved');
  assert.equal(approval.body.member.stars, 15);
  assert.equal(approval.body.nextTask.dueDate, '2026-08-03');
  assert.equal(approval.body.nextTask.completed, false);

  const adultNotifications = await request('/api/notifications', {
    headers: authenticatedHeaders
  });
  assert.equal(adultNotifications.body.unreadCount > 0, true);
  assert.equal(
    adultNotifications.body.notifications.some(
      notification =>
        notification.eventKey === 'moodUpdates' &&
        notification.dedupeKey === `mood-${moodUpdate.body.record.id}`
    ),
    true
  );
  assert.equal(
    adultNotifications.body.notifications.some(
      notification =>
        notification.eventKey === 'moodHelp' &&
        notification.dedupeKey === `mood-${moodHelp.body.record.id}`
    ),
    true
  );
  const unreadNotification = adultNotifications.body.notifications.find(
    notification => !notification.read
  );
  const markedNotification = await request(
    `/api/notifications/${unreadNotification.id}`,
    {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({ read: true })
    }
  );
  assert.equal(markedNotification.body.notification.read, true);
  const allRead = await request('/api/notifications/read-all', {
    method: 'POST',
    headers: authenticatedHeaders
  });
  assert.equal(allRead.body.unreadCount, 0);

  const gotifySetup = await request(
    '/api/integrations/gotify/setup',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        baseUrl: gotifyBaseUrl,
        username: 'admin',
        password: 'admin',
        plannerUrl: baseUrl
      })
    },
    201
  );
  assert.equal(gotifySetup.body.integration.connected, true);
  assert.equal(gotifySetup.body.integration.rules.directMessages, false);
  assert.equal(gotifyMessages[0].title, 'LX Family Planner ist verbunden');

  await request('/api/integrations/gotify/test', {
    method: 'POST',
    headers: authenticatedHeaders
  });
  assert.equal(gotifyMessages[1].title, 'Test vom LX Family Planner');

  await request(
    '/api/resources/chatMessages',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        text: 'Gotify Gruppenprüfung',
        target: 'group'
      })
    },
    201
  );
  for (let attempt = 0; attempt < 30 && gotifyMessages.length < 3; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(gotifyMessages[2].title, `Familienchat · ${adult.name}`);
  assert.equal(
    gotifyMessages[2].message,
    'Eine neue Nachricht ist da.'
  );

  const homeAssistantSetup = await request(
    '/api/integrations/home-assistant/setup',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        baseUrl: homeAssistantBaseUrl,
        token: 'ha-test-token'
      })
    },
    201
  );
  assert.equal(homeAssistantSetup.body.integration.connected, true);
  assert.equal(homeAssistantSetup.body.entities.length, 2);
  assert.equal(
    Object.hasOwn(homeAssistantSetup.body.integration, 'token'),
    false
  );

  const homeAssistantSelection = await request(
    '/api/integrations/home-assistant',
    {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        selectedEntities: [
          {
            entityId: 'light.kitchen',
            name: 'Küchenlicht',
            allowControl: true,
            profileIds: [childOne.id]
          },
          {
            entityId: 'sensor.living_temperature',
            name: 'Wohnzimmer',
            allowControl: false,
            profileIds: []
          }
        ]
      })
    }
  );
  assert.equal(
    homeAssistantSelection.body.integration.selectedEntities.length,
    2
  );
  const adultHomeStates = await request(
    '/api/integrations/home-assistant/states',
    { headers: authenticatedHeaders }
  );
  assert.equal(adultHomeStates.body.entities.length, 2);

  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: childOne.id })
  });
  const childHomeStates = await request(
    '/api/integrations/home-assistant/states',
    { headers: authenticatedHeaders }
  );
  assert.deepEqual(
    childHomeStates.body.entities.map(entity => entity.entityId),
    ['light.kitchen']
  );
  const controlledLight = await request(
    '/api/integrations/home-assistant/actions',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        entityId: 'light.kitchen',
        action: 'turn_on'
      })
    }
  );
  assert.equal(controlledLight.body.entities[0].state, 'on');
  assert.deepEqual(homeAssistantActions[0], {
    entity_id: 'light.kitchen'
  });

  const problemReport = await request(
    '/api/problem-reports',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        category: 'problem',
        title: 'Kalenderknopf reagiert nicht',
        description: 'Beim ersten Tippen passiert nichts.',
        page: 'calendar',
        clientInfo: 'Test Browser'
      })
    },
    201
  );
  assert.equal(problemReport.body.report.appVersion, '1.5.0');
  await request(
    '/api/problem-reports',
    { headers: authenticatedHeaders },
    403
  );
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({
      memberId: adult.id,
      familyPassword: password
    })
  });
  const adultProblemNotifications = await request(
    '/api/notifications',
    { headers: authenticatedHeaders }
  );
  assert.equal(
    adultProblemNotifications.body.notifications.some(
      notification =>
        notification.eventKey === 'problemReports' &&
        notification.dedupeKey ===
          `problem-new-${problemReport.body.report.id}`
    ),
    true
  );
  const problemReports = await request('/api/problem-reports', {
    headers: authenticatedHeaders
  });
  assert.equal(problemReports.body.reports.length, 1);
  const resolvedProblem = await request(
    `/api/problem-reports/${problemReport.body.report.id}`,
    {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({ status: 'resolved' })
    }
  );
  assert.equal(resolvedProblem.body.report.status, 'resolved');
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: childOne.id })
  });
  const reporterNotifications = await request('/api/notifications', {
    headers: authenticatedHeaders
  });
  assert.equal(
    reporterNotifications.body.notifications.some(
      notification =>
        notification.eventKey === 'problemReports' &&
        notification.dedupeKey ===
          `problem-resolved-${problemReport.body.report.id}`
    ),
    true
  );
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({
      memberId: adult.id,
      familyPassword: password
    })
  });

  const pushStatus = await request('/api/push/status', {
    headers: authenticatedHeaders
  });
  assert.equal(pushStatus.body.devices.length, 0);
  assert.ok(pushStatus.body.publicKey.length > 60);
  assert.equal(pushStatus.body.defaults.directMessages, true);
  assert.equal(pushStatus.body.defaults.moodUpdates, true);
  assert.equal(pushStatus.body.defaults.problemReports, true);
  assert.equal(pushStatus.body.defaults.familyConnections, true);
  assert.equal(pushStatus.body.defaults.pocketMoney, true);
  assert.equal(pushStatus.body.defaults.showPreviews, false);

  const pushRegistration = await request(
    '/api/push/subscriptions',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        deviceName: 'QA Browser',
        subscription: {
          endpoint: 'https://push.example.test/subscriptions/qa-browser',
          keys: {
            p256dh: 'qa-public-browser-key',
            auth: 'qa-auth-key'
          }
        },
        preferences: {
          groupChat: true,
          directMessages: false,
          showPreviews: false
        }
      })
    },
    201
  );
  assert.equal(pushRegistration.body.device.deviceName, 'QA Browser');
  assert.equal(
    pushRegistration.body.device.preferences.directMessages,
    false
  );
  const currentPushStatus = await request(
    '/api/push/status?endpoint=' +
      encodeURIComponent('https://push.example.test/subscriptions/qa-browser'),
    { headers: authenticatedHeaders }
  );
  assert.equal(
    currentPushStatus.body.currentDeviceId,
    pushRegistration.body.device.id
  );

  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: childOne.id })
  });
  const childPushRegistration = await request(
    '/api/push/subscriptions',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        deviceName: 'QA Browser',
        subscription: {
          endpoint: 'https://push.example.test/subscriptions/qa-browser',
          keys: {
            p256dh: 'qa-public-browser-key',
            auth: 'qa-auth-key'
          }
        },
        preferences: {
          groupChat: false,
          taskAssigned: true,
          taskApproval: true,
          showPreviews: false
        }
      })
    },
    201
  );
  assert.notEqual(
    childPushRegistration.body.device.id,
    pushRegistration.body.device.id
  );
  const childPushStatus = await request(
    '/api/push/status?endpoint=' +
      encodeURIComponent('https://push.example.test/subscriptions/qa-browser'),
    { headers: authenticatedHeaders }
  );
  assert.equal(
    childPushStatus.body.currentDeviceId,
    childPushRegistration.body.device.id
  );
  const childPushDelete = await request('/api/push/subscriptions', {
    method: 'DELETE',
    headers: authenticatedHeaders,
    body: JSON.stringify({
      endpoint: 'https://push.example.test/subscriptions/qa-browser'
    })
  });
  assert.equal(childPushDelete.body.unsubscribeBrowser, false);

  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({
      memberId: adult.id,
      familyPassword: password
    })
  });
  const pushDevices = await request('/api/push/devices', {
    headers: authenticatedHeaders
  });
  assert.equal(pushDevices.body.devices.length, 1);
  assert.equal(pushDevices.body.devices[0].memberName, adult.name);

  await request(
    `/api/push/devices/${pushRegistration.body.device.id}`,
    {
      method: 'DELETE',
      headers: authenticatedHeaders
    }
  );
  const pushStatusAfterDelete = await request('/api/push/status', {
    headers: authenticatedHeaders
  });
  assert.equal(pushStatusAfterDelete.body.devices.length, 0);

  const dashboardLink = await request(
    '/api/resources/dashboardLinks',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        id: 'link-kind-eins',
        memberId: childOne.id,
        title: 'Die Maus',
        url: 'https://www.youtube.com/@diemaus'
      })
    },
    201
  );
  assert.equal(dashboardLink.body.record.kind, 'youtube');

  const spotifyWidget = await request(
    '/api/resources/dashboardLinks',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        id: 'spotify-kind-eins',
        memberId: childOne.id,
        title: 'Tanzpause',
        url: 'https://open.spotify.com/playlist/37i9dQZF1DX0Yxoavh5qJV'
      })
    },
    201
  );
  assert.equal(spotifyWidget.body.record.kind, 'spotify');
  assert.equal(spotifyWidget.body.record.color, '#1db954');

  await request(
    '/api/resources/dashboardLinks',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        title: 'Unsicher',
        url: 'https://example.com/channel'
      })
    },
    400
  );

  const reset = await request(
    `/api/admin/members/${childOne.id}/reset-stars`,
    { method: 'POST', headers: authenticatedHeaders }
  );
  assert.equal(reset.body.member.stars, 0);

  const adultWithPoints = await request(`/api/members/${adult.id}`, {
    method: 'PATCH',
    headers: authenticatedHeaders,
    body: JSON.stringify({ stars: 37 })
  });
  assert.equal(adultWithPoints.body.member.stars, 37);
  const adultReset = await request(
    `/api/admin/members/${adult.id}/reset-stars`,
    { method: 'POST', headers: authenticatedHeaders }
  );
  assert.equal(adultReset.body.member.stars, 0);

  const clearedTasks = await request('/api/admin/tasks', {
    method: 'DELETE',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: childOne.id, completedOnly: true })
  });
  assert.equal(clearedTasks.body.deleted, 1);
  const remainingChildTask = clearedTasks.body.records.find(
    entry => entry.memberId === childOne.id
  );
  assert.equal(Boolean(remainingChildTask), true);
  assert.equal(remainingChildTask.dueDate, '2026-08-03');

  const meal = await request(
    '/api/resources/meals',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        id: 'meal-removable',
        day: 'Montag',
        meal: 'Mittagessen',
        recipe: 'Pfannkuchen'
      })
    },
    201
  );
  await request(`/api/resources/meals/${meal.body.record.id}`, {
    method: 'DELETE',
    headers: authenticatedHeaders
  });

  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: childOne.id })
  });
  const childDashboard = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(
    childDashboard.body.resources.dashboardLinks[0].title,
    'Die Maus'
  );
  assert.equal(
    childDashboard.body.resources.dashboardLinks.some(
      link => link.kind === 'spotify' && link.title === 'Tanzpause'
    ),
    true
  );
  await request(
    '/api/resources/dashboardLinks',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        title: 'Nicht erlaubt',
        url: 'https://www.youtube.com/@blocked'
      })
    },
    403
  );
  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: adult.id, familyPassword: password })
  });

  const routine = await request(
    '/api/resources/dailyRoutines',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        title: 'Morgenstart',
        icon: '☀️',
        timeOfDay: 'morning',
        steps: [
          { id: 'wake-up', title: 'Aufstehen', icon: '1' },
          { id: 'brush', title: 'Zähne putzen', icon: '2' }
        ]
      })
    },
    201
  );
  assert.equal(routine.body.record.steps.length, 2);

  const schoolItem = await request(
    '/api/resources/schoolItems',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        kind: 'homework',
        title: 'Lesen Seite 12',
        subject: 'Deutsch',
        date: '2026-07-27'
      })
    },
    201
  );
  const poll = await request(
    '/api/resources/familyPolls',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        question: 'Was essen wir?',
        options: [
          { id: 'pizza', label: 'Pizza', emoji: '🍕' },
          { id: 'pasta', label: 'Nudeln', emoji: '🍝' }
        ]
      })
    },
    201
  );
  const mission = await request(
    '/api/resources/familyMissions',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        title: 'Gemeinsam den Tisch decken',
        memberIds: [childOne.id, childTwo.id],
        icon: '🤝'
      })
    },
    201
  );
  await request(
    '/api/resources/encouragements',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        message: 'Du schaffst das!',
        icon: '💛'
      })
    },
    201
  );
  await request(
    '/api/resources/savingsGoals',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        title: 'Neues Fahrrad',
        targetCents: 15000,
        icon: '🚲'
      })
    },
    201
  );
  const settings = await request(
    '/api/resources/familySettings',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        id: 'family-settings',
        quietHoursEnabled: true,
        quietStart: '20:30',
        quietEnd: '07:00',
        mediaScheduleEnabled: true,
        mediaStart: '15:00',
        mediaEnd: '19:30',
        emergencyContacts: [
          {
            id: 'doctor',
            name: 'Kinderarzt',
            phone: '0123 456789',
            note: 'Impfpass mitnehmen'
          }
        ]
      })
    },
    201
  );
  assert.equal(settings.body.record.quietStart, '20:30');
  assert.equal(settings.body.record.emergencyContacts.length, 1);

  const childWithStars = await request(`/api/members/${childOne.id}`, {
    method: 'PATCH',
    headers: authenticatedHeaders,
    body: JSON.stringify({ stars: 40 })
  });
  assert.equal(childWithStars.body.member.stars, 40);
  const pocketTransaction = await request(
    '/api/pocket-money/transactions',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        amountCents: 250,
        starCost: 20,
        note: '20 Sterne umgewandelt'
      })
    },
    201
  );
  assert.equal(pocketTransaction.body.transaction.amountCents, 250);
  assert.equal(pocketTransaction.body.member.stars, 20);

  const rotatingTask = await request(
    '/api/resources/tasks',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        title: 'Spülmaschine',
        memberId: childOne.id,
        rotationMemberIds: [childOne.id, childTwo.id],
        stars: 5,
        dueDate: '2026-07-27',
        repeatRule: 'daily'
      })
    },
    201
  );

  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: childOne.id })
  });
  await request(
    '/api/resources/dailyRoutines',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        title: 'Selbst angelegt',
        steps: [{ id: 'unsafe', title: 'Nicht erlaubt' }]
      })
    },
    403
  );
  const routineStep = await request(
    `/api/routines/${routine.body.record.id}/toggle`,
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ stepId: 'wake-up' })
    }
  );
  assert.equal(
    routineStep.body.record.completions[
      new Date().toLocaleDateString('en-CA')
    ].includes('wake-up'),
    true
  );
  const checkedSchoolItem = await request(
    `/api/school/${schoolItem.body.record.id}/toggle`,
    { method: 'POST', headers: authenticatedHeaders }
  );
  assert.equal(checkedSchoolItem.body.record.completed, true);
  const voted = await request(
    `/api/polls/${poll.body.record.id}/vote`,
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ optionId: 'pizza' })
    }
  );
  assert.equal(voted.body.record.votes[childOne.id], 'pizza');
  const missionProgress = await request(
    `/api/family-missions/${mission.body.record.id}/toggle`,
    { method: 'POST', headers: authenticatedHeaders }
  );
  assert.equal(
    missionProgress.body.record.completedMemberIds.includes(childOne.id),
    true
  );
  const kidStyle = await request(
    `/api/kids/${childOne.id}/style`,
    {
      method: 'PUT',
      headers: authenticatedHeaders,
      body: JSON.stringify({ buddy: '🦊', heroTitle: 'Waldheld' })
    }
  );
  assert.equal(kidStyle.body.record.buddy, '🦊');
  await request(
    `/api/tasks/${rotatingTask.body.record.id}/toggle`,
    { method: 'POST', headers: authenticatedHeaders }
  );

  await request('/api/auth/member', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: adult.id, familyPassword: password })
  });
  const rotated = await request(
    `/api/tasks/${rotatingTask.body.record.id}/review`,
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ approved: true })
    }
  );
  assert.equal(rotated.body.nextTask.memberId, childTwo.id);
  assert.deepEqual(
    rotated.body.nextTask.rotationMemberIds,
    [childOne.id, childTwo.id]
  );

  const familyLifeBootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(familyLifeBootstrap.body.resources.dailyRoutines.length, 1);
  assert.equal(familyLifeBootstrap.body.resources.schoolItems.length, 1);
  assert.equal(
    familyLifeBootstrap.body.resources.pocketMoneyTransactions.length,
    1
  );
  assert.equal(familyLifeBootstrap.body.resources.kidProfiles.length, 1);

  const secondPassword = 'qa-family-5722';
  const secondRegistration = await request(
    '/api/public/register',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        familyName: 'QA Elternfamilie',
        password: secondPassword,
        members: [
          { name: 'Zweite Mama', position: 'mama', role: 'adult' }
        ]
      })
    },
    201
  );
  const secondCookie = secondRegistration.response.headers
    .get('set-cookie')
    .split(';')[0];
  const secondHeaders = {
    cookie: secondCookie,
    'content-type': 'application/json'
  };

  const relationshipRequest = await request(
    '/api/family/relationships',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        targetFamilyId: secondRegistration.body.family.id,
        relationType: 'parent'
      })
    },
    201
  );
  assert.equal(relationshipRequest.body.relationship.status, 'pending');

  const incomingConnectionNotifications = await request(
    '/api/notifications',
    { headers: secondHeaders }
  );
  assert.equal(
    incomingConnectionNotifications.body.notifications.some(
      notification =>
        notification.eventKey === 'familyConnections' &&
        notification.dedupeKey ===
          `family-connection-request-${relationshipRequest.body.relationship.id}`
    ),
    true
  );
  const incomingRelationships = await request('/api/family/relationships', {
    headers: secondHeaders
  });
  assert.equal(incomingRelationships.body.relationships[0].direction, 'incoming');
  assert.deepEqual(
    incomingRelationships.body.relationships[0].otherFamily.members,
    []
  );

  await request(
    `/api/family/relationships/${relationshipRequest.body.relationship.id}`,
    {
      method: 'PATCH',
      headers: secondHeaders,
      body: JSON.stringify({ status: 'accepted' })
    }
  );
  const acceptedConnectionNotifications = await request(
    '/api/notifications',
    { headers: authenticatedHeaders }
  );
  assert.equal(
    acceptedConnectionNotifications.body.notifications.some(
      notification =>
        notification.eventKey === 'familyConnections' &&
        notification.dedupeKey ===
          `family-connection-accepted-${relationshipRequest.body.relationship.id}`
    ),
    true
  );
  const acceptedRelationships = await request('/api/family/relationships', {
    headers: authenticatedHeaders
  });
  assert.equal(acceptedRelationships.body.relationships[0].status, 'accepted');
  assert.equal(
    acceptedRelationships.body.relationships[0].otherFamily.members[0].name,
    'Zweite Mama'
  );
  assert.equal(
    acceptedRelationships.body.relationships[0].otherFamily.members[0].position,
    'mama'
  );
  const acceptedFromSecondFamily = await request(
    '/api/family/relationships',
    { headers: secondHeaders }
  );
  assert.equal(
    acceptedFromSecondFamily.body.relationships[0].otherFamily.members.some(
      member => member.id === managedProfile.id
    ),
    false
  );

  const familyGrants = await request(
    `/api/family/relationships/${relationshipRequest.body.relationship.id}/grants`,
    {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        sharedCalendar: true,
        tasks: true,
        rewards: true,
        pocketMoney: true
      })
    }
  );
  assert.equal(familyGrants.body.relationship.grantsToOther.tasks, true);

  const secondFamilyCapabilities = await request(
    '/api/family/relationships',
    { headers: secondHeaders }
  );
  assert.equal(
    secondFamilyCapabilities.body.relationships[0].grantsFromOther.tasks,
    true
  );

  const sharedEvent = await request(
    '/api/family/shared-events',
    {
      method: 'POST',
      headers: secondHeaders,
      body: JSON.stringify({
        title: 'Familiengrillen',
        date: '2026-08-16',
        time: '16:00',
        reminders: [1440, 60],
        recipientFamilyIds: [registration.body.family.id]
      })
    },
    201
  );
  assert.equal(sharedEvent.body.event.readOnly, false);
  assert.deepEqual(sharedEvent.body.event.reminders, [1440, 60]);
  const sharedRecipientBootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  const receivedSharedEvent =
    sharedRecipientBootstrap.body.resources.events.find(
      event => event.sharedEventId === sharedEvent.body.event.sharedEventId
    );
  assert.equal(receivedSharedEvent.readOnly, true);
  assert.equal(
    receivedSharedEvent.sharedOwnerFamilyName,
    secondRegistration.body.family.familyName
  );

  const externalTask = await request(
    `/api/family/relationships/${relationshipRequest.body.relationship.id}/tasks`,
    {
      method: 'POST',
      headers: secondHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        title: 'Oma beim Kuchenbacken helfen',
        dueDate: '2026-08-15',
        stars: 25
      })
    },
    201
  );
  assert.equal(externalTask.body.task.stars, 25);
  assert.equal(
    externalTask.body.task.createdByFamilyName,
    secondRegistration.body.family.familyName
  );

  const externalReward = await request(
    `/api/family/relationships/${relationshipRequest.body.relationship.id}/rewards`,
    {
      method: 'POST',
      headers: secondHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        title: 'Zoobesuch mit Oma',
        costStars: 80,
        icon: 'custom',
        iconImage:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
      })
    },
    201
  );
  assert.equal(externalReward.body.reward.forMemberId, childOne.id);
  assert.equal(externalReward.body.reward.icon, 'custom');
  assert.match(externalReward.body.reward.iconImage, /^data:image\/png;base64,/);

  await request(
    `/api/family/relationships/${relationshipRequest.body.relationship.id}/rewards`,
    {
      method: 'POST',
      headers: secondHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        title: 'Unsicheres Symbol',
        costStars: 20,
        icon: 'custom',
        iconImage:
          'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj48L3N2Zz4='
      })
    },
    400
  );

  const externalPocketMoney = await request(
    `/api/family/relationships/${relationshipRequest.body.relationship.id}/pocket-money`,
    {
      method: 'POST',
      headers: secondHeaders,
      body: JSON.stringify({
        memberId: childOne.id,
        amountCents: 500,
        note: 'Feriengeld'
      })
    },
    201
  );
  assert.equal(externalPocketMoney.body.transaction.amountCents, 500);

  const networkBootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(
    networkBootstrap.body.resources.tasks.some(
      entry => entry.id === externalTask.body.task.id
    ),
    true
  );
  assert.equal(
    networkBootstrap.body.resources.rewards.some(
      entry => entry.id === externalReward.body.reward.id
    ),
    true
  );
  assert.equal(
    networkBootstrap.body.resources.pocketMoneyTransactions.some(
      entry => entry.id === externalPocketMoney.body.transaction.id
    ),
    true
  );

  await request(
    `/api/family/shared-events/${sharedEvent.body.event.sharedEventId}`,
    {
      method: 'DELETE',
      headers: secondHeaders
    }
  );
  const sharedEventRemoved = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(
    sharedEventRemoved.body.resources.events.some(
      event => event.sharedEventId === sharedEvent.body.event.sharedEventId
    ),
    false
  );

  const deletion = await request('/api/family', {
    method: 'DELETE',
    headers: authenticatedHeaders,
    body: JSON.stringify({ password })
  });
  assert.equal(deletion.body.success, true);
});
