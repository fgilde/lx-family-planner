export function webPushCapability() {
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: 'secure-context',
      message: 'Benachrichtigungen brauchen eine sichere HTTPS-Adresse.'
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
      message:
        'Auf iPhone und iPad zuerst „Zum Home-Bildschirm“ wählen und die Familien-App von dort öffnen.'
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
      message: 'Dieser Browser unterstützt keine Web-Benachrichtigungen.'
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
        ? 'Benachrichtigungen wurden im Browser abgelehnt.'
        : 'Benachrichtigungen wurden noch nicht erlaubt.'
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
  if (/iphone|ipad|ipod/.test(agent)) return 'Apple-Mobilgerät';
  if (agent.includes('android')) return 'Android-Gerät';
  if (agent.includes('windows')) return 'Windows-PC';
  if (agent.includes('macintosh')) return 'Mac';
  if (agent.includes('cros')) return 'Chromebook';
  return 'Familiengerät';
}
