import { Router } from 'express';
import env from '../config/env.js';
import Order from '../models/Order.js';
import StripeEvent from '../models/StripeEvent.js';
import { asyncHandler, badRequest, conflict } from '../lib/http.js';
import { mapOrder } from '../lib/serialize.js';
import { clean, normalizePhone } from '../lib/validation.js';
import { optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { findAccessibleOrder } from '../services/order-service.js';
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../services/razorpay.js';
import {
  constructStripeWebhookEvent,
  getPublicStripeConfig,
} from '../services/stripe.js';
import {
  createStripeCheckout,
  handleStripeEvent,
  retryStripeCheckout,
  verifyStripeSession,
} from '../services/stripe-checkout.js';

const router = Router();

const checkoutLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  keyPrefix: 'stripe-checkout',
});

const verifyLimiter = rateLimit({
  windowMs: 60_000,
  max: 90,
  keyPrefix: 'stripe-verify',
});


function accessFor(req, orderId) {
  const admin = Boolean(req.auth && ['admin', 'super_admin'].includes(req.auth.role));
  return findAccessibleOrder(orderId, {
    admin,
    userId: admin ? null : req.auth?.userId ?? null,
    phone: normalizePhone(req.body?.phone ?? req.get('x-order-phone')),
  });
}

// POST /api/payments/razorpay/order — create a Razorpay order for a pending order.
router.post(
  '/razorpay/order',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!isRazorpayConfigured()) {
      throw conflict('Razorpay is not configured on this server.', 'PAYMENT_NOT_CONFIGURED');
    }
    const order = await accessFor(req, clean(req.body?.orderId));
    if (order.paymentStatus === 'paid') {
      throw conflict('This order is already paid.', 'ORDER_ALREADY_PAID');
    }
    if (order.orderStatus === 'cancelled') {
      throw conflict('Cancelled orders cannot be paid.', 'ORDER_CANCELLED');
    }

    const razorpayOrder = await createRazorpayOrder({
      amount: order.totalAmount,
      receipt: order.orderNumber,
      notes: { orderId: String(order._id), orderNumber: order.orderNumber },
    });

    order.razorpayOrderId = razorpayOrder.id;
    order.paymentMethod = 'razorpay';
    await order.save();

    res.status(201).json({
      keyId: env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      orderNumber: order.orderNumber,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order: mapOrder(order),
    });
  }),
);

// POST /api/payments/razorpay/verify — verify the checkout signature server-side.
router.post(
  '/razorpay/verify',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw badRequest('Payment verification details are incomplete.');
    }

    const order = await accessFor(req, clean(orderId));
    if (order.razorpayOrderId !== razorpayOrderId) {
      throw badRequest('Payment order does not match.');
    }

    if (order.paymentStatus === 'paid') {
      if (order.razorpayPaymentId === razorpayPaymentId) {
        return res.json({ order: mapOrder(order), verified: true });
      }
      throw conflict('This order was already paid with a different payment.', 'ORDER_ALREADY_PAID');
    }

    const valid = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!valid) {
      order.paymentStatus = 'failed';
      await order.save();
      throw badRequest('Payment signature verification failed.');
    }

    const updated = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: 'paid' } },
      {
        $set: {
          paymentStatus: 'paid',
          paymentReference: razorpayPaymentId,
          razorpayPaymentId,
          razorpayOrderId,
          razorpaySignature,
          paymentMethod: 'razorpay',
        },
      },
      { new: true },
    );

    if (!updated) {
      throw conflict('This order was already paid.', 'ORDER_ALREADY_PAID');
    }

    res.json({ order: mapOrder(updated), verified: true });
  }),
);

export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature') || '';
  if (!verifyWebhookSignature({ rawBody: req.body, signature })) {
    return res.status(400).json({ message: 'Invalid webhook signature.' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ message: 'Invalid webhook payload.' });
  }

  const payment = event?.payload?.payment?.entity;
  if (payment?.order_id) {
    const update = {};
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      update.paymentStatus = 'paid';
      update.paymentReference = payment.id;
      update.razorpayPaymentId = payment.id;
    } else if (event.event === 'payment.failed') {
      update.paymentStatus = 'failed';
    }

    if (Object.keys(update).length > 0) {
      await Order.updateOne({ razorpayOrderId: payment.order_id }, { $set: update });
    }
  }

  res.json({ received: true });
});

// ---------------------------------------------------------------------------
// Stripe Checkout
// ---------------------------------------------------------------------------

// Public, secret-free configuration used by the checkout UI.
router.get(
  '/stripe/config',
  asyncHandler(async (_req, res) => {
    res.json(await getPublicStripeConfig());
  }),
);

// Creates the pending order (prices/stock from MongoDB) and a hosted Checkout
// Session. The browser only ever receives the Stripe-hosted redirect URL.
router.post(
  '/stripe/checkout',
  checkoutLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const result = await createStripeCheckout({
      payload: req.body,
      customerId: req.auth?.userId ?? null,
      idempotencyKey: req.get('idempotency-key') || req.body?.idempotencyKey || '',
    });

    res.status(result.duplicate ? 200 : 201).json({
      order: mapOrder(result.order),
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
      duplicate: Boolean(result.duplicate),
    });
  }),
);

// Called by the success page. This asks Stripe directly and only marks an order
// paid after Stripe confirms it; redirect query strings are never trusted.
router.post(
  '/stripe/verify',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const sessionId = clean(req.body?.sessionId);
    if (!sessionId) throw badRequest('Stripe Checkout session id is required.');

    const result = await verifyStripeSession({ sessionId });
    res.json({ order: mapOrder(result.order), session: result.session });
  }),
);

// Resumes an open session or creates a fresh attempt for an expired one.
router.post(
  '/stripe/retry',
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const sessionId = clean(req.body?.sessionId);
    if (!sessionId) throw badRequest('Stripe Checkout session id is required.');

    const result = await retryStripeCheckout({ sessionId });
    res.json({
      order: mapOrder(result.order),
      checkoutUrl: result.checkoutUrl,
      paid: Boolean(result.paid),
      resumed: Boolean(result.resumed),
    });
  }),
);

export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('stripe-signature') || '';

  let event;
  try {
    event = constructStripeWebhookEvent(req.body, signature);
  } catch (error) {
    const status = error?.status === 503 ? 503 : 400;
    if (status === 503) console.error('[stripe] webhook secret is not configured.');
    else console.warn('[stripe] rejected webhook with an invalid signature.');
    return res.status(status).json({
      error:
        status === 503
          ? 'Stripe webhooks are not configured on this server.'
          : 'Invalid Stripe webhook signature.',
    });
  }

  const existing = await StripeEvent.findOne({ eventId: event.id });
  if (existing?.status === 'processed') {
    return res.json({ received: true, duplicate: true });
  }
  if (existing) {
    await StripeEvent.updateOne(
      { eventId: event.id },
      { $set: { status: 'processing', type: event.type }, $inc: { attempts: 1 } },
    );
  } else {
    try {
      await StripeEvent.create({
        eventId: event.id,
        type: event.type,
        status: 'processing',
        attempts: 1,
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  try {
    const result = await handleStripeEvent(event);
    await StripeEvent.updateOne(
      { eventId: event.id },
      {
        $set: {
          status: 'processed',
          type: event.type,
          processedAt: new Date(),
          orderId: result?.orderId || null,
        },
      },
    );
    return res.json({ received: true, ignored: Boolean(result?.ignored) });
  } catch (error) {
    console.error(
      `[stripe] webhook processing failed (${event.type}, ${event.id}, ${error?.name || 'Error'})`,
    );
    return res.status(500).json({ error: 'Webhook processing failed. Please retry.' });
  }
});

export default router;
