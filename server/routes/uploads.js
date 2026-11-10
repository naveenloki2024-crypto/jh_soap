import { Router } from 'express';
import Upload from '../models/Upload.js';
import { asyncHandler, notFound } from '../lib/http.js';

const router = Router();

// GET /api/uploads/:filename - public image bytes stored in MongoDB.
router.get(
  '/:filename',
  asyncHandler(async (req, res) => {
    const filename = String(req.params.filename || '');
    if (!/^[A-Za-z0-9._-]+$/.test(filename)) throw notFound('Image not found.');

    const upload = await Upload.findOne({ filename }).select('+data');
    if (!upload?.data) throw notFound('Image not found.');

    res.set('Content-Type', upload.mimeType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('CDN-Cache-Control', 'public, s-maxage=31536000, immutable');
    res.send(upload.data);
  }),
);

export default router;
