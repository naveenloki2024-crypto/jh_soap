import { useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash, ArrowRight } from 'lucide-react';
import { useCart } from '../context/cart';
import { formatPrice, OFFER_GROUP_PRICE } from '../data/products';
import { useLanguage } from '../context/LanguageContext';
import '../styles/CartDrawer.css';

const CartDrawer = () => {
  const {
    cartLines,
    totals,
    isCartOpen,
    incrementItem,
    decrementItem,
    removeItem,
    closeCart,
    openCheckout,
  } = useCart();
  const { t } = useLanguage();

  const getProductName = (product) => {
    if (!product?.id) return product?.name || '';
    const key = product.id === 'aavarampoo' ? 'aavarampoo' : product.id;
    const translated = t(`products.${key}.name`);
    if (translated && translated !== `products.${key}.name`) {
      return translated;
    }
    return product.name || '';
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeCart();
    };
    if (isCartOpen) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
    return undefined;
  }, [isCartOpen, closeCart]);

  const continueShopping = () => {
    closeCart();
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
  };

  const buyNow = () => {
    openCheckout();
  };

  return (
    <div className={`cart-overlay${isCartOpen ? ' open' : ''}`} onClick={closeCart}>
      <aside
        className={`cart-drawer${isCartOpen ? ' open' : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <header className="cart-header">
          <h2 className="cart-title">
            <ShoppingCart size={20} strokeWidth={1.5} />
            {t('cart.title')}
            {totals.unitCount > 0 && <span className="cart-title-count">{totals.unitCount}</span>}
          </h2>
          <button className="cart-close" onClick={closeCart} aria-label={t('common.close')}>
            <X size={20} strokeWidth={1.5} />
          </button>
        </header>

        {cartLines.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">
              <ShoppingCart size={34} strokeWidth={1.25} />
            </div>
            <p className="cart-empty-title">{t('cart.emptyTitle')}</p>
            <p className="cart-empty-text">{t('cart.emptyText')}</p>
            <button className="cart-continue-btn" onClick={continueShopping}>
              {t('cart.continueShopping')}
              <ArrowRight size={16} strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartLines.map(({ product, qty }) => {
                const pName = getProductName(product);
                return (
                  <div className="cart-item" key={product.id}>
                    <div className="cart-item-img-wrap">
                      <img src={product.image} alt={pName} />
                    </div>
                    <div className="cart-item-info">
                      <span className="cart-item-category">{product.category}</span>
                      <h3 className="cart-item-name">{pName}</h3>
                      <span className="cart-item-price">
                        {formatPrice(product.price)} {t('cart.each')}
                      </span>
                      <div className="cart-item-actions">
                        <div className="cart-qty">
                          <button
                            className="cart-qty-btn"
                            onClick={() => decrementItem(product.id)}
                            disabled={qty <= 1}
                            aria-label={`${t('cart.decrease')} ${pName}`}
                          >
                            <Minus size={14} strokeWidth={1.5} />
                          </button>
                          <span className="cart-qty-value">{qty}</span>
                          <button
                            className="cart-qty-btn"
                            onClick={() => incrementItem(product.id)}
                            aria-label={`${t('cart.increase')} ${pName}`}
                          >
                            <Plus size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                        <button
                          className="cart-remove"
                          onClick={() => removeItem(product.id)}
                          aria-label={`${t('cart.removeItem')} ${pName}`}
                        >
                          <Trash size={15} strokeWidth={1.5} />
                          {t('cart.remove')}
                        </button>
                      </div>
                    </div>
                    <span className="cart-item-line-total">{formatPrice(product.price * qty)}</span>
                  </div>
                );
              })}
            </div>

            {totals.unitCount >= 3 && (
              <div className="cart-offer-banner">
                <span className="cart-offer-title">{t('cart.offerTitle')}</span>
                <span className="cart-offer-text">
                  {t('cart.offerText')} {formatPrice(OFFER_GROUP_PRICE)} {t('cart.appliedTo')} {totals.offerGroups} {totals.offerGroups === 1 ? t('cart.fullGroup') : t('cart.fullGroups')}.
                </span>
              </div>
            )}

            <footer className="cart-footer">
              <div className="cart-totals">
                <div className="cart-total-row">
                  <span>{t('cart.subtotal')} ({totals.unitCount} {t('cart.items')})</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 ? (
                  <div className="cart-total-row cart-total-discount">
                    <span>{t('cart.offerDiscount')} ({totals.offerGroups} × 3)</span>
                    <span>-{formatPrice(totals.discount)}</span>
                  </div>
                ) : (
                  <div className="cart-total-row cart-total-hint">
                    <span>{t('cart.offerDiscount')}</span>
                    <span>{t('cart.addMore')} {3 - (totals.unitCount % 3)} {t('cart.moreToSave')} {formatPrice(45)}</span>
                  </div>
                )}
                <div className="cart-total-row cart-total-grand">
                  <span>{t('cart.total')}</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>
              <button className="cart-checkout-btn" onClick={buyNow}>
                {t('cart.buyNow')}
                <ArrowRight size={16} strokeWidth={1.5} />
              </button>
              <button className="cart-continue-btn" onClick={continueShopping}>
                {t('cart.continueShopping')}
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};

export default CartDrawer;
