import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { safeErrorMessage } from '../lib/safe-log.js';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';

const CATALOG = [
  {
    name: 'Vettiver',
    slug: 'vetiver',
    category: 'Herbal',
    description: 'Enjoy the fresh, earthy fragrance of vetiver with every bath!',
  },
  {
    name: 'Aloevera',
    slug: 'aloevera',
    category: 'Skincare',
    description: 'Give your skin a gentle, refreshing cleanse every day with aloe vera!',
  },
  {
    name: 'Kuppaimeni',
    slug: 'kuppaimeni',
    category: 'Herbal',
    description: 'Bring the goodness of traditional herbal bathing into your daily routine!',
  },
  {
    name: 'Charcoal',
    slug: 'charcoal',
    category: 'Deep Clean',
    description: "Wash away the day's dirt and oil with a refreshing charcoal cleanse!",
  },
  {
    name: 'Redwine',
    slug: 'redwine',
    category: 'Skincare',
    description: 'Make every bath feel special with a rich and refreshing red wine soap!',
  },
  {
    name: 'Goatmilk',
    slug: 'goatmilk',
    category: 'Nourish',
    description:
      'Enjoy a creamy bathing experience that leaves your skin feeling soft and smooth!',
  },
  {
    name: 'Aavaram Poo',
    slug: 'aavarampoo',
    category: 'Herbal',
    description: 'Add a touch of traditional herbal goodness to your everyday bath!',
  },
];

const price = Number(process.env.SEED_PRICE || 110);
const stock = Math.max(0, Math.floor(Number(process.env.SEED_STOCK || 0)));

async function seed() {
  await connectDatabase();
  let created = 0;
  let updated = 0;

  for (const item of CATALOG) {
    const existing = await Product.findOne({ slug: item.slug });
    if (existing) {
      await Inventory.findOneAndUpdate(
        { productId: existing._id },
        { $setOnInsert: { sku: existing.sku || '', availableStock: existing.stockQuantity } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      updated += 1;
      continue;
    }

    const product = await Product.create({
      ...item,
      regularPrice: price,
      stockQuantity: stock,
      isActive: true,
      images: [],
    });
    await Inventory.create({
      productId: product._id,
      sku: product.sku || '',
      availableStock: stock,
      movements:
        stock > 0
          ? [{ type: 'seed', quantity: stock, balanceAfter: stock, note: 'Initial catalog seed' }]
          : [],
    });
    created += 1;
  }

  console.log(
    `Catalog seeded: ${created} created, ${updated} updated. Stock for new products: ${stock}.`,
  );
}

seed()
  .catch((error) => {
    console.error(`Seed failed: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
  });
