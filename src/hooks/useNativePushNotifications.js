import { registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { isCapacitorNative } from '../utils/apiConfig.js';

const INSTALLATION_ID_KEY = 'lx_native_push_installation_id';
const REGISTRATION_TIMEOUT_MS = 20_000;
const NATIVE_STEP_TIMEOUT_MS = 10_000;
const PERMISSION_REQUEST_TIMEOUT_MS = 30_000;

let listenersPromise;
const LXNativePush = registerPlugin('LXNativePush');

export function withNativePushTimeout(
  operation,
  timeoutMs,
  message = 'Android hat nicht rechtzeitig geantwortet.'
) {
  const task =
    typeof operation === 'function'
      ? Promise.resolve().then(operation)
      : Promise.resolve(operation);
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      const error = new Error(message);
      error.code = 'native-push-timeout';
      reject(error);
    }, timeoutMs);
    task.then(
      value => {
        globalThis.clearTimeout(timeout);
        resolve(value);
      },
      error => {
        globalThis.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function dispatchNativePushEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function nativePushPlugin() {
  if (!isCapacitorNative()) return null;
  return PushNotifications;
}

async function ensureNativePushListeners() {
  const plugin = await nativePushPlugin();
  if (!plugin) return null;
  if (!listenersPromise) {
    listenersPromise = Promise.all([
      plugin.addListener('registration', token => {
        dispatchNativePushEvent('lx-native-push-token', {
          token: token.value
        });
      }),
      plugin.addListener('registrationError', error => {
        const message =
          error?.error ||
          'Die Android-App konnte sich nicht für Push anmelden.';
        dispatchNativePushEvent('lx-native-push-error', { message });
      }),
      plugin.addListener('pushNotificationReceived', notification => {
        dispatchNativePushEvent(
          'lx-native-notification-received',
          notification
        );
      }),
      plugin.addListener('pushNotificationActionPerformed', action => {
        dispatchNativePushEvent(
          'lx-native-notification-open',
          action?.notification || {}
        );
      })
    ]);
  }
  await withNativePushTimeout(
    listenersPromise,
    NATIVE_STEP_TIMEOUT_MS,
    'Android konnte den Benachrichtigungsdienst nicht starten. Beende LX vollständig und öffne die App erneut.'
  );
  return plugin;
}

async function ensureNotificationChannels(plugin) {
  await withNativePushTimeout(
    Promise.all([
      plugin.createChannel({
        id: 'lx_family_updates',
        name: 'Familienmeldungen',
        description: 'Nachrichten, Termine, Aufgaben und Familienereignisse',
        importance: 4,
        visibility: 0,
        vibration: true,
        sound: 'default'
      }),
      plugin.createChannel({
        id: 'lx_family_urgent',
        name: 'Dringende Familienmeldungen',
        description: 'Dringende Hilfe-Anfragen und zeitkritische Erinnerungen',
        importance: 5,
        visibility: 0,
        vibration: true,
        sound: 'default'
      })
    ]),
    NATIVE_STEP_TIMEOUT_MS,
    'Android konnte die Benachrichtigungskanäle nicht anlegen. Prüfe die App-Benachrichtigungen in den Android-Einstellungen.'
  );
}

export function nativePushCapability() {
  return {
    supported: isCapacitorNative(),
    reason: isCapacitorNative() ? '' : 'not-native',
    message: isCapacitorNative()
      ? ''
      : 'Echte Android-Benachrichtigungen sind in der LX Android-App verfügbar.'
  };
}

export function nativeInstallationId() {
  let installationId = localStorage.getItem(INSTALLATION_ID_KEY) || '';
  if (!installationId) {
    installationId = createNativeInstallationId();
    localStorage.setItem(INSTALLATION_ID_KEY, installationId);
  }
  return installationId;
}

export function createNativeInstallationId() {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `lx-android-${randomUuid}`;
  const fallback = [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2)
  ].join('-');
  return `lx-android-${fallback}`;
}

export async function nativePushPermission() {
  const plugin = await ensureNativePushListeners();
  if (!plugin) return 'unsupported';
  const status = await withNativePushTimeout(
    plugin.checkPermissions(),
    NATIVE_STEP_TIMEOUT_MS,
    'Android antwortet nicht auf die Berechtigungsprüfung. Beende LX vollständig und öffne die App erneut.'
  );
  return status.receive;
}

export function nativePushPermissionNeedsPrompt(permission) {
  return ['prompt', 'prompt-with-rationale'].includes(permission);
}

async function directNativePushToken() {
  const diagnostics = await withNativePushTimeout(
    LXNativePush.diagnose(),
    NATIVE_STEP_TIMEOUT_MS,
    'Android konnte den Zustand der Google Play-Dienste nicht prüfen.'
  );
  if (!diagnostics?.firebaseConfigured) {
    throw new Error(
      diagnostics?.firebaseError
        ? `Firebase ist in der Android-App nicht bereit: ${diagnostics.firebaseError}`
        : 'Firebase ist in der Android-App nicht eingerichtet.'
    );
  }
  if (!diagnostics?.playServicesAvailable) {
    throw new Error(
      `Google Play-Dienste sind auf diesem Gerät nicht bereit: ${
        diagnostics?.playServicesMessage || 'unbekannter Zustand'
      }. Aktualisiere die Google Play-Dienste und versuche es erneut.`
    );
  }
  const tokenResult = await withNativePushTimeout(
    LXNativePush.getToken(),
    REGISTRATION_TIMEOUT_MS,
    `Firebase hat keinen Geräteschlüssel geliefert. Google Play-Dienste sind verfügbar; prüfe VPN, Firewall und privates DNS auf dem Handy.`
  );
  const token = String(tokenResult?.value || '').trim();
  if (!token) {
    throw new Error('Firebase hat einen leeren Geräteschlüssel geliefert.');
  }
  dispatchNativePushEvent('lx-native-push-token', { token });
  return token;
}

export async function registerNativePush({
  requestPermission = false,
  onStage
} = {}) {
  onStage?.('android');
  const plugin = await ensureNativePushListeners();
  if (!plugin) {
    throw new Error(
      'Echte Android-Benachrichtigungen sind nur in der App verfügbar.'
    );
  }
  onStage?.('channels');
  await ensureNotificationChannels(plugin);
  onStage?.('permission');
  let permission = await withNativePushTimeout(
    plugin.checkPermissions(),
    NATIVE_STEP_TIMEOUT_MS,
    'Android antwortet nicht auf die Berechtigungsprüfung. Beende LX vollständig und öffne die App erneut.'
  );
  if (
    nativePushPermissionNeedsPrompt(permission.receive) &&
    requestPermission
  ) {
    onStage?.('permission-request');
    permission = await withNativePushTimeout(
      plugin.requestPermissions(),
      PERMISSION_REQUEST_TIMEOUT_MS,
      'Die Android-Berechtigungsabfrage wurde nicht abgeschlossen. Erlaube Benachrichtigungen in den App-Einstellungen und versuche es erneut.'
    );
  }
  if (permission.receive !== 'granted') {
    const error = new Error(
      permission.receive === 'denied'
        ? 'Benachrichtigungen sind in den Android-App-Einstellungen ausgeschaltet.'
        : 'Benachrichtigungen wurden noch nicht erlaubt.'
    );
    error.permission = permission.receive;
    throw error;
  }

  onStage?.('firebase');
  return directNativePushToken();
}

export async function unregisterNativePush() {
  const plugin = await ensureNativePushListeners();
  if (plugin) await plugin.unregister();
}

export function friendlyNativeDeviceName() {
  return 'LX Android-App';
}
