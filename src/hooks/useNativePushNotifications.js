import { registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { isCapacitorNative } from '../utils/apiConfig.js';
import i18n from '../i18n/index.js';

const INSTALLATION_ID_KEY = 'lx_native_push_installation_id';
const REGISTRATION_TIMEOUT_MS = 20_000;
const NATIVE_STEP_TIMEOUT_MS = 10_000;
const PERMISSION_REQUEST_TIMEOUT_MS = 30_000;

let listenersPromise;
const LXNativePush = registerPlugin('LXNativePush');

export function withNativePushTimeout(
  operation,
  timeoutMs,
  message = i18n.t('notifications:nativePush.timeoutDefault')
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

export function nativePluginContainer(plugin) {
  // Capacitor issue #8472: plugin proxies expose a callable `.then` and must
  // never cross a Promise/async boundary without a plain-object container.
  return { plugin };
}

async function ensureNativePushListeners() {
  const plugin = nativePushPlugin();
  if (!plugin) return nativePluginContainer(null);
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
          i18n.t('notifications:nativePush.registrationFailed');
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
    i18n.t('notifications:nativePush.serviceStartFailed')
  );
  return nativePluginContainer(plugin);
}

async function ensureNotificationChannels(plugin) {
  await withNativePushTimeout(
    Promise.all([
      plugin.createChannel({
        id: 'lx_family_updates',
        name: i18n.t('notifications:nativePush.channels.updatesName'),
        description: i18n.t(
          'notifications:nativePush.channels.updatesDescription'
        ),
        importance: 4,
        visibility: 0,
        vibration: true,
        sound: 'default'
      }),
      plugin.createChannel({
        id: 'lx_family_urgent',
        name: i18n.t('notifications:nativePush.channels.urgentName'),
        description: i18n.t(
          'notifications:nativePush.channels.urgentDescription'
        ),
        importance: 5,
        visibility: 0,
        vibration: true,
        sound: 'default'
      })
    ]),
    NATIVE_STEP_TIMEOUT_MS,
    i18n.t('notifications:nativePush.channels.createFailed')
  );
}

export function nativePushCapability() {
  return {
    supported: isCapacitorNative(),
    reason: isCapacitorNative() ? '' : 'not-native',
    message: isCapacitorNative()
      ? ''
      : i18n.t('notifications:nativePush.onlyInApp')
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
  const { plugin } = await ensureNativePushListeners();
  if (!plugin) return 'unsupported';
  const status = await withNativePushTimeout(
    plugin.checkPermissions(),
    NATIVE_STEP_TIMEOUT_MS,
    i18n.t('notifications:nativePush.permissionCheckTimeout')
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
    i18n.t('notifications:nativePush.diagnoseTimeout')
  );
  if (!diagnostics?.firebaseConfigured) {
    throw new Error(
      diagnostics?.firebaseError
        ? i18n.t('notifications:nativePush.firebaseNotReady', {
            error: diagnostics.firebaseError
          })
        : i18n.t('notifications:nativePush.firebaseNotConfigured')
    );
  }
  if (!diagnostics?.playServicesAvailable) {
    throw new Error(
      i18n.t('notifications:nativePush.playServicesUnavailable', {
        status:
          diagnostics?.playServicesMessage ||
          i18n.t('notifications:nativePush.playServicesUnknownStatus')
      })
    );
  }
  const tokenResult = await withNativePushTimeout(
    LXNativePush.getToken(),
    REGISTRATION_TIMEOUT_MS,
    i18n.t('notifications:nativePush.tokenTimeout')
  );
  const token = String(tokenResult?.value || '').trim();
  if (!token) {
    throw new Error(i18n.t('notifications:nativePush.tokenEmpty'));
  }
  dispatchNativePushEvent('lx-native-push-token', { token });
  return token;
}

export async function registerNativePush({
  requestPermission = false,
  onStage
} = {}) {
  onStage?.('android');
  const { plugin } = await ensureNativePushListeners();
  if (!plugin) {
    throw new Error(
      i18n.t('notifications:nativePush.onlyInAppRegister')
    );
  }
  onStage?.('channels');
  await ensureNotificationChannels(plugin);
  onStage?.('permission');
  let permission = await withNativePushTimeout(
    plugin.checkPermissions(),
    NATIVE_STEP_TIMEOUT_MS,
    i18n.t('notifications:nativePush.permissionCheckTimeout')
  );
  if (
    nativePushPermissionNeedsPrompt(permission.receive) &&
    requestPermission
  ) {
    onStage?.('permission-request');
    permission = await withNativePushTimeout(
      plugin.requestPermissions(),
      PERMISSION_REQUEST_TIMEOUT_MS,
      i18n.t('notifications:nativePush.permissionRequestTimeout')
    );
  }
  if (permission.receive !== 'granted') {
    const error = new Error(
      permission.receive === 'denied'
        ? i18n.t('notifications:nativePush.permissionDenied')
        : i18n.t('notifications:nativePush.permissionNotGranted')
    );
    error.permission = permission.receive;
    throw error;
  }

  onStage?.('firebase');
  return directNativePushToken();
}

export async function unregisterNativePush() {
  const { plugin } = await ensureNativePushListeners();
  if (plugin) await plugin.unregister();
}

export function friendlyNativeDeviceName() {
  return i18n.t('notifications:nativePush.deviceName');
}
