import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { GoogleAuth } from 'google-auth-library';

process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: 'service_account',
  project_id: 'lx-family-test',
  client_email: 'push-test@lx-family-test.iam.gserviceaccount.com',
  private_key: 'test-only-private-key'
});

const originalFetch = global.fetch;
const originalGetAccessToken = GoogleAuth.prototype.getAccessToken;
GoogleAuth.prototype.getAccessToken = async () => 'test-oauth-token';

const {
  firebasePushConfig,
  isExpiredFirebaseTarget,
  sendFirebaseNotification
} = await import('./firebasePush.js');

after(() => {
  global.fetch = originalFetch;
  GoogleAuth.prototype.getAccessToken = originalGetAccessToken;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
});

test('FCM HTTP v1 messages use native Android channels and private data', async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return new Response(
      JSON.stringify({
        name: 'projects/lx-family-test/messages/test-message'
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }
    );
  };
  assert.equal(firebasePushConfig({ refresh: true }).configured, true);

  const result = await sendFirebaseNotification({
    token: 'fcm-device-token-1234567890',
    title: 'Neue Aufgabe',
    body: 'Zimmer aufräumen',
    data: {
      url: '/?view=tasks',
      memberId: 'member-child'
    },
    tag: 'task-123',
    priority: 'high',
    ttl: 600
  });

  assert.match(result.messageId, /test-message$/);
  assert.equal(requests.length, 1);
  assert.match(
    requests[0].url,
    /projects\/lx-family-test\/messages:send$/
  );
  assert.equal(
    requests[0].options.headers.Authorization,
    'Bearer test-oauth-token'
  );
  const body = JSON.parse(requests[0].options.body);
  assert.equal(body.message.android.priority, 'HIGH');
  assert.equal(
    body.message.android.notification.channel_id,
    'lx_family_urgent'
  );
  assert.equal(body.message.android.notification.visibility, 'PRIVATE');
  assert.equal(body.message.data.url, '/?view=tasks');
  assert.equal(body.message.data.memberId, 'member-child');
});

test('expired Firebase device targets are recognizable for cleanup', async () => {
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          status: 'NOT_FOUND',
          message: 'Requested entity was not found.',
          details: [
            {
              '@type':
                'type.googleapis.com/google.firebase.fcm.v1.FcmError',
              errorCode: 'UNREGISTERED'
            }
          ]
        }
      }),
      {
        status: 404,
        headers: { 'content-type': 'application/json' }
      }
    );

  await assert.rejects(
    sendFirebaseNotification({
      token: 'expired-fcm-device-token-1234567890',
      title: 'Test',
      body: 'Test'
    }),
    error => isExpiredFirebaseTarget(error)
  );
});
