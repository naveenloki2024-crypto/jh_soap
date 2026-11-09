import Inventory from '../models/Inventory.js';

const movement = (type, quantity, reference, note, balanceExpression) => ({
  type,
  quantity,
  reference,
  note,
  balanceAfter: balanceExpression,
  createdAt: '$$NOW',
});

export async function ensureInventory(product, availableStock = product.stockQuantity) {
  return Inventory.findOneAndUpdate(
    { productId: product._id },
    {
      $setOnInsert: {
        productId: product._id,
        sku: product.sku || '',
        availableStock: Math.max(0, Number(availableStock) || 0),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function decrementInventory({ productId, quantity, reference, note = '' }) {
  const result = await Inventory.findOneAndUpdate(
    { productId, availableStock: { $gte: quantity } },
    [
      {
        $set: {
          availableStock: { $subtract: ['$availableStock', quantity] },
          movements: {
            $concatArrays: [
              { $ifNull: ['$movements', []] },
              [
                movement(
                  'sale',
                  -quantity,
                  reference,
                  note,
                  { $subtract: ['$availableStock', quantity] },
                ),
              ],
            ],
          },
        },
      },
    ],
    { new: true },
  );
  return result;
}

export async function incrementInventory({
  productId,
  quantity,
  type = 'return',
  reference = '',
  note = '',
}) {
  const result = await Inventory.findOneAndUpdate(
    { productId },
    [
      {
        $set: {
          availableStock: { $add: ['$availableStock', quantity] },
          movements: {
            $concatArrays: [
              { $ifNull: ['$movements', []] },
              [
                movement(
                  type,
                  quantity,
                  reference,
                  note,
                  { $add: ['$availableStock', quantity] },
                ),
              ],
            ],
          },
        },
      },
    ],
    { new: true },
  );
  return result;
}

export async function setInventoryStock({
  productId,
  availableStock,
  type = 'adjustment',
  reference = '',
  note = '',
}) {
  const result = await Inventory.findOneAndUpdate(
    { productId },
    [
      {
        $set: {
          availableStock: availableStock,
          movements: {
            $concatArrays: [
              { $ifNull: ['$movements', []] },
              [
                movement(
                  type,
                  { $subtract: [availableStock, '$availableStock'] },
                  reference,
                  note,
                  availableStock,
                ),
              ],
            ],
          },
        },
      },
    ],
    { new: true },
  );
  return result;
}
