import mongoose from 'mongoose';

// Vercel's filesystem is read-only and per-instance, so uploaded product images
// are stored in MongoDB and served by the API instead of written to disk.
const uploadSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, unique: true, index: true, maxlength: 160 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    data: { type: Buffer, required: true, select: false },
  },
  { collection: 'uploads', timestamps: true },
);

const Upload = mongoose.models.Upload || mongoose.model('Upload', uploadSchema);

export default Upload;
