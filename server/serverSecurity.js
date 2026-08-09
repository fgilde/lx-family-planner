const NATIVE_APP_ORIGINS = Object.freeze([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
]);

function normalizeCorsOrigin(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (raw === 'capacitor://localhost') return raw;

  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (parsed.pathname !== '/' || parsed.search || parsed.hash) return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

/**
 * Returns only explicit, valid browser origins. The native Capacitor origins
 * are protocol constants, never an installation-specific public domain.
 */
export function configuredCorsOrigins(value = '') {
  return new Set([
    ...NATIVE_APP_ORIGINS,
    ...String(value)
      .split(',')
      .map(normalizeCorsOrigin)
      .filter(Boolean)
  ]);
}

/**
 * A directly published Docker port must not trust forwarded client headers.
 * Deployments behind one reverse proxy can opt in with TRUST_PROXY=1.
 */
export function configuredTrustProxy(value = '') {
  const configured = String(value || '').trim().toLowerCase();
  if (!configured || configured === 'false' || configured === '0') {
    return false;
  }
  if (configured === 'true') return 1;
  if (/^[1-9]\d*$/.test(configured)) {
    return Math.min(Number(configured), 10);
  }
  return false;
}
