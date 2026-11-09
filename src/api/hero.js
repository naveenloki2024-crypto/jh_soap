import { apiRequest } from './client';

/** Fetches the published homepage hero configuration. */
export async function fetchHero({ signal } = {}) {
  const data = await apiRequest('/hero', { signal, cache: 'no-store' });
  return data.hero ?? null;
}
