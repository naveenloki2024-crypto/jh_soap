import Stripe from 'stripe';
import env from '../config/env.js';
import { ApiError, badRequest, serviceUnavailable } from '../lib/http.js';

const ALLOWED_METHODS = new Set(['card', 'upi']);

let client = null;

export function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function isStripeWebhookConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

export function getStripe() {
  if (!isStripeConfigured()) {
    throw serviceUnavailable('Online payments are not configured on this server.');
  }
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return client;
}

/**
 * Payment methods advertised to the frontend. Stripe Dashboard settings control
 * which methods are actually shown in hosted Checkout.
 */
export function getStripePaymentMethodTypes() {
  const explicit = String(env.STRIPE_PAYMENT_METHODS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => ALLOWED_METHODS.has(value));

  const methods = explicit.length
    ? [...new Set(explicit)]
    : env.STRIPE_ENABLE_UPI
      ? ['card', 'upi']
      : ['card'];

  return methods.length ? methods : ['card'];
}

const PUBLIC_CONFIG_TTL_MS = 5 * 60 * 1000;
let publicConfigCache = null;
let publicConfigCachedAt = 0;

function methodsFromConfiguration(configuration) {
  if (!configuration) return [];
  return Object.keys(configuration).filter((key) => {
    if (!ALLOWED_METHODS.has(key)) return false;
    const method = configuration[key];
    return (
      method &&
      typeof method === 'object' &&
      method.available === true &&
      method.display_preference?.value === 'on'
    );
  });
}

/** Safe configuration for the frontend (never includes secret keys). */
export async function getPublicStripeConfig() {
  if (!isStripeConfigured()) {
    return { enabled: false, paymentMethods: [], upiEnabled: false, currency: env.STRIPE_CURRENCY };
  }

  if (publicConfigCache && Date.now() - publicConfigCachedAt < PUBLIC_CONFIG_TTL_MS) {
    return publicConfigCache;
  }

  let methods = [];
  try {
    const configurations = await getStripe().paymentMethodConfigurations.list({ limit: 10 });
    const active =
      configurations.data.find((configuration) => configuration.is_default && configuration.active) ||
      configurations.data.find((configuration) => configuration.active);
    methods = methodsFromConfiguration(active);
  } catch {
    console.warn('[stripe] could not read the payment method configuration; using env hints.');
  }

  if (methods.length === 0) methods = getStripePaymentMethodTypes();

  const config = {
    enabled: true,
    paymentMethods: methods,
    upiEnabled: methods.includes('upi'),
    currency: env.STRIPE_CURRENCY,
  };
  publicConfigCache = config;
  publicConfigCachedAt = Date.now();
  return config;
}

const toPaise = (value) => Math.max(0, Math.round((Number(value) || 0) * 100));

const toPlain = (value) =>
  value && typeof value.toObject === 'function' ? value.toObject() : value;

/**
 * Builds Stripe line items from the trusted order snapshot, proportionally
 * distributing the server-calculated offer/coupon discount so the Stripe total
 * always equals the MongoDB order total.
 */
export function buildStripeLineItems(order) {
  const row = toPlain(order) || {};
  const items = Array.isArray(row.items) ? row.items : [];
  if (!items.length) throw badRequest('An order needs at least one item.');

  const lines = items.map((item) => ({
    item,
    amount: toPaise(item.lineTotal),
  }));
  const subtotalPaise = lines.reduce((sum, line) => sum + line.amount, 0);
  const totalPaise = toPaise(row.totalAmount);

  if (totalPaise < 100) {
    throw new ApiError(400, 'This order total is too low for online payment.', {
      code: 'ORDER_TOTAL_TOO_LOW',
    });
  }

  const discountPaise = Math.max(0, subtotalPaise - totalPaise);
  const discounts = lines.map(() => 0);

  if (discountPaise > 0 && subtotalPaise > 0) {
    const raw = lines.map((line) => (line.amount * discountPaise) / subtotalPaise);
    let assigned = 0;
    for (let index = 0; index < raw.length; index += 1) {
      discounts[index] = Math.floor(raw[index]);
      assigned += discounts[index];
    }
    let remainder = discountPaise - assigned;
    const order = raw
      .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
      .sort((left, right) => right.fraction - left.fraction);
    for (let index = 0; index < order.length; index += 1) {
      if (remainder <= 0) break;
      discounts[order[index].index] += 1;
      remainder -= 1;
    }
  }

  return lines
    .map((line, index) => {
      const amount = Math.max(0, line.amount - discounts[index]);
      if (amount <= 0) return null;
      const quantity = Math.max(1, Number(line.item.quantity) || 1);
      return {
        quantity: 1,
        price_data: {
          currency: env.STRIPE_CURRENCY,
          unit_amount: amount,
          product_data: {
            name: String(line.item.name || 'JH Soap item').slice(0, 120),
            description: `${quantity} × ${env.STRIPE_CURRENCY.toUpperCase()} ${Number(
              line.item.unitPrice,
            ).toFixed(2)} each`,
          },
        },
      };
    })
    .filter(Boolean);
}

const sessionPaymentIntentId = (session) => {
  const value = session?.payment_intent;
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
};

const sessionMethodType = (session) => {
  if (session?.payment_method_types?.length === 1) return session.payment_method_types[0];
  if (session?.payment_method_configuration_details?.type) {
    return session.payment_method_configuration_details.type;
  }
  return null;
};

export async function createStripeCheckoutSession(
  order,
  { retry = false, attempt = Number(order.stripeCheckoutAttempt) || 1 } = {},
) {
  if (!isStripeConfigured()) {
    throw serviceUnavailable('Online payments are not configured on this server.');
  }

  const stripe = getStripe();
  const frontendUrl = env.FRONTEND_URL;
  const ttlSeconds = env.STRIPE_SESSION_TTL_MINUTES * 60;
  const baseParams = {
    mode: 'payment',
    line_items: buildStripeLineItems(order),
    success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
    client_reference_id: String(order._id),
    customer_email: order.email || undefined,
    phone_number_collection: { enabled: true },
    billing_address_collection: 'auto',
    expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    metadata: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      attempt: String(attempt),
    },
    payment_intent_data: {
      description: `JH Soap order ${order.orderNumber}`,
      metadata: {
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        attempt: String(attempt),
      },
    },
  };

  const idempotencyKey = retry
    ? `stripe-checkout-retry-${order._id}-${attempt}-${Date.now()}`
    : `stripe-checkout-${order._id}-${attempt}`;

  return stripe.checkout.sessions.create(baseParams, { idempotencyKey });
}

export async function retrieveStripeSession(sessionId) {
  if (!isStripeConfigured()) {
    throw serviceUnavailable('Online payments are not configured on this server.');
  }
  if (!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(String(sessionId || ''))) {
    throw badRequest('Invalid Stripe checkout session id.');
  }
  return getStripe().checkout.sessions.retrieve(sessionId);
}

export async function expireStripeSession(sessionId) {
  if (!isStripeConfigured() || !sessionId) return null;
  try {
    return await getStripe().checkout.sessions.expire(sessionId);
  } catch {
    return null;
  }
}

export function constructStripeWebhookEvent(rawBody, signature) {
  if (!isStripeConfigured() || !env.STRIPE_WEBHOOK_SECRET) {
    throw serviceUnavailable('Stripe webhooks are not configured on this server.');
  }
  return getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
  );
}

export function stripeSessionInfo(session) {
  return {
    paymentIntentId: sessionPaymentIntentId(session),
    methodType: sessionMethodType(session),
    paymentStatus: session?.payment_status || null,
    status: session?.status || null,
  };
}
