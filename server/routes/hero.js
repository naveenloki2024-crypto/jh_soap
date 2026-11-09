import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { mapHero } from '../lib/serialize.js';
import { getHeroSettings } from '../services/hero-service.js';

const router = Router();

// GET /api/hero — public homepage hero configuration.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const hero = await getHeroSettings();
    res.set('Cache-Control', 'no-store');
    res.json({ hero: mapHero(hero) });
  }),
);

export default router;
