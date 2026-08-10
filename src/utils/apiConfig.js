import { registerPlugin } from '@capacitor/core';

const SERVER_URL_KEY = 'lx_family_server_url';
const SESSION_TOKEN_KEY = 'lx_family_session_token';
const LXServerPreferences = registerPlugin('LXServerPreferences');

// A distributable APK must never silently connect to the developer's server.
// Each native installation chooses and stores its own family server address.
export const DEFAULT_SERVER_URL = '';

export function normalizeServerUrl(
  value,
  invalidMessage = 'Only HTTP and HTTPS addresses are allowed.'
) {
  let clean = String(value || '').trim().replace(/\/+$/, '');
  if (!clean) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(clean) && !/^https?:\/\//i.test(clean)) {
    throw new Error(invalidMessage);
  }
  if (!/^https?:\/\//i.test(clean)) {
    const isLocalAddress =
      /^(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?(?:\/|$)/i
        .test(clean);
    clean = `${isLocalAddress ? 'http' : 'https'}://${clean}`;
  }
  const parsed = new URL(clean);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(invalidMessage);
  }
  return parsed.toString().replace(/\/+$/, '');
}

export function getStoredServerUrl() {
  try {
    return localStorage.getItem(SERVER_URL_KEY) || '';
  } catch {
    return '';
  }
}

async function persistServerUrlForNativeApp(url) {
  if (!isCapacitorNative()) return;
  try {
    await LXServerPreferences.setServerUrl({ url });
  } catch {
    // Older APKs do not know the plugin yet. The web storage copy still works.
  }
}

function writeServerUrlToWebStorage(clean, previous = getStoredServerUrl()) {
  if (clean) {
    localStorage.setItem(SERVER_URL_KEY, clean);
  } else {
    localStorage.setItem(SERVER_URL_KEY, '');
  }
  if (previous !== clean) {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
  return clean;
}

export async function setStoredServerUrl(
  url,
  invalidMessage = 'The server address is not valid.'
) {
  try {
    const clean = normalizeServerUrl(url, invalidMessage);
    const previous = getStoredServerUrl();
    writeServerUrlToWebStorage(clean, previous);
    await persistServerUrlForNativeApp(clean);
    return clean;
  } catch (error) {
    throw new Error(
      error?.message || invalidMessage
    );
  }
}

/**
 * Restores an Android server choice before the FamilyProvider starts its API
 * requests. This also migrates existing installations from WebView storage to
 * durable native storage during their first update after this change.
 */
export async function hydrateStoredServerUrl(
  invalidMessage = 'The server address is not valid.'
) {
  const webUrl = getStoredServerUrl();
  if (!isCapacitorNative()) return webUrl;
  try {
    const result = await LXServerPreferences.getServerUrl();
    const nativeUrl = normalizeServerUrl(result?.url || '', invalidMessage);
    if (nativeUrl) {
      writeServerUrlToWebStorage(nativeUrl, webUrl);
      return nativeUrl;
    }
    if (webUrl) await persistServerUrlForNativeApp(webUrl);
  } catch {
    // The first run on an older APK falls back to the already stored web value.
  }
  return webUrl;
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
  return Boolean(
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()
  );
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

export async function plannerApiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (isCapacitorNative() && !headers.has('X-LX-Client')) {
    headers.set('X-LX-Client', 'native');
  }
  if (!headers.has('X-LX-Language')) {
    try {
      const language =
        localStorage.getItem('lx_family_language') ||
        document.documentElement.lang;
      if (language) headers.set('X-LX-Language', String(language).slice(0, 2));
    } catch {
      // A request still works when storage or document access is unavailable.
    }
  }
  const token = getStoredSessionToken();
  if (token && !headers.has('X-Session-Token')) {
    headers.set('X-Session-Token', token);
  }
  const requestOptions = {
    credentials: getStoredServerUrl() ? 'include' : 'same-origin',
    ...options,
    headers
  };
  if (
    requestOptions.cache === undefined &&
    String(path || '').startsWith('/api/')
  ) {
    requestOptions.cache = 'no-store';
  }
  return fetch(buildApiUrl(path), requestOptions);
}

export async function plannerApiRequest(path, options = {}) {
  const response = await plannerApiFetch(path, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (data?.sessionToken) setStoredSessionToken(data.sessionToken);
  if (!response.ok) {
    const error = new Error(
      data?.error || 'The request could not be processed.'
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export function describeApiError(error) {
  const message = error?.message || 'The request could not be processed.';
  const status = Number(error?.status || 0);
  return status >= 400 && status <= 599
    ? `${message} (HTTP ${status})`
    : message;
}
