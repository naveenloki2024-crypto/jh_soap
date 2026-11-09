import { Router } from 'express';
import Product from '../models/Product.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { mapProduct } from '../lib/serialize.js';
import { validateProductPayload } from '../lib/validation.js';
import { isObjectId } from '../lib/ids.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { ensureInventory, setInventoryStock } from '../services/inventory-service.js';

const router = Router();

async function findProductByRef(ref) {
  return isObjectId(ref) ? Product.findById(ref) : Product.findOne({ slug: ref });
}

// GET /api/products — active products only.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const products = await Product.find({ isActive: true }).sort({ name: 1 });
    res.set('Cache-Control', 'no-store');
    res.json({ products: products.map(mapProduct) });
  }),
);

// GET /api/products/:id — by slug or MongoDB id.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await findProductByRef(req.params.id);
    if (!product || !product.isActive) throw notFound('Product not found.');
    res.json({ product: mapProduct(product) });
  }),
);

// POST /api/products — admin only.
router.post(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { errors, values } = validateProductPayload(req.body, { partial: false });
    if (Object.keys(errors).length > 0) {
      throw badRequest('Please correct the highlighted details.', errors);
    }
    const product = await Product.create(values);
    await ensureInventory(product, product.stockQuantity);
    res.status(201).json({ product: mapProduct(product) });
  }),
);

// PUT /api/products/:id — admin only, partial update.
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await findProductByRef(req.params.id);
    if (!existing) throw notFound('Product not found.');

    const { errors, values } = validateProductPayload(req.body, { partial: true, existing });
    if (Object.keys(errors).length > 0) {
      throw badRequest('Please correct the highlighted details.', errors);
    }
    if (Object.keys(values).length === 0) {
      throw badRequest('No valid fields were provided to update.');
    }

    const set = { ...values };
    const unset = {};
    for (const field of ['offerPrice', 'sku']) {
      if (Object.prototype.hasOwnProperty.call(set, field) && set[field] === undefined) {
        delete set[field];
        unset[field] = 1;
      }
    }
    const update = Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : set;
    const product = await Product.findByIdAndUpdate(existing._id, update, {
      new: true,
      runValidators: true,
      context: 'query',
    });

    if (values.stockQuantity !== undefined && values.stockQuantity !== existing.stockQuantity) {
      await ensureInventory(product, existing.stockQuantity);
      await setInventoryStock({
        productId: product._id,
        availableStock: product.stockQuantity,
        type: 'adjustment',
        reference: 'product-update',
        note: 'Stock updated from the product editor',
      });
    }

    res.json({ product: mapProduct(product) });
  }),
);

// DELETE /api/products/:id — admin only; soft-deactivates to keep order history intact.
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await findProductByRef(req.params.id);
    if (!existing) throw notFound('Product not found.');

    const product = await Product.findByIdAndUpdate(
      existing._id,
      { $set: { isActive: false } },
      { new: true },
    );
    res.json({ product: mapProduct(product), message: 'Product deactivated.' });
  }),
);

export default router;
