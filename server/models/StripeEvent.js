import mongoose from 'mongoose';

// One record per Stripe event id. The unique index makes webhook processing
// idempotent even when Stripe retries delivery.
const stripeEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['processing', 'processed'],
      default: 'processing',
      index: true,
    },
    attempts: { type: Number, min: 1, default: 1 },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    processedAt: { type: Date, default: null },
  },
  { collection: 'stripe_events', timestamps: true },
);

stripeEventSchema.index({ createdAt: -1 });

const StripeEvent =
  mongoose.models.StripeEvent || mongoose.model('StripeEvent', stripeEventSchema);

export default StripeEvent;
