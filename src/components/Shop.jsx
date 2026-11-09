import { useState } from 'react';
import '../styles/Shop.css';
import { ShoppingCart, Minus, Plus, BadgePercent, Loader2, RefreshCw } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import BestValue from './BestValue';
import { formatPrice, OFFER_GROUP_PRICE } from '../data/products';
import { waMessageLink } from '../config';
import { useCart } from '../context/cart';
import { useProducts } from '../context/products';
import { useLanguage } from '../context/LanguageContext';

const FILTERS = ['All', 'Herbal', 'Deep Clean', 'Skincare', 'Nourish'];

const waOrderLink = (soap) =>
  waMessageLink(
    `Hi JH Soap! I would like to order "${soap.name}" (${formatPrice(soap.price)}) from your herbal soaps collection.`,
  );

const Shop = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const { addItem, incrementItem, decrementItem, qtyById } = useCart();
  const { products, status, reload } = useProducts();
  const { t } = useLanguage();

  const visibleSoaps =
    activeFilter === 'All' ? products : products.filter((soap) => soap.category === activeFilter);

  const getFilterLabel = (filter) => {
    if (filter === 'All') return t('shop.filterAll');
    if (filter === 'Herbal') return t('shop.filterHerbal');
    if (filter === 'Deep Clean') return t('shop.filterDeepClean');
    if (filter === 'Skincare') return t('shop.filterSkincare');
    if (filter === 'Nourish') return t('shop.filterNourish');
    return filter;
  };

  const getProductName = (soap) => {
    const key = soap.id === 'aavarampoo' ? 'aavarampoo' : soap.id;
    return t(`products.${key}.name`) !== `products.${key}.name` ? t(`products.${key}.name`) : soap.name;
  };

  const getProductDesc = (soap) => {
    const key = soap.id === 'aavarampoo' ? 'aavarampoo' : soap.id;
    return t(`products.${key}.desc`) !== `products.${key}.desc` ? t(`products.${key}.desc`) : soap.description;
  };

  return (
    <section className="shop-section" id="shop">
      <div className="shop-container">
        <div className="shop-header">
          <span className="shop-eyebrow">{t('shop.eyebrow')}</span>
          <h2 className="shop-heading">{t('shop.heading')}</h2>
          <p className="shop-description">
            {t('shop.description')}
          </p>
        </div>

        <div className="shop-offer-strip">
          <BadgePercent size={18} strokeWidth={1.5} />
          <span>
            {t('shop.offer')} <strong>{formatPrice(OFFER_GROUP_PRICE)}</strong> — {t('shop.autoApplied')}
          </span>
        </div>

        {status === 'error' && (
          <div className="shop-notice" role="status">
            <span>
              {t('shop.errorMsg')}
            </span>
            <button className="shop-notice-btn" onClick={reload}>
              <RefreshCw size={14} strokeWidth={1.75} />
              {t('shop.retry')}
            </button>
          </div>
        )}

        <div className="shop-filters" role="group" aria-label="Filter soaps by category">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              className={`filter-chip${activeFilter === filter ? ' active' : ''}`}
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
            >
              {getFilterLabel(filter)}
            </button>
          ))}
        </div>

        {status === 'loading' && products.length === 0 ? (
          <div className="shop-state" role="status" aria-live="polite">
            <Loader2 className="shop-state-spinner" size={26} strokeWidth={1.5} />
            <p className="shop-state-text">{t('shop.loading')}</p>
          </div>
        ) : visibleSoaps.length === 0 ? (
          <div className="shop-state" role="status">
            <p className="shop-state-text">
              {t('shop.noSoaps')}
            </p>
          </div>
        ) : (
          <div className="shop-grid">
            {visibleSoaps.map((soap) => (
            <article className="soap-card" key={soap.id}>
              <div className="soap-img-wrap">
                <img
                  src={soap.image}
                  alt={`${getProductName(soap)} soap`}
                  className="soap-product-image"
                  loading="lazy"
                />
                <span className="soap-category">{getFilterLabel(soap.category)}</span>
              </div>
              <div className="soap-body">
                <h3 className="soap-name">{getProductName(soap)}</h3>
                <p className="soap-desc">{getProductDesc(soap)}</p>
                <div className="soap-price-row">
                  <span className="soap-price">{formatPrice(soap.price)}</span>
                  <span className="soap-unit">{t('shop.perSoap')}</span>
                </div>
                <div className="soap-controls">
                  {qtyById[soap.id] ? (
                    <div className="qty-stepper" aria-label={`Quantity of ${getProductName(soap)} in cart`}>
                      <button
                        className="qty-btn"
                        onClick={() => decrementItem(soap.id)}
                        disabled={qtyById[soap.id] <= 1}
                        aria-label={`Decrease quantity of ${getProductName(soap)}`}
                      >
                        <Minus size={14} strokeWidth={1.5} />
                      </button>
                      <span className="qty-value">{qtyById[soap.id]}</span>
                      <button
                        className="qty-btn"
                        onClick={() => incrementItem(soap.id)}
                        aria-label={`Increase quantity of ${getProductName(soap)}`}
                      >
                        <Plus size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="add-btn"
                      onClick={() => addItem(soap.id)}
                      aria-label={`Add ${getProductName(soap)} to cart`}
                    >
                      <ShoppingCart size={16} strokeWidth={1.5} />
                      <span>{t('shop.addToCart')}</span>
                    </button>
                  )}
                </div>
                <a
                  className="soap-wa-link"
                  href={waOrderLink(soap)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Order ${getProductName(soap)} on WhatsApp`}
                >
                  <WhatsAppIcon size={12} />
                  <span>{t('shop.orderViaWhatsapp')}</span>
                </a>
              </div>
            </article>
          ))}

            <BestValue />
          </div>
        )}
      </div>
    </section>
  );
};

export default Shop;
