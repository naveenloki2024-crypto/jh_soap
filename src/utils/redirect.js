// Same-origin redirect helpers. Only in-app paths are ever honoured so an
// attacker cannot bounce a customer to an external site (open redirect), and
// customers can never be sent toward the admin API.

const DEFAULT_TARGET = '/account';

function isSafeTarget(path) {
  if (!path || typeof path !== 'string') return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.startsWith('/api')) return false;
  if (path.startsWith('/admin')) return false;
  return true;
}

/** Reads ?redirect= from a location search string, falling back safely. */
export function getRedirectTarget(search, fallback = DEFAULT_TARGET) {
  try {
    const raw = new URLSearchParams(search || '').get('redirect') || '';
    return isSafeTarget(raw) && raw !== '/login' && raw !== '/register' ? raw : fallback;
  } catch {
    return fallback;
  }
}

/** Builds a login URL that returns the user to `redirect` after signing in. */
export function loginPath(redirect) {
  return isSafeTarget(redirect) && redirect !== '/login'
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : '/login';
}
