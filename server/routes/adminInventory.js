import { Router } from 'express';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import { asyncHandler, badRequest, conflict, notFound } from '../lib/http.js';
import { mapInventory } from '../lib/serialize.js';
import { clean, parsePagination, validateInventoryAdjustment } from '../lib/validation.js';
import { isObjectId } from '../lib/ids.js';
import { ensureInventory, setInventoryStock } from '../services/inventory-service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const query = {};
    if (req.query.lowStock === 'true') {
      query.$expr = { $lte: ['$availableStock', '$lowStockThreshold'] };
    }
    if (req.query.q && clean(req.query.q)) {
      const search = clean(req.query.q);
      const products = await Product.find({
        $or: [
          { name: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          { sku: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ],
      }).select('_id');
      query.productId = { $in: products.map((product) => product._id) };
    }

    const [inventory, total] = await Promise.all([
      Inventory.find(query)
        .populate('productId', 'name slug sku')
        .sort({ availableStock: 1 })
        .skip(offset)
        .limit(limit),
      Inventory.countDocuments(query),
    ]);

    res.json({
      inventory: inventory.map(mapInventory),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.get(
  '/:productId',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.productId)) throw notFound('Inventory not found.');
    const inventory = await Inventory.findOne({ productId: req.params.productId }).populate(
      'productId',
      'name slug sku',
    );
    if (!inventory) throw notFound('Inventory not found.');
    res.json({ inventory: mapInventory(inventory) });
  }),
);

router.patch(
  '/:productId',
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.productId)) throw notFound('Inventory not found.');
    const product = await Product.findById(req.params.productId);
    if (!product) throw notFound('Product not found.');

    const { errors, values } = validateInventoryAdjustment(req.body);
    if (Object.keys(errors).length > 0) throw badRequest('Please check the adjustment.', errors);

    await ensureInventory(product, product.stockQuantity);
    const before = product.stockQuantity;
    const update =
      values.delta < 0
        ? Product.findOneAndUpdate(
            { _id: product._id, stockQuantity: { $gte: Math.abs(values.delta) } },
            { $inc: { stockQuantity: values.delta } },
            { new: true },
          )
        : Product.findByIdAndUpdate(
            product._id,
            { $inc: { stockQuantity: values.delta } },
            { new: true },
          );

    const updatedProduct = await update;
    if (!updatedProduct) {
      throw conflict('Stock cannot go below zero.', 'NEGATIVE_STOCK');
    }

    try {
      if (values.lowStockThreshold !== undefined) {
        await Inventory.updateOne(
          { productId: updatedProduct._id },
          { $set: { lowStockThreshold: values.lowStockThreshold } },
        );
      }
      await setInventoryStock({
        productId: updatedProduct._id,
        availableStock: updatedProduct.stockQuantity,
        type: values.delta > 0 ? 'restock' : 'adjustment',
        reference: values.reference,
        note: values.note,
      });
    } catch (error) {
      await Product.updateOne(
        { _id: updatedProduct._id },
        { $inc: { stockQuantity: before - updatedProduct.stockQuantity } },
      );
      throw error;
    }

    const inventory = await Inventory.findOne({ productId: updatedProduct._id }).populate(
      'productId',
      'name slug sku',
    );
    res.json({ inventory: mapInventory(inventory), productStock: updatedProduct.stockQuantity });
  }),
);

export default router;
