import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, trim: true, maxlength: 60, default: 'Herbal' },
    images: { type: [String], default: [] },
    regularPrice: {
      type: Number,
      required: true,
      min: 0,
      max: 1_000_000,
      validate: {
        validator: Number.isFinite,
        message: 'regularPrice must be a finite number.',
      },
    },
    offerPrice: {
      type: Number,
      min: 0,
      max: 1_000_000,
      default: undefined,
      validate: {
        validator(value) {
          return value === undefined || value === null || Number.isFinite(value);
        },
        message: 'offerPrice must be a finite number.',
      },
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'stockQuantity must be a whole number.',
      },
    },
    sku: { type: String, uppercase: true, trim: true, unique: true, sparse: true, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
  },
  { collection: 'products', timestamps: true },
);

productSchema.index({ isActive: 1, createdAt: -1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
