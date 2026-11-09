import HeroSection from '../models/HeroSection.js';

export const HERO_KEY = 'home';

const LOCALIZED_HERO_FIELDS = [
  'heading',
  'headingHighlight',
  'subtitle',
  'description',
  'primaryButtonText',
  'secondaryButtonText',
];

/**
 * Flattens nested locale content into dot-path updates so saving one language
 * never replaces the other. English is also mirrored onto the legacy
 * top-level fields for older API consumers.
 */
function flattenHeroUpdate(values) {
  const update = {};
  for (const [key, value] of Object.entries(values || {})) {
    if (key === 'locales') continue;
    update[key] = value;
  }

  const locales = values?.locales;
  if (!locales || typeof locales !== 'object' || Array.isArray(locales)) return update;

  for (const [lang, content] of Object.entries(locales)) {
    if (!content || typeof content !== 'object' || Array.isArray(content)) continue;
    for (const [field, value] of Object.entries(content)) {
      if (!LOCALIZED_HERO_FIELDS.includes(field)) continue;
      update[`locales.${lang}.${field}`] = value;
    }
  }

  if (locales.en && typeof locales.en === 'object' && !Array.isArray(locales.en)) {
    for (const [field, value] of Object.entries(locales.en)) {
      if (LOCALIZED_HERO_FIELDS.includes(field)) update[field] = value;
    }
  }

  return update;
}


/** Returns the single homepage hero document, creating it with safe defaults. */
export async function getHeroSettings() {
  return HeroSection.findOneAndUpdate(
    { key: HERO_KEY },
    { $setOnInsert: { key: HERO_KEY } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );
}

/** Applies a partial update and returns the saved hero configuration. */
export async function saveHeroSettings(values, adminId = null) {
  const update = flattenHeroUpdate(values);
  if (adminId) update.updatedBy = adminId;

  return HeroSection.findOneAndUpdate(
    { key: HERO_KEY },
    { $set: update, $setOnInsert: { key: HERO_KEY } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
      context: 'query',
    },
  );
}
