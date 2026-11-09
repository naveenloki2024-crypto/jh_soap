import { apiRequest } from './client';

/** Secret-free Stripe availability/config for the checkout UI. */
export async function getStripeConfig() {
  return apiRequest('/payments/stripe/config');
}

/**
 * Creates the pending order and a Stripe-hosted Checkout Session.
 * Prices, stock and totals are always recalculated on the server.
 */
export async function createStripeCheckout(payload, { idempotencyKey } = {}) {
  return apiRequest('/payments/stripe/checkout', {
    method: 'POST',
    body: payload,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
}

/**
 * Server-to-Stripe verification used after the redirect. The order is only
 * marked paid if Stripe confirms the session, never because a URL says so.
 */
export async function verifyStripeSession(sessionId) {
  return apiRequest('/payments/stripe/verify', {
    method: 'POST',
    body: { sessionId },
  });
}

/** Resume an open session or start a new attempt for an expired one. */
export async function retryStripeCheckout(sessionId) {
  return apiRequest('/payments/stripe/retry', {
    method: 'POST',
    body: { sessionId },
  });
}
