import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchProducts } from '../api/products';
import { SOAPS, mapApiProduct } from '../data/products';
import { subscribeStorefrontUpdates } from '../utils/storefrontEvents';
import { ProductsContext } from './products';

// Static catalogue used as a graceful fallback if the API is unavailable.
const FALLBACK_PRODUCTS = SOAPS.map((soap) => ({ ...soap, slug: soap.id }));

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');
  const controllerRef = useRef(null);

  // All state updates happen after the await, never synchronously in an effect.
  const runFetch = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const list = await fetchProducts({ signal: controller.signal });
      setProducts(list.map(mapApiProduct));
      setStatus('ready');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setProducts(FALLBACK_PRODUCTS);
      setError(err?.message || 'Could not load products.');
      setStatus('error');
    }
  }, []);

  const reload = useCallback(() => {
    setStatus('loading');
    setError('');
    return runFetch();
  }, [runFetch]);

  useEffect(() => {
    // Fetch on mount. State updates inside runFetch only run after the network
    // await resolves, so no cascading synchronous render occurs here.
    // oxlint-disable-next-line react/set-state-in-effect
    runFetch();
    return () => controllerRef.current?.abort();
  }, [runFetch]);

  useEffect(() => subscribeStorefrontUpdates(runFetch), [runFetch]);

  const productById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product])),
    [products],
  );

  const value = useMemo(
    () => ({ products, productById, status, error, reload }),
    [products, productById, status, error, reload],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}
