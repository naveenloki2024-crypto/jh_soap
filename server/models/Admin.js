import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'super_admin'], default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { collection: 'admins', timestamps: true },
);

adminSchema.statics.findByEmail = function findByEmail(email) {
  return this.findOne({ email: String(email).trim().toLowerCase(), isActive: true }).select(
    '+passwordHash',
  );
};

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

export default Admin;
