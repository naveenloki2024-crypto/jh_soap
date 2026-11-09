import { Router } from 'express';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import { asyncHandler, badRequest, forbidden, notFound } from '../lib/http.js';
import { mapProfile, mapOrder } from '../lib/serialize.js';
import { validateProfileUpdate } from '../lib/validation.js';
import { authenticate } from '../middleware/auth.js';
import { findAccessibleOrder } from '../services/order-service.js';

const router = Router();

router.use(authenticate, (req, _res, next) => {
  if (req.auth.role !== 'customer') return next(forbidden('Customer account required.'));
  next();
});

async function currentCustomer(req) {
  const customer = await Customer.findById(req.auth.userId);
  if (!customer) throw notFound('Account not found.');
  return customer;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const customer = await currentCustomer(req);
    res.json({ profile: mapProfile(customer) });
  }),
);

router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const { errors, values } = validateProfileUpdate(req.body);
    if (Object.keys(errors).length > 0) {
      throw badRequest('Please correct the highlighted details.', errors);
    }
    if (Object.keys(values).length === 0) throw badRequest('No changes were provided.');

    const customer = await currentCustomer(req);
    for (const [field, value] of Object.entries(values)) {
      if (field === 'phone' && value === undefined) customer.phone = undefined;
      else customer[field] = value;
    }
    await customer.save();
    res.json({ profile: mapProfile(customer) });
  }),
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const customer = await currentCustomer(req);
    const orders = await Order.find({ customerId: customer._id }).sort({ createdAt: -1 });
    res.json({ orders: orders.map((order) => mapOrder(order)) });
  }),
);

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await findAccessibleOrder(req.params.id, { userId: req.auth.userId });
    res.json({ order: mapOrder(order) });
  }),
);

export default router;
