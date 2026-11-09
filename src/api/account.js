import { apiRequest } from './client';

/**
 * Customer account endpoints. The backend derives the customer id from the
 * HTTP-only session cookie, so no user id is ever sent from the browser.
 */

export async function fetchMyProfile() {
  const data = await apiRequest('/me');
  return data.profile;
}

export async function updateMyProfile(values) {
  const data = await apiRequest('/me', { method: 'PATCH', body: values });
  return data.profile;
}

export async function fetchMyOrders() {
  const data = await apiRequest('/me/orders');
  return Array.isArray(data.orders) ? data.orders : [];
}

export async function fetchMyOrder(id) {
  const data = await apiRequest(`/me/orders/${encodeURIComponent(id)}`);
  return data.order;
}
