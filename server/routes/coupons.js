import { Router } from 'express';
import Coupon from '../models/Coupon.js';
import { asyncHandler } from '../lib/http.js';
import { clean } from '../lib/validation.js';

const router = Router();

router.get(
  '/validate',
  asyncHandler(async (req, res) => {
    const code = clean(req.query.code).toUpperCase();
    const subtotal = Number(req.query.subtotal);
    if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
      return res.status(400).json({ valid: false, message: 'Coupon code and subtotal are required.' });
    }

    const coupon = await Coupon.findOne({ code });
    if (!coupon) return res.json({ valid: false, message: 'Coupon code is not valid.' });

    const result = coupon.evaluate(subtotal);
    res.json({
      valid: result.valid,
      message: result.message,
      discount: result.valid ? result.discount : 0,
      code: coupon.code,
    });
  }),
);

export default router;
