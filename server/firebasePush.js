import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const DEFAULT_SERVICE_ACCOUNT_FILE = path.join(
  process.cwd(),
  'data',
  'firebase-service-account.json'
);

let cachedConfig;
let cachedAuth;

function parseServiceAccountJson(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function loadServiceAccount() {
  const inline = parseServiceAccountJson(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  );
  if (inline) {
    return {
      credentials: inline,
      source: 'environment'
    };
  }

  const configuredFile =
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    DEFAULT_SERVICE_ACCOUNT_FILE;
  const resolvedFile = path.resolve(configuredFile);
  if (!fs.existsSync(resolvedFile)) return null;

  try {
    const credentials = JSON.parse(fs.readFileSync(resolvedFile, 'utf8'));
    return {
      credentials,
      source: 'file'
    };
  } catch {
    return {
      credentials: null,
      source: 'invalid-file'
    };
  }
}

export function firebasePushConfig({ refresh = false } = {}) {
  if (cachedConfig && !refresh) return cachedConfig;

  const serviceAccount = loadServiceAccount();
  const projectId =
    String(
      process.env.FIREBASE_PROJECT_ID ||
      serviceAccount?.credentials?.project_id ||
      ''
    ).trim();
  const credentials = serviceAccount?.credentials || null;
  const configured = Boolean(
    projectId &&
    credentials?.client_email &&
    credentials?.private_key
  );

  cachedConfig = {
    configured,
    projectId,
    source: serviceAccount?.source || 'missing',
    credentials
  };
  cachedAuth = null;
  return cachedConfig;
}

export function publicFirebasePushStatus() {
  const config = firebasePushConfig();
  return {
    configured: config.configured,
    projectId: config.configured ? config.projectId : '',
    reason: config.configured
      ? ''
      : config.source === 'invalid-file'
        ? 'invalid-service-account'
        : 'missing-service-account'
  };
}

async function accessToken() {
  const config = firebasePushConfig();
  if (!config.configured) {
    const error = new Error(
      'Android-Push ist auf diesem Server noch nicht eingerichtet.'
    );
    error.code = 'FCM_NOT_CONFIGURED';
    throw error;
  }
  cachedAuth ||= new GoogleAuth({
    credentials: config.credentials,
    scopes: [FCM_SCOPE]
  });
  const token = await cachedAuth.getAccessToken();
  if (!token) {
    const error = new Error(
      'Firebase konnte keinen gültigen Zugangsschlüssel ausstellen.'
    );
    error.code = 'FCM_AUTH_FAILED';
    throw error;
  }
  return token;
}

function firebaseErrorCode(payload) {
  const details = Array.isArray(payload?.error?.details)
    ? payload.error.details
    : [];
  return (
    details.find(detail => detail?.errorCode)?.errorCode ||
    payload?.error?.status ||
    ''
  );
}

export function isExpiredFirebaseTarget(error) {
  return [
    'UNREGISTERED',
    'SENDER_ID_MISMATCH'
  ].includes(error?.firebaseCode);
}

export async function sendFirebaseNotification({
  token,
  title,
  body,
  data = {},
  tag = '',
  priority = 'normal',
  visibility = 'private',
  ttl = 900
}) {
  const config = firebasePushConfig();
  const oauthToken = await accessToken();
  const highPriority = ['high', 'urgent'].includes(
    String(priority).toLowerCase()
  );
  const stringData = Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${
      encodeURIComponent(config.projectId)
    }/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${oauthToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: String(title || 'LX Family Planner').slice(0, 100),
            body: String(body || '').slice(0, 500)
          },
          data: stringData,
          android: {
            priority: highPriority ? 'HIGH' : 'NORMAL',
            ttl: `${Math.max(60, Math.min(86_400, Number(ttl) || 900))}s`,
            notification: {
              channel_id: highPriority
                ? 'lx_family_urgent'
                : 'lx_family_updates',
              icon: 'ic_stat_lx_family',
              color: '#0F766E',
              sound: 'default',
              tag: String(tag || 'lx-family').slice(0, 100),
              visibility:
                String(visibility).toLowerCase() === 'public'
                  ? 'PUBLIC'
                  : 'PRIVATE'
            }
          }
        },
        validate_only: false
      })
    }
  );

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const error = new Error(
      payload?.error?.message ||
      `Firebase hat die Nachricht abgelehnt (${response.status}).`
    );
    error.statusCode = response.status;
    error.firebaseCode = firebaseErrorCode(payload);
    throw error;
  }
  return {
    messageId: payload?.name || ''
  };
}
