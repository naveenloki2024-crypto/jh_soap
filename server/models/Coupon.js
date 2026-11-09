import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          if (this.discountType === 'percentage') return value <= 100;
          return value <= 1_000_000;
        },
        message: 'Coupon discount value is out of range.',
      },
    },
    minOrderAmount: { type: Number, min: 0, default: 0 },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, min: 1, default: null },
    usedCount: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { collection: 'coupons', timestamps: true },
);

couponSchema.methods.evaluate = function evaluate(subtotal, now = new Date()) {
  if (!this.isActive) return { valid: false, message: 'This coupon is not active.' };
  if (this.expiresAt && this.expiresAt.getTime() <= now.getTime()) {
    return { valid: false, message: 'This coupon has expired.' };
  }
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, message: 'This coupon has reached its usage limit.' };
  }
  if (Number(subtotal) < this.minOrderAmount) {
    return {
      valid: false,
      message: `This coupon requires a minimum order of ₹${this.minOrderAmount}.`,
    };
  }

  const raw =
    this.discountType === 'percentage'
      ? Number(subtotal) * (this.discountValue / 100)
      : this.discountValue;
  const discount = Math.min(Number(subtotal), Math.round(raw * 100) / 100);
  return { valid: true, discount, message: '' };
};

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

export default Coupon;
