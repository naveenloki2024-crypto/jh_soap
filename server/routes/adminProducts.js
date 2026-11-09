import { Router } from 'express';
import Product from '../models/Product.js';
import { asyncHandler } from '../lib/http.js';
import { mapProduct } from '../lib/serialize.js';
import { clean, parsePagination } from '../lib/validation.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const search = clean(req.query.q);
    const query = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { slug: regex }, { sku: regex }];
    }
    if (req.query.active === 'true') query.isActive = true;
    if (req.query.active === 'false') query.isActive = false;

    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Product.countDocuments(query),
    ]);

    res.json({
      products: products.map(mapProduct),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

export default router;
