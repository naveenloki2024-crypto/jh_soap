import Order from '../models/Order.js';
import { ApiError, badRequest, conflict, notFound } from '../lib/http.js';
import { createOrder, reserveOrderStock, restoreOrderStock } from './order-service.js';
import {
  createStripeCheckoutSession,
  isStripeConfigured,
  retrieveStripeSession,
  stripeSessionInfo,
} from './stripe.js';

const toPlain = (value) =>
  value && typeof value.toObject === 'function' ? value.toObject() : value;

function isObjectId(value) {
  return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
}

async function findOrderForSession(session) {
  let order = await Order.findOne({ stripeCheckoutSessionId: session.id });
  if (order) return order;

  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (isObjectId(orderId)) order = await Order.findById(orderId);
  return order;
}

async function refreshOrder(orderId) {
  return Order.findById(orderId);
}

function saveSessionFields(order, session) {
  const info = stripeSessionInfo(session);
  const set = {
    paymentMethod: 'stripe',
    stripeCheckoutSessionId: session.id,
    stripeSessionUrl: session.url || order.stripeSessionUrl || null,
  };
  if (info.paymentIntentId) set.stripePaymentIntentId = info.paymentIntentId;
  if (info.methodType) set.stripePaymentMethodType = info.methodType;
  return Order.updateOne({ _id: order._id }, { $set: set });
}

function sessionAttempt(session) {
  const attempt = Number(session?.metadata?.attempt);
  return Number.isFinite(attempt) && attempt > 0 ? attempt : null;
}

/** Ignore late events for a superseded checkout attempt. */
function isStaleAttempt(order, session) {
  const attempt = sessionAttempt(session);
  return Boolean(
    attempt && order.stripeCheckoutAttempt && attempt < order.stripeCheckoutAttempt,
  );
}

async function fulfillPaidOrder(order, session) {
  if (order.paymentStatus === 'paid') {
    await saveSessionFields(order, session);
    return refreshOrder(order._id);
  }

  let stockIssue = false;
  if (order.stockRestored) {
    try {
      await reserveOrderStock(order);
    } catch {
      stockIssue = true;
    }
  }

  const current = await refreshOrder(order._id);
  if (current.paymentStatus === 'paid') {
    await saveSessionFields(current, session);
    return refreshOrder(order._id);
  }

  const info = stripeSessionInfo(session);
  const paymentIntentId = info.paymentIntentId || current.stripePaymentIntentId || null;
  const nextOrderStatus = stockIssue
    ? 'cancelled'
    : ['received', 'cancelled'].includes(current.orderStatus)
      ? 'confirmed'
      : current.orderStatus;

  const set = {
    paymentStatus: 'paid',
    paymentReference: paymentIntentId || session.id,
    paymentCompletedAt: new Date(),
    orderStatus: nextOrderStatus,
  };
  if (paymentIntentId) set.stripePaymentIntentId = paymentIntentId;
  if (info.methodType) set.stripePaymentMethodType = info.methodType;
  if (session.id) {
    set.stripeCheckoutSessionId = session.id;
    set.stripeSessionUrl = session.url || current.stripeSessionUrl || null;
  }

  const updated = await Order.findOneAndUpdate(
    { _id: current._id, paymentStatus: { $ne: 'paid' } },
    {
      $set: set,
      $push: {
        statusHistory: {
          status: nextOrderStatus,
          changedAt: new Date(),
          note: stockIssue
            ? 'Stripe payment received, but stock could not be reserved again. Refund or contact the customer.'
            : 'Payment confirmed by Stripe.',
          changedBy: 'stripe',
        },
      },
    },
    { new: true },
  );

  return updated || refreshOrder(order._id);
}

async function markSessionFailed(order, session, reason) {
  if (order.paymentStatus === 'paid') return order;

  const info = stripeSessionInfo(session);
  const set = {
    paymentStatus: 'failed',
    orderStatus: 'cancelled',
  };
  if (info.paymentIntentId) set.stripePaymentIntentId = info.paymentIntentId;
  if (info.methodType) set.stripePaymentMethodType = info.methodType;
  if (session.id) {
    set.stripeCheckoutSessionId = session.id;
    set.stripeSessionUrl = session.url || order.stripeSessionUrl || null;
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: 'paid' } },
    {
      $set: set,
      $push: {
        statusHistory: {
          status: 'cancelled',
          changedAt: new Date(),
          note: reason,
          changedBy: 'stripe',
        },
      },
    },
    { new: true },
  );

  if (updated) await restoreOrderStock(updated, reason);
  return updated || refreshOrder(order._id);
}

async function handleRefund(charge) {
  const paymentIntent =
    typeof charge?.payment_intent === 'string'
      ? charge.payment_intent
      : charge?.payment_intent?.id || null;

  let order = null;
  if (paymentIntent) {
    order = await Order.findOne({ stripePaymentIntentId: paymentIntent });
    if (!order) order = await Order.findOne({ paymentReference: paymentIntent });
  }
  const metadataOrderId = charge?.metadata?.orderId;
  if (!order && isObjectId(metadataOrderId)) order = await Order.findById(metadataOrderId);
  if (!order) return { ignored: true, reason: 'order-not-found' };

  const fullyRefunded =
    charge?.refunded === true ||
    (Number(charge?.amount_refunded) || 0) >= (Number(charge?.amount) || 0);
  if (!fullyRefunded) return { orderId: order._id, ignored: true, reason: 'partial-refund' };
  if (order.paymentStatus === 'refunded') return { orderId: order._id, ignored: true };

  const refundId = charge?.refunds?.data?.[0]?.id || null;
  const shouldCancel = !['shipped', 'delivered'].includes(order.orderStatus);
  const set = {
    paymentStatus: 'refunded',
    stripeRefundId: refundId,
  };
  if (shouldCancel) set.orderStatus = 'cancelled';

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: 'refunded' } },
    {
      $set: set,
      $push: {
        statusHistory: {
          status: shouldCancel ? 'cancelled' : order.orderStatus,
          changedAt: new Date(),
          note: `Stripe payment refunded${refundId ? ` (${refundId})` : ''}.`,
          changedBy: 'stripe',
        },
      },
    },
    { new: true },
  );

  if (shouldCancel) {
    await restoreOrderStock(updated || order, 'Payment refunded via Stripe');
  }
  return { orderId: order._id, refunded: true };
}

/** Creates the pending order (stock reserved) and its Stripe Checkout Session. */
export async function createStripeCheckout({ payload, customerId = null, idempotencyKey = '' }) {
  if (!isStripeConfigured()) {
    throw conflict('Online payments are not configured on this server.', 'PAYMENT_NOT_CONFIGURED');
  }

  const { order, duplicate } = await createOrder({
    payload,
    customerId,
    idempotencyKey,
    paymentMethod: 'stripe',
  });

  if (duplicate) return ensureExistingCheckout(order);

  try {
    const attempt = (Number(order.stripeCheckoutAttempt) || 0) + 1;
    await Order.updateOne({ _id: order._id }, { $set: { stripeCheckoutAttempt: attempt } });

    const session = await createStripeCheckoutSession(order, { attempt });
    if (!session?.url) throw new ApiError(502, 'Stripe did not return a checkout URL.');
    await saveSessionFields(order, session);

    const fresh = await refreshOrder(order._id);
    return {
      order: fresh,
      checkoutUrl: session.url,
      sessionId: session.id,
      duplicate: false,
    };
  } catch (error) {
    const failedOrder = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: 'paid' } },
      {
        $set: { paymentStatus: 'failed', orderStatus: 'cancelled' },
        $push: {
          statusHistory: {
            status: 'cancelled',
            changedAt: new Date(),
            note: 'Could not start Stripe Checkout. Stock was released.',
            changedBy: 'system',
          },
        },
      },
      { new: true },
    );
    if (failedOrder) {
      await restoreOrderStock(failedOrder, 'Stripe Checkout could not be started');
    }

    if (error instanceof ApiError) throw error;
    console.error(`[stripe] checkout session creation failed (${error?.type || error?.name || 'Error'})`);
    throw new ApiError(502, 'Could not start online payment. Please try again.', {
      code: 'STRIPE_CHECKOUT_FAILED',
    });
  }
}

async function createNewSessionForOrder(order, { retry = false } = {}) {
  let current = order;
  if (current.paymentStatus === 'paid') {
    throw conflict('This order is already paid.', 'ORDER_ALREADY_PAID');
  }

  if (current.stockRestored) {
    await reserveOrderStock(current);
    current = await refreshOrder(current._id);
  }

  try {
    const attempt = (Number(current.stripeCheckoutAttempt) || 0) + 1;
    await Order.updateOne(
      { _id: current._id },
      {
        $set: {
          stripeCheckoutAttempt: attempt,
          paymentStatus: 'pending',
          orderStatus: current.orderStatus === 'cancelled' ? 'received' : current.orderStatus,
        },
      },
    );

    const refreshed = await refreshOrder(current._id);
    const session = await createStripeCheckoutSession(refreshed, { retry, attempt });
    if (!session?.url) throw new ApiError(502, 'Stripe did not return a checkout URL.');
    await saveSessionFields(refreshed, session);

    return {
      order: await refreshOrder(current._id),
      checkoutUrl: session.url,
      sessionId: session.id,
      duplicate: true,
    };
  } catch (error) {
    const failedOrder = await Order.findOneAndUpdate(
      { _id: current._id, paymentStatus: { $ne: 'paid' } },
      {
        $set: { paymentStatus: 'failed', orderStatus: 'cancelled' },
        $push: {
          statusHistory: {
            status: 'cancelled',
            changedAt: new Date(),
            note: 'Could not start Stripe Checkout. Stock was released.',
            changedBy: 'system',
          },
        },
      },
      { new: true },
    );
    if (failedOrder) {
      await restoreOrderStock(failedOrder, 'Stripe Checkout retry could not be started');
    }

    if (error instanceof ApiError) throw error;
    console.error(`[stripe] checkout retry failed (${error?.type || error?.name || 'Error'})`);
    throw new ApiError(502, 'Could not start online payment. Please try again.', {
      code: 'STRIPE_CHECKOUT_FAILED',
    });
  }
}

async function ensureExistingCheckout(order) {
  if (order.paymentStatus === 'paid') {
    throw conflict('This order is already paid.', 'ORDER_ALREADY_PAID');
  }
  if (order.paymentMethod !== 'stripe') {
    throw conflict(
      'This checkout reference belongs to a different payment method.',
      'CHECKOUT_METHOD_CONFLICT',
    );
  }
  if (order.orderStatus === 'cancelled' && !order.stripeCheckoutSessionId) {
    return createNewSessionForOrder(order, { retry: true });
  }

  if (order.stripeCheckoutSessionId) {
    let session;
    try {
      session = await retrieveStripeSession(order.stripeCheckoutSessionId);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'Could not check the existing payment session. Please retry.', {
        code: 'STRIPE_SESSION_LOOKUP_FAILED',
      });
    }

    if (session.payment_status === 'paid') {
      await fulfillPaidOrder(order, session);
      throw conflict('This order is already paid.', 'ORDER_ALREADY_PAID');
    }
    if (session.status === 'open' && session.url) {
      return {
        order,
        checkoutUrl: session.url,
        sessionId: session.id,
        duplicate: true,
      };
    }
    if (session.status === 'complete') {
      throw conflict('This payment is already being confirmed.', 'PAYMENT_PROCESSING');
    }
    return createNewSessionForOrder(order, { retry: true });
  }

  return createNewSessionForOrder(order, { retry: false });
}

/** Server-side Stripe verification used by the success page (webhook fallback). */
export async function verifyStripeSession({ sessionId }) {
  const session = await retrieveStripeSession(sessionId);
  const order = await findOrderForSession(session);
  if (!order) throw notFound('Order not found for this payment session.');

  if (session.payment_status === 'paid') {
    const updated = await fulfillPaidOrder(order, session);
    return { order: updated, session: stripeSessionInfo(session) };
  }

  if (session.status === 'expired' && order.paymentStatus !== 'paid') {
    const updated = await markSessionFailed(
      order,
      session,
      'Stripe Checkout session expired. Stock was released.',
    );
    return { order: updated, session: stripeSessionInfo(session) };
  }

  return { order, session: stripeSessionInfo(session) };
}

/** Resumes or recreates a Checkout Session after a cancelled/expired attempt. */
export async function retryStripeCheckout({ sessionId }) {
  const session = await retrieveStripeSession(sessionId);
  const order = await findOrderForSession(session);
  if (!order) throw notFound('Order not found for this payment session.');

  if (order.paymentStatus === 'paid') {
    await fulfillPaidOrder(order, session);
    return { paid: true, order: await refreshOrder(order._id), checkoutUrl: null };
  }

  if (session.payment_status === 'paid') {
    const updated = await fulfillPaidOrder(order, session);
    return { paid: true, order: updated, checkoutUrl: null };
  }

  if (session.status === 'open' && session.url) {
    return { paid: false, order, checkoutUrl: session.url, resumed: true };
  }

  if (session.status === 'complete') {
    throw conflict(
      'This payment is already being confirmed. Please check your order status shortly.',
      'PAYMENT_PROCESSING',
    );
  }

  if (isStaleAttempt(order, session)) {
    throw conflict('A newer payment attempt already exists for this order.', 'STALE_SESSION');
  }

  const result = await createNewSessionForOrder(order, { retry: true });
  return {
    paid: false,
    order: result.order,
    checkoutUrl: result.checkoutUrl,
    resumed: false,
  };
}

/** Processes a verified Stripe event. Order/stock updates are idempotent. */
export async function handleStripeEvent(event) {
  const type = event?.type || '';
  const object = event?.data?.object;

  if (type === 'charge.refunded') {
    return handleRefund(object);
  }

  if (!type.startsWith('checkout.session.')) {
    return { ignored: true, reason: 'unhandled-event' };
  }

  const session = object;
  const order = await findOrderForSession(session);
  if (!order) return { ignored: true, reason: 'order-not-found' };
  if (order.paymentMethod !== 'stripe') {
    return { orderId: order._id, ignored: true, reason: 'not-stripe-order' };
  }

  if (type === 'checkout.session.completed') {
    if (session.payment_status === 'paid') {
      const updated = await fulfillPaidOrder(order, session);
      return { orderId: order._id, paymentStatus: updated?.paymentStatus };
    }
    // Async methods complete the session before the money settles.
    await saveSessionFields(order, session);
    return { orderId: order._id, paymentStatus: order.paymentStatus, pendingAsync: true };
  }

  if (type === 'checkout.session.async_payment_succeeded') {
    const updated = await fulfillPaidOrder(order, session);
    return { orderId: order._id, paymentStatus: updated?.paymentStatus };
  }

  if (type === 'checkout.session.async_payment_failed') {
    if (isStaleAttempt(order, session)) {
      return { orderId: order._id, ignored: true, reason: 'stale-session' };
    }
    const updated = await markSessionFailed(
      order,
      session,
      'Stripe payment failed. Stock was released.',
    );
    return { orderId: order._id, paymentStatus: updated?.paymentStatus };
  }

  if (type === 'checkout.session.expired') {
    if (isStaleAttempt(order, session)) {
      return { orderId: order._id, ignored: true, reason: 'stale-session' };
    }
    const updated = await markSessionFailed(
      order,
      session,
      'Stripe Checkout session expired. Stock was released.',
    );
    return { orderId: order._id, paymentStatus: updated?.paymentStatus };
  }

  return { orderId: order._id, ignored: true, reason: 'unhandled-session-event' };
}

export function parseStripeWebhookEvent(rawBody, signature, constructEvent) {
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    throw badRequest('Invalid Stripe webhook payload.');
  }
  const event = constructEvent(rawBody, signature);
  const plain = toPlain(event);
  if (!plain?.id || !plain?.type) throw badRequest('Invalid Stripe webhook event.');
  return plain;
}
