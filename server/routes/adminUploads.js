import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Router } from 'express';
import { asyncHandler, badRequest } from '../lib/http.js';

const router = Router();
const uploadDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

const TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function hasSignature(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mime === 'image/webp') {
    return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  if (mime === 'image/gif') return buffer.toString('ascii', 0, 4) === 'GIF8';
  return false;
}

// POST /api/admin/uploads — raw image body. Returns a public /uploads URL.
router.post(
  '/',
  express.raw({ type: Object.keys(TYPES), limit: '5mb' }),
  asyncHandler(async (req, res) => {
    const mime = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const extension = TYPES[mime];
    if (!extension) {
      throw badRequest('Unsupported image type. Use JPEG, PNG, WebP or GIF.');
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw badRequest('The uploaded image is empty or too large.');
    }
    if (!hasSignature(req.body, mime)) {
      throw badRequest('The uploaded file is not a valid image.');
    }

    await mkdir(uploadDir, { recursive: true });
    const filename = `product-${Date.now()}-${randomBytes(6).toString('hex')}.${extension}`;
    await writeFile(join(uploadDir, filename), req.body);

    res.status(201).json({ url: `/uploads/${filename}` });
  }),
);

export default router;
