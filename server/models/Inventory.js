import mongoose from 'mongoose';

const movementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['seed', 'restock', 'sale', 'return', 'adjustment', 'cancel'],
      required: true,
    },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    reference: { type: String, trim: true, maxlength: 120, default: '' },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
      index: true,
    },
    sku: { type: String, uppercase: true, trim: true, default: '' },
    availableStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'availableStock must be a whole number.',
      },
    },
    reservedStock: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 10 },
    movements: { type: [movementSchema], default: [] },
  },
  { collection: 'inventory', timestamps: true },
);

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

export default Inventory;
