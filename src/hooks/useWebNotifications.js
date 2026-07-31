import i18n from '../i18n/index.js';

export function webPushCapability() {
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: 'secure-context',
      message: i18n.t('notifications:webPush.secureContext')
    };
  }
  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isHomeScreen =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;
  if (isAppleMobile && !isHomeScreen) {
    return {
      supported: false,
      reason: 'ios-home-screen',
      message: i18n.t('notifications:webPush.iosHomeScreen')
    };
  }
  if (
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return {
      supported: false,
      reason: 'unsupported',
      message: i18n.t('notifications:webPush.unsupported')
    };
  }
  return {
    supported: true,
    reason: '',
    message: ''
  };
}

export function notificationPermission() {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
}

export async function currentBrowserSubscription() {
  const capability = webPushCapability();
  if (!capability.supported) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeBrowser(publicKey) {
  const capability = webPushCapability();
  if (!capability.supported) {
    throw new Error(capability.message);
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? i18n.t('notifications:webPush.permissionDenied')
        : i18n.t('notifications:webPush.permissionNotGranted')
    );
  }
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  return (
    existing ||
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    })
  );
}

export function friendlyDeviceName() {
  const agent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(agent)) {
    return i18n.t('notifications:webPush.deviceNames.apple');
  }
  if (agent.includes('android')) {
    return i18n.t('notifications:webPush.deviceNames.android');
  }
  if (agent.includes('windows')) {
    return i18n.t('notifications:webPush.deviceNames.windows');
  }
  if (agent.includes('macintosh')) {
    return i18n.t('notifications:webPush.deviceNames.mac');
  }
  if (agent.includes('cros')) {
    return i18n.t('notifications:webPush.deviceNames.chromebook');
  }
  return i18n.t('notifications:webPush.deviceNames.fallback');
}
