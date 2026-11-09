import { apiRequest } from './client';

/** Creates an order. Prices and stock are always resolved server-side. */
export async function createOrder(payload, { token } = {}) {
  const data = await apiRequest('/orders', { method: 'POST', body: payload, token });
  return data.order;
}

/**
 * Fetches an order by id or order number. The backend only returns the order
 * to an administrator or to the owner presenting the matching phone number.
 */
export async function getOrder(id, { phone } = {}) {
  const data = await apiRequest(`/orders/${encodeURIComponent(id)}`, {
    headers: phone ? { 'X-Order-Phone': phone } : undefined,
  });
  return data.order;
}
