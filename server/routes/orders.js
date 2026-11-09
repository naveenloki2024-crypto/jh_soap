import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { mapOrder } from '../lib/serialize.js';
import { normalizePhone } from '../lib/validation.js';
import { optionalAuth } from '../middleware/auth.js';
import { createOrder, findAccessibleOrder } from '../services/order-service.js';

const router = Router();

// POST /api/orders — prices and stock are resolved from MongoDB; nothing sent
// by the browser is trusted for money or stock. Guests may order; signed-in
// customers get the order linked to their account.
router.post(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth?.userId ?? null;
    const { order, duplicate } = await createOrder({
      payload: req.body,
      customerId: userId,
      idempotencyKey: req.get('idempotency-key') || req.body?.idempotencyKey || '',
    });

    res.status(duplicate ? 200 : 201).json({ order: mapOrder(order), duplicate });
  }),
);

// GET /api/orders/:id — owner (session or matching phone) or administrator.
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const ref = req.params.id;
    const admin = Boolean(req.auth && ['admin', 'super_admin'].includes(req.auth.role));
    const userId = admin ? null : req.auth?.userId ?? null;
    const phone = normalizePhone(req.get('x-order-phone'));

    const order = await findAccessibleOrder(ref, { userId, phone, admin });
    res.json({ order: mapOrder(order) });
  }),
);

export default router;
