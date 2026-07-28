import { isCapacitorNative } from '../utils/apiConfig';

const INSTALLATION_ID_KEY = 'lx_native_push_installation_id';
const REGISTRATION_TIMEOUT_MS = 20_000;

let pluginPromise;
let listenersPromise;
let pendingRegistration = null;

function dispatchNativePushEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

async function nativePushPlugin() {
  if (!isCapacitorNative()) return null;
  pluginPromise ||= import('@capacitor/push-notifications').then(
    module => module.PushNotifications
  );
  return pluginPromise;
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
  await listenersPromise;
  return plugin;
}

async function ensureNotificationChannels(plugin) {
  await Promise.all([
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
  ]);
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
    installationId = `lx-android-${crypto.randomUUID()}`;
    localStorage.setItem(INSTALLATION_ID_KEY, installationId);
  }
  return installationId;
}

export async function nativePushPermission() {
  const plugin = await ensureNativePushListeners();
  if (!plugin) return 'unsupported';
  const status = await plugin.checkPermissions();
  return status.receive;
}

export async function registerNativePush({
  requestPermission = false
} = {}) {
  const plugin = await ensureNativePushListeners();
  if (!plugin) {
    throw new Error(
      'Echte Android-Benachrichtigungen sind nur in der App verfügbar.'
    );
  }
  await ensureNotificationChannels(plugin);
  let permission = await plugin.checkPermissions();
  if (permission.receive === 'prompt' && requestPermission) {
    permission = await plugin.requestPermissions();
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
  try {
    await plugin.register();
  } catch (error) {
    const pending = pendingRegistration;
    pendingRegistration = null;
    pending?.reject(error);
    throw error;
  }
  return promise;
}

export async function unregisterNativePush() {
  const plugin = await ensureNativePushListeners();
  if (plugin) await plugin.unregister();
}

export function friendlyNativeDeviceName() {
  return 'LX Android-App';
}
