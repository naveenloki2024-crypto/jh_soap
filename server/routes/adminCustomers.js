import { Router } from 'express';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import { asyncHandler, badRequest, conflict, notFound } from '../lib/http.js';
import { mapCustomer, mapOrder } from '../lib/serialize.js';
import {
  EMAIL_RE,
  MOBILE_RE,
  clean,
  normalizePhone,
  parsePagination,
} from '../lib/validation.js';
import { isObjectId } from '../lib/ids.js';

const router = Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const search = clean(req.query.q);
    const query = {};
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Customer.countDocuments(query),
    ]);

    res.json({
      customers: customers.map(mapCustomer),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('Customer not found.');
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw notFound('Customer not found.');
    const orders = await Order.find({ customerId: customer._id }).sort({ createdAt: -1 });
    res.json({ customer: mapCustomer(customer), orders: orders.map((order) => mapOrder(order)) });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = clean(req.body?.name ?? req.body?.fullName).slice(0, 120);
    const email = clean(req.body?.email).toLowerCase().slice(0, 200);
    const phone = normalizePhone(req.body?.phone);
    const errors = {};
    if (name.length < 2) errors.name = 'Customer name is required.';
    if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
    if (phone && !MOBILE_RE.test(phone)) errors.phone = 'Enter a valid 10-digit mobile number.';
    if (!email && !phone) errors.email = 'An email address or phone number is required.';
    if (Object.keys(errors).length > 0) throw badRequest('Please check the customer details.', errors);

    const customer = await Customer.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      emailVerified: Boolean(email),
      phoneVerified: false,
    });
    res.status(201).json({ customer: mapCustomer(customer) });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('Customer not found.');
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw notFound('Customer not found.');

    const errors = {};
    const values = {};
    if (req.body?.name !== undefined || req.body?.fullName !== undefined) {
      const name = clean(req.body.name ?? req.body.fullName).slice(0, 120);
      if (name.length < 2) errors.name = 'Customer name is required.';
      else values.name = name;
    }
    if (req.body?.email !== undefined) {
      const email = clean(req.body.email).toLowerCase().slice(0, 200);
      if (!email) values.email = undefined;
      else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
      else values.email = email;
    }
    if (req.body?.phone !== undefined) {
      const phone = normalizePhone(req.body.phone);
      if (!phone) values.phone = undefined;
      else if (!MOBILE_RE.test(phone)) errors.phone = 'Enter a valid 10-digit mobile number.';
      else values.phone = phone;
    }
    if (typeof req.body?.emailVerified === 'boolean') values.emailVerified = req.body.emailVerified;
    if (typeof req.body?.phoneVerified === 'boolean') values.phoneVerified = req.body.phoneVerified;

    if (Object.keys(errors).length > 0) throw badRequest('Please check the customer details.', errors);
    if (Object.keys(values).length === 0) throw badRequest('No changes were provided.');

    for (const [field, value] of Object.entries(values)) customer[field] = value;
    await customer.save();
    res.json({ customer: mapCustomer(customer) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('Customer not found.');
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw notFound('Customer not found.');
    const orderCount = await Order.countDocuments({ customerId: customer._id });
    if (orderCount > 0 || customer.orderIds.length > 0) {
      throw conflict('Customers with order history cannot be deleted.', 'CUSTOMER_HAS_ORDERS');
    }
    await Customer.deleteOne({ _id: customer._id });
    res.json({ message: 'Customer deleted.' });
  }),
);

export default router;
