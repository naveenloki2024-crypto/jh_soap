import { Router } from 'express';
import { asyncHandler, badRequest } from '../lib/http.js';
import { DEFAULT_HERO_CONTENT } from '../lib/hero-defaults.js';
import { mapHero } from '../lib/serialize.js';
import { validateHeroPayload } from '../lib/validation.js';
import { getHeroSettings, saveHeroSettings } from '../services/hero-service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const hero = await getHeroSettings();
    res.set('Cache-Control', 'no-store');
    res.json({ hero: mapHero(hero) });
  }),
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { errors, values } = validateHeroPayload(req.body);
    if (Object.keys(errors).length > 0) {
      throw badRequest('Please correct the highlighted hero details.', errors);
    }
    if (Object.keys(values).length === 0) {
      throw badRequest('No valid hero fields were provided to update.');
    }

    const hero = await saveHeroSettings(values, req.auth?.userId);
    res.json({ hero: mapHero(hero), message: 'Hero section saved. The homepage is up to date.' });
  }),
);

router.post(
  '/reset',
  asyncHandler(async (req, res) => {
    const hero = await saveHeroSettings(DEFAULT_HERO_CONTENT, req.auth?.userId);
    res.json({
      hero: mapHero(hero),
      message: 'Default hero content restored.',
    });
  }),
);

export default router;
