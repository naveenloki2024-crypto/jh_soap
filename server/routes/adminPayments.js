import { Router } from 'express';
import Order from '../models/Order.js';
import { asyncHandler, badRequest } from '../lib/http.js';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../lib/constants.js';
import { clean, parsePagination } from '../lib/validation.js';

const router = Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function mapTransaction(order) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    phone: order.phone,
    email: order.email || '',
    amount: Number(order.totalAmount) || 0,
    currency: 'INR',
    method: order.paymentMethod,
    status: order.paymentStatus,
    orderStatus: order.orderStatus,
    reference: order.paymentReference || null,
    razorpayOrderId: order.razorpayOrderId || null,
    razorpayPaymentId: order.razorpayPaymentId || null,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId || null,
    stripePaymentIntentId: order.stripePaymentIntentId || null,
    stripePaymentMethodType: order.stripePaymentMethodType || null,
    createdAt: order.createdAt ? order.createdAt.toISOString() : null,
    updatedAt: order.updatedAt ? order.updatedAt.toISOString() : null,
  };
}

// GET /api/admin/payments — payment transactions derived from orders.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const status = clean(req.query.status);
    const method = clean(req.query.method);
    const search = clean(req.query.q);

    if (status && !PAYMENT_STATUSES.includes(status)) {
      throw badRequest('Invalid payment status filter.', {
        status: `status must be one of: ${PAYMENT_STATUSES.join(', ')}.`,
      });
    }
    if (method && !PAYMENT_METHODS.includes(method)) {
      throw badRequest('Invalid payment method filter.', {
        method: `method must be one of: ${PAYMENT_METHODS.join(', ')}.`,
      });
    }

    const query = {};
    if (status) query.paymentStatus = status;
    if (method) query.paymentMethod = method;
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { orderNumber: regex },
        { customerName: regex },
        { phone: regex },
        { email: regex },
        { paymentReference: regex },
        { razorpayOrderId: regex },
        { razorpayPaymentId: regex },
        { stripeCheckoutSessionId: regex },
        { stripePaymentIntentId: regex },
        { stripePaymentMethodType: regex },
      ];
    }

    const [orders, total, breakdown] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Order.countDocuments(query),
      Order.aggregate([
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    const summary = Object.fromEntries(
      PAYMENT_STATUSES.map((value) => [value, { count: 0, amount: 0 }]),
    );
    for (const row of breakdown) {
      summary[row._id] = { count: row.count, amount: row.amount };
    }

    res.json({
      payments: orders.map(mapTransaction),
      summary,
      totalTransactions: breakdown.reduce((sum, row) => sum + row.count, 0),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

export default router;
