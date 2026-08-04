export const GITHUB_REPOSITORY_URL =
  'https://github.com/laxxx-lab/lx-family-planner';

export const GITHUB_SPONSORS_URL =
  'https://github.com/sponsors/laxxx-lab';

// Erst nach der Freigabe des GitHub-Sponsors-Profils aktivieren. Bis dahin
// bleibt die fertige Oberfläche in Produktion unsichtbar. Lokal lässt sie sich
// mit ?support-preview=1 prüfen.
export const GITHUB_SPONSORS_ENABLED = false;

export function isGitHubSponsorsVisible({
  development = Boolean(import.meta.env?.DEV),
  search = typeof window !== 'undefined' ? window.location.search : '',
  hostname = typeof window !== 'undefined' ? window.location.hostname : ''
} = {}) {
  if (GITHUB_SPONSORS_ENABLED) return true;
  if (new URLSearchParams(search).get('support-preview') !== '1') return false;
  return development || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
}
