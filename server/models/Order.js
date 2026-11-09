import mongoose from 'mongoose';
import { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from '../lib/constants.js';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    slug: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, maxlength: 120, default: '' },
    mobile: { type: String, trim: true, default: '' },
    alternateMobile: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    area: { type: String, trim: true, maxlength: 120, default: '' },
    city: { type: String, trim: true, maxlength: 120, default: '' },
    district: { type: String, trim: true, maxlength: 120, default: '' },
    state: { type: String, trim: true, maxlength: 120, default: 'Tamil Nadu' },
    pincode: { type: String, trim: true, default: '' },
    landmark: { type: String, trim: true, maxlength: 200, default: '' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    changedBy: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    phone: { type: String, required: true, trim: true, index: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'An order needs at least one item.',
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    offerDiscount: { type: Number, min: 0, default: 0 },
    couponDiscount: { type: Number, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true, default: null },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cod' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'received', index: true },
    paymentReference: { type: String, trim: true, maxlength: 200, default: null },
    razorpayOrderId: { type: String, trim: true, default: null },
    razorpayPaymentId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
    },
    razorpaySignature: { type: String, trim: true, default: null },
    stripeCheckoutSessionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
      index: true,
    },
    stripeSessionUrl: { type: String, trim: true, default: null },
    stripePaymentMethodType: { type: String, trim: true, default: null },
    stripeCheckoutAttempt: { type: Number, min: 0, default: 0 },
    stripeRefundId: { type: String, trim: true, default: null },
    paymentCompletedAt: { type: Date, default: null },
    idempotencyKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
      maxlength: 120,
    },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    stockRestored: { type: Boolean, default: false },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { collection: 'orders', timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
