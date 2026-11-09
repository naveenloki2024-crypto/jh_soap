import { Router } from 'express';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import { asyncHandler, badRequest, conflict, notFound } from '../lib/http.js';
import { mapOrder } from '../lib/serialize.js';
import { clean, parsePagination, validateStatusUpdate } from '../lib/validation.js';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../lib/constants.js';
import { createOrder, findOrderByReference, restoreOrderStock } from '../services/order-service.js';

const router = Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/orders — paginated list with optional status/search filters.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const status = clean(req.query.status);
    const paymentStatus = clean(req.query.paymentStatus ?? req.query.payment_status);
    const search = clean(req.query.q);

    if (status && !ORDER_STATUSES.includes(status)) {
      throw badRequest('Invalid status filter.', {
        status: `status must be one of: ${ORDER_STATUSES.join(', ')}.`,
      });
    }
    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      throw badRequest('Invalid payment status filter.', {
        paymentStatus: `paymentStatus must be one of: ${PAYMENT_STATUSES.join(', ')}.`,
      });
    }

    const query = {};
    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ orderNumber: regex }, { phone: regex }, { customerName: regex }, { email: regex }];
    }

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Order.countDocuments(query),
    ]);

    res.json({
      orders: orders.map((order) => mapOrder(order)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await findOrderByReference(req.params.id);
    if (!order) throw notFound('Order not found.');
    res.json({ order: mapOrder(order) });
  }),
);

// POST /api/admin/orders — create an order on behalf of a customer.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { order } = await createOrder({
      payload: req.body,
      customerId: null,
      idempotencyKey: req.get('idempotency-key') || req.body?.idempotencyKey || '',
    });
    res.status(201).json({ order: mapOrder(order) });
  }),
);

// PATCH /api/admin/orders/:id/status — validated status/payment update.
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { errors, values } = validateStatusUpdate(req.body);
    if (Object.keys(errors).length > 0) {
      throw badRequest('Please correct the highlighted details.', errors);
    }

    const order = await findOrderByReference(req.params.id);
    if (!order) throw notFound('Order not found.');

    if (values.paymentStatus && values.paymentStatus !== order.paymentStatus) {
      // Payments are confirmed only by a verified gateway webhook or the
      // server-to-Stripe verification flow, never by an admin form.
      if (values.paymentStatus === 'paid') {
        throw conflict(
          'Payment status is confirmed by the payment gateway and cannot be set manually.',
          'PAYMENT_STATUS_LOCKED',
        );
      }
      if (['paid', 'refunded'].includes(order.paymentStatus)) {
        throw conflict(
          'Settled payments cannot be changed manually. Use the Stripe dashboard for refunds.',
          'PAYMENT_STATUS_LOCKED',
        );
      }
    }

    if (
      values.orderStatus &&
      values.orderStatus !== 'cancelled' &&
      order.orderStatus === 'cancelled'
    ) {
      throw conflict('A cancelled order cannot be reopened.', 'ORDER_CANCELLED');
    }

    if (values.orderStatus === 'cancelled' && order.orderStatus !== 'cancelled') {
      await restoreOrderStock(order, clean(req.body?.note) || 'Order cancelled by admin');
    }

    for (const [field, value] of Object.entries(values)) order[field] = value;
    order.statusHistory.push({
      status: values.orderStatus || order.orderStatus,
      changedAt: new Date(),
      note: clean(req.body?.note).slice(0, 500),
      changedBy: `admin:${req.auth.userId}`,
    });
    await order.save();

    res.json({ order: mapOrder(order) });
  }),
);

// DELETE /api/admin/orders/:id — restore stock and remove the order.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await findOrderByReference(req.params.id);
    if (!order) throw notFound('Order not found.');

    if (order.orderStatus !== 'cancelled') {
      await restoreOrderStock(order, 'Order deleted by admin');
    }
    await Order.deleteOne({ _id: order._id });
    await Customer.updateOne({ _id: order.customerId }, { $pull: { orderIds: order._id } });

    res.json({ message: 'Order deleted.' });
  }),
);

export default router;
