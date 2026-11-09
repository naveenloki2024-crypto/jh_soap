import vetiver from '../assets/soap-vetiver.png';
import aloevera from '../assets/soap-aloevera.png';
import kuppaimeni from '../assets/soap-kuppaimeni.png';
import charcoal from '../assets/soap-chorcoal.png';
import redwine from '../assets/soap-redwine.png';
import goatmilk from '../assets/soap-goatmilk.png';
import aavarampoo from '../assets/soap-aavarampoo.png';

export const SOAP_PRICE = 110;
export const OFFER_GROUP_SIZE = 3;
export const OFFER_GROUP_PRICE = 285;

export const SOAPS = [
  {
    id: 'vetiver',
    name: 'Vettiver',
    image: vetiver,
    category: 'Herbal',
    price: SOAP_PRICE,
    description: 'Enjoy the fresh, earthy fragrance of vetiver with every bath!',
  },
  {
    id: 'aloevera',
    name: 'Aloevera',
    image: aloevera,
    category: 'Skincare',
    price: SOAP_PRICE,
    description: 'Give your skin a gentle, refreshing cleanse every day with aloe vera!',
  },
  {
    id: 'kuppaimeni',
    name: 'Kuppaimeni',
    image: kuppaimeni,
    category: 'Herbal',
    price: SOAP_PRICE,
    description: 'Bring the goodness of traditional herbal bathing into your daily routine!',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    image: charcoal,
    category: 'Deep Clean',
    price: SOAP_PRICE,
    description: 'Wash away the day’s dirt and oil with a refreshing charcoal cleanse!',
  },
  {
    id: 'redwine',
    name: 'Redwine',
    image: redwine,
    category: 'Skincare',
    price: SOAP_PRICE,
    description: 'Make every bath feel special with a rich and refreshing red wine soap!',
  },
  {
    id: 'goatmilk',
    name: 'Goatmilk',
    image: goatmilk,
    category: 'Nourish',
    price: SOAP_PRICE,
    description: 'Enjoy a creamy bathing experience that leaves your skin feeling soft and smooth!',
  },
  {
    id: 'aavarampoo',
    name: 'Aavaram Poo',
    image: aavarampoo,
    category: 'Herbal',
    price: SOAP_PRICE,
    description: 'Add a touch of traditional herbal goodness to your everyday bath!',
},
];

export const SOAP_BY_ID = Object.fromEntries(SOAPS.map((soap) => [soap.id, soap]));

// Local bundled images keyed by slug, used as a graceful fallback when an
// admin has not uploaded a product image yet.
export const PRODUCT_IMAGES = Object.fromEntries(SOAPS.map((soap) => [soap.id, soap.image]));

/**
 * Normalises a product coming from GET /api/products into the shape used by
 * the existing components. Images saved in MongoDB always win so admin
 * uploads appear on the storefront immediately.
 */
export function mapApiProduct(product) {
  const slug = product.slug || product.id;
  return {
    id: slug,
    slug,
    productId: product.productId ?? null,
    name: product.name,
    description: product.description ?? '',
    price: Number(product.price) || 0,
    category: product.category || 'Herbal',
    image: product.imageUrl || PRODUCT_IMAGES[slug] || '',
    stockQuantity: product.stockQuantity ?? 0,
  };
}

export const formatPrice = (value) => `₹${value}/-`;