import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 60 },
    fullName: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true },
    line1: { type: String, trim: true, maxlength: 300 },
    line2: { type: String, trim: true, maxlength: 300 },
    city: { type: String, trim: true, maxlength: 120 },
    district: { type: String, trim: true, maxlength: 120 },
    state: { type: String, trim: true, maxlength: 120 },
    pincode: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120, default: '' },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 200,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    passwordHash: { type: String, select: false, default: undefined },
    emailVerified: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, trim: true, maxlength: 500, default: null },
    addresses: { type: [addressSchema], default: [] },
    orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    lastLoginAt: { type: Date, default: null },
    resetTokenHash: { type: String, select: false, default: undefined },
    resetTokenExpiresAt: { type: Date, select: false, default: undefined },
    otpHash: { type: String, select: false, default: undefined },
    otpExpiresAt: { type: Date, select: false, default: undefined },
    otpAttempts: { type: Number, default: 0, select: false },
  },
  { collection: 'customers', timestamps: true },
);

customerSchema.statics.findByEmail = function findByEmail(email) {
  return this.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');
};

customerSchema.statics.findByPhone = function findByPhone(phone) {
  return this.findOne({ phone: String(phone).trim() }).select('+passwordHash');
};

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export default Customer;
