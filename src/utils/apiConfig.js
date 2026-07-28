const SERVER_URL_KEY = 'lx_family_server_url';
const SESSION_TOKEN_KEY = 'lx_family_session_token';

export const DEFAULT_SERVER_URL = 'https://familie.laxxx-lab.de';

export function normalizeServerUrl(value) {
  let clean = String(value || '').trim().replace(/\/+$/, '');
  if (!clean) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(clean) && !/^https?:\/\//i.test(clean)) {
    throw new Error('Es sind nur HTTP- und HTTPS-Adressen erlaubt.');
  }
  if (!/^https?:\/\//i.test(clean)) {
    const isLocalAddress =
      /^(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?(?:\/|$)/i
        .test(clean);
    clean = `${isLocalAddress ? 'http' : 'https'}://${clean}`;
  }
  const parsed = new URL(clean);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Es sind nur HTTP- und HTTPS-Adressen erlaubt.');
  }
  return parsed.toString().replace(/\/+$/, '');
}

export function getStoredServerUrl() {
  try {
    const saved = localStorage.getItem(SERVER_URL_KEY);
    if (saved !== null) return saved;
    if (isCapacitorNative() || window.location.origin === 'http://localhost' || window.location.origin === 'capacitor://localhost' || window.location.protocol === 'file:') {
      return DEFAULT_SERVER_URL;
    }
    return '';
  } catch {
    return isCapacitorNative() ? DEFAULT_SERVER_URL : '';
  }
}

export function setStoredServerUrl(url) {
  try {
    const clean = normalizeServerUrl(url);
    const previous = getStoredServerUrl();
    if (clean) {
      localStorage.setItem(SERVER_URL_KEY, clean);
    } else {
      localStorage.setItem(SERVER_URL_KEY, '');
    }
    if (previous !== clean) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
    return clean;
  } catch (error) {
    throw new Error(
      error?.message || 'Die Server-Adresse ist nicht gültig.'
    );
  }
}

export function getStoredSessionToken() {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredSessionToken(token) {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore
  }
}

export function isCapacitorNative() {
  return Boolean(window.Capacitor?.isNativePlatform());
}

export function buildApiUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const baseUrl = getStoredServerUrl();
  if (!baseUrl) return path;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${baseUrl}${cleanPath}`;
}

export async function plannerApiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (isCapacitorNative() && !headers.has('X-LX-Client')) {
    headers.set('X-LX-Client', 'native');
  }
  const token = getStoredSessionToken();
  if (token && !headers.has('X-Session-Token')) {
    headers.set('X-Session-Token', token);
  }
  const response = await fetch(buildApiUrl(path), {
    credentials: getStoredServerUrl() ? 'include' : 'same-origin',
    ...options,
    headers
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (data?.sessionToken) setStoredSessionToken(data.sessionToken);
  if (!response.ok) {
    const error = new Error(
      data?.error || 'Die Anfrage konnte nicht verarbeitet werden.'
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
