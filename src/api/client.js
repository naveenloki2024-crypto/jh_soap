// Shared API base. In dev, Vite proxies /api to the Express server (see vite.config.js).
// In production set VITE_API_URL to the deployed backend, e.g. https://api.jhsoaps.com/api
export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

function apiTarget() {
  if (/^https?:\/\//i.test(API_BASE)) return API_BASE;
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${API_BASE}`;
  }
  return API_BASE;
}

/**
 * Small fetch wrapper: JSON in/out, consistent error shape. Authentication uses
 * an HTTP-only session cookie, so every request opts into credentials.
 */
export async function apiRequest(
  path,
  { method = 'GET', body, headers, signal, cache = 'no-store' } = {},
) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      cache,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    const error = new Error(
      `Cannot reach the JH Soaps API at ${apiTarget()}. Make sure the backend server is running on port 4000, then try again.`,
    );
    error.status = 0;
    error.code = 'NETWORK_ERROR';
    error.cause = cause;
    throw error;
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const fallback =
      response.status === 502 || response.status === 503 || response.status === 504
        ? 'The API server is unavailable. Please try again in a moment.'
        : `Request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`;
    const error = new Error(data.error || fallback);
    error.status = response.status;
    error.code = data.code || null;
    error.fieldErrors = data.errors || null;
    throw error;
  }

  return data;
}
