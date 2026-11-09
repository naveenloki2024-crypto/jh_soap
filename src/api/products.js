import { apiRequest } from './client';

/** Fetches active products from the Express API. */
export async function fetchProducts({ signal } = {}) {
  const data = await apiRequest('/products', { signal });
  return Array.isArray(data.products) ? data.products : [];
}

/** Fetches a single product by slug or id. */
export async function fetchProduct(id, { signal } = {}) {
  const data = await apiRequest(`/products/${encodeURIComponent(id)}`, { signal });
  return data.product ?? null;
}
