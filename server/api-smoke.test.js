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

const [
  { createApp },
  { database },
  { normalizeBringCatalog },
  { getInstructionDurationMinutes, parseInstructionSteps }
] = await Promise.all([
  import('./app.js'),
  import('./database.js'),
  import('./bringCatalog.js'),
  import('../shared/recipeInstructions.js')
]);

const server = createApp().listen(0, '127.0.0.1');
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
  await Promise.all([
    new Promise(resolve => server.close(resolve)),
    new Promise(resolve => gotifyServer.close(resolve))
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

test('family flow stays isolated, authorized and internally consistent', async () => {
  const health = await request('/api/health');
  assert.equal(health.body.database, 'sqlite');

  const password = 'qa-family-4711';
  const registration = await request(
    '/api/public/register',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        familyName: 'QA Testfamilie',
        badge: 'Automatischer Test',
        password,
        members: [
          { name: 'Testname', position: 'mama', role: 'adult' },
          { name: 'Kind Eins', position: 'kind', role: 'child' },
          { name: 'Kind Zwei', position: 'kind', role: 'child' },
          { name: 'Zweiter Elternteil', position: 'papa', role: 'adult' }
        ]
      })
    },
    201
  );
  const cookie = registration.response.headers
    .get('set-cookie')
    .split(';')[0];
  const authenticatedHeaders = {
    cookie,
    'content-type': 'application/json'
  };
  const [adult, childOne, childTwo, secondAdult] = registration.body.members;

  const bootstrap = await request('/api/bootstrap', {
    headers: authenticatedHeaders
  });
  assert.equal(bootstrap.body.family.id, registration.body.family.id);
  assert.equal(bootstrap.body.members.length, 4);
  assert.equal(
    bootstrap.body.family.grandparentsHouseholdEnabled,
    true
  );

  const updatedFamilySettings = await request('/api/family', {
    method: 'PATCH',
    headers: authenticatedHeaders,
    body: JSON.stringify({ grandparentsHouseholdEnabled: false })
  });
  assert.equal(
    updatedFamilySettings.body.family.grandparentsHouseholdEnabled,
    false
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

  const task = await request(
    '/api/resources/tasks',
    {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        title: 'Testmission',
        memberId: childOne.id,
        stars: 15,
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
    childOneBootstrap.body.resources.chatMessages.some(
      message => message.id === directMessage.body.record.id
    ),
    true
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

  const pushStatus = await request('/api/push/status', {
    headers: authenticatedHeaders
  });
  assert.equal(pushStatus.body.devices.length, 0);
  assert.ok(pushStatus.body.publicKey.length > 60);
  assert.equal(pushStatus.body.defaults.directMessages, true);
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

  const clearedTasks = await request('/api/admin/tasks', {
    method: 'DELETE',
    headers: authenticatedHeaders,
    body: JSON.stringify({ memberId: childOne.id, completedOnly: true })
  });
  assert.equal(clearedTasks.body.deleted, 1);
  assert.equal(clearedTasks.body.records.length, 0);

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

  const incomingRelationships = await request('/api/family/relationships', {
    headers: secondHeaders
  });
  assert.equal(incomingRelationships.body.relationships[0].direction, 'incoming');

  await request(
    `/api/family/relationships/${relationshipRequest.body.relationship.id}`,
    {
      method: 'PATCH',
      headers: secondHeaders,
      body: JSON.stringify({ status: 'accepted' })
    }
  );
  const acceptedRelationships = await request('/api/family/relationships', {
    headers: authenticatedHeaders
  });
  assert.equal(acceptedRelationships.body.relationships[0].status, 'accepted');

  const deletion = await request('/api/family', {
    method: 'DELETE',
    headers: authenticatedHeaders,
    body: JSON.stringify({ password })
  });
  assert.equal(deletion.body.success, true);
});
