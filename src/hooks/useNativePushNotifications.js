import { PushNotifications } from '@capacitor/push-notifications';
import { isCapacitorNative } from '../utils/apiConfig.js';

const INSTALLATION_ID_KEY = 'lx_native_push_installation_id';
const REGISTRATION_TIMEOUT_MS = 20_000;
const NATIVE_STEP_TIMEOUT_MS = 10_000;
const PERMISSION_REQUEST_TIMEOUT_MS = 30_000;

let listenersPromise;
let pendingRegistration = null;

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
        if (pendingRegistration) {
          pendingRegistration.resolve(token.value);
          pendingRegistration = null;
        }
        dispatchNativePushEvent('lx-native-push-token', {
          token: token.value
        });
      }),
      plugin.addListener('registrationError', error => {
        const message =
          error?.error ||
          'Die Android-App konnte sich nicht für Push anmelden.';
        if (pendingRegistration) {
          pendingRegistration.reject(new Error(message));
          pendingRegistration = null;
        }
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

export function launchNativePushRegistration(plugin, onError) {
  try {
    Promise.resolve(plugin.register()).catch(onError);
  } catch (error) {
    onError(error);
  }
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
  if (pendingRegistration) {
    return pendingRegistration.promise;
  }
  let resolveRegistration;
  let rejectRegistration;
  const promise = new Promise((resolve, reject) => {
    resolveRegistration = resolve;
    rejectRegistration = reject;
  });
  const timeout = window.setTimeout(() => {
    if (!pendingRegistration) return;
    pendingRegistration = null;
    rejectRegistration(
      new Error(
        'Firebase hat keinen Geräteschlüssel geliefert. Prüfe die App-Konfiguration.'
      )
    );
  }, REGISTRATION_TIMEOUT_MS);
  pendingRegistration = {
    promise,
    resolve(value) {
      window.clearTimeout(timeout);
      resolveRegistration(value);
    },
    reject(error) {
      window.clearTimeout(timeout);
      rejectRegistration(error);
    }
  };
  launchNativePushRegistration(plugin, error => {
    const pending = pendingRegistration;
    pendingRegistration = null;
    pending?.reject(error);
  });
  return promise;
}

export async function unregisterNativePush() {
  const plugin = await ensureNativePushListeners();
  if (plugin) await plugin.unregister();
}

export function friendlyNativeDeviceName() {
  return 'LX Android-App';
}
