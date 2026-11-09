import { useCallback, useEffect, useMemo, useState } from 'react';
import { SOAP_BY_ID } from '../data/products';
import { getCartTotals } from '../utils/cart';
import { CartContext } from './cart';
import { useProducts } from './products';
import CartDrawer from '../components/CartDrawer';
import CheckoutPage from '../components/CheckoutPage';

const CART_STORAGE_KEY = 'jh-cart-v1';

const readStoredCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        SOAP_BY_ID[item.id] &&
        Number.isFinite(item.qty) &&
        item.qty > 0,
    );
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const { productById } = useProducts();
  const [cartItems, setCartItems] = useState(readStoredCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // localStorage may be unavailable (private mode); keep cart in memory.
    }
  }, [cartItems]);

  useEffect(() => {
    document.body.style.overflow = isCartOpen || isCheckoutOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen, isCheckoutOpen]);

  const addItem = useCallback((id, qty = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, qty: item.qty + qty } : item,
        );
      }
      return [...prev, { id, qty }];
    });
  }, []);

  const incrementItem = useCallback((id) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item)),
    );
  }, []);

  const decrementItem = useCallback((id) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(item.qty - 1, 1) } : item,
      ),
    );
  }, []);

  const removeItem = useCallback((id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const openCheckout = useCallback(() => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }, []);

  const closeCheckout = useCallback(() => setIsCheckoutOpen(false), []);

  const cartLines = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = productById[item.id] || SOAP_BY_ID[item.id];
          return { product, qty: item.qty };
        })
        .filter((line) => line.product),
    [cartItems, productById],
  );

  const qtyById = useMemo(
    () => Object.fromEntries(cartItems.map((item) => [item.id, item.qty])),
    [cartItems],
  );

  const totals = useMemo(() => getCartTotals(cartItems), [cartItems]);

  const value = {
    cartItems,
    cartLines,
    qtyById,
    totals,
    isCartOpen,
    isCheckoutOpen,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
    openCart,
    closeCart,
    openCheckout,
    closeCheckout,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      {isCheckoutOpen && <CheckoutPage />}
    </CartContext.Provider>
  );
}