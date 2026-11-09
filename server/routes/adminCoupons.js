import { Router } from 'express';
import Coupon from '../models/Coupon.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { mapCoupon } from '../lib/serialize.js';
import { clean, parsePagination, validateCouponPayload } from '../lib/validation.js';
import { isObjectId } from '../lib/ids.js';

const router = Router();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const search = clean(req.query.q);
    const query = {};
    if (search) query.code = new RegExp(escapeRegex(search.toUpperCase()), 'i');

    const [coupons, total] = await Promise.all([
      Coupon.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Coupon.countDocuments(query),
    ]);

    res.json({
      coupons: coupons.map(mapCoupon),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('Coupon not found.');
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw notFound('Coupon not found.');
    res.json({ coupon: mapCoupon(coupon) });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { errors, values } = validateCouponPayload(req.body, { partial: false });
    if (Object.keys(errors).length > 0) throw badRequest('Please check the coupon details.', errors);
    const coupon = await Coupon.create(values);
    res.status(201).json({ coupon: mapCoupon(coupon) });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('Coupon not found.');
    const existing = await Coupon.findById(req.params.id);
    if (!existing) throw notFound('Coupon not found.');

    const { errors, values } = validateCouponPayload(req.body, { partial: true });
    if (Object.keys(errors).length > 0) throw badRequest('Please check the coupon details.', errors);
    if (Object.keys(values).length === 0) throw badRequest('No changes were provided.');

    for (const [field, value] of Object.entries(values)) existing[field] = value;
    await existing.save();
    res.json({ coupon: mapCoupon(existing) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw notFound('Coupon not found.');
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw notFound('Coupon not found.');

    if (coupon.usedCount > 0) {
      coupon.isActive = false;
      await coupon.save();
      return res.json({ coupon: mapCoupon(coupon), message: 'Coupon deactivated.' });
    }

    await Coupon.deleteOne({ _id: coupon._id });
    res.json({ message: 'Coupon deleted.' });
  }),
);

export default router;
