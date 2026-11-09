import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clipboard, MapPin, Package, Phone, User } from 'lucide-react';
import { fetchMyOrder } from '../api/account';
import { useProducts } from '../context/products';
import BrandLoader from '../components/BrandLoader';
import FormAlert from '../components/FormAlert';
import { formatPrice, PRODUCT_IMAGES } from '../data/products';
import { orderStatusMeta, formatOrderDate, PAYMENT_LABEL } from '../utils/orderStatus';

const OrderDetailPage = () => {
  const { id } = useParams();
  const { productById } = useProducts();
  const [status, setStatus] = useState('loading');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setStatus('loading');
      setError('');
      try {
        const found = await fetchMyOrder(id);
        if (!active) return;
        setOrder(found);
        setStatus('ready');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Could not load this order.');
        setStatus(err.status === 404 ? 'missing' : 'error');
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (status === 'loading') {
    return <BrandLoader fullscreen={false} label="Loading order" />;
  }

  if (status === 'missing') {
    return (
      <div className="account-panel">
        <Link className="account-back" to="/account/orders">
          <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
          Back to orders
        </Link>
        <div className="account-empty">
          <p className="account-empty-title">Order not found</p>
          <p className="account-empty-text">
            We couldn&apos;t find this order on your account.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="account-panel">
        <Link className="account-back" to="/account/orders">
          <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
          Back to orders
        </Link>
        <FormAlert variant="error">{error}</FormAlert>
      </div>
    );
  }

  const meta = orderStatusMeta(order.status);
  const imageFor = (item) => productById[item.id]?.image || PRODUCT_IMAGES[item.id] || '';
  const { customer, pricing } = order;

  return (
    <div className="account-panel">
      <Link className="account-back" to="/account/orders">
        <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
        Back to orders
      </Link>

      <header className="order-detail-head">
        <div>
          <span className="account-panel-subtitle">Order</span>
          <h1 className="account-panel-title">{order.orderNumber}</h1>
          <p className="account-panel-subtitle">Placed on {formatOrderDate(order.createdAt)}</p>
        </div>
        <span className={`order-badge order-badge--${meta.tone}`}>{meta.label}</span>
      </header>

      <div className="order-detail-grid">
        <section className="account-card">
          <h2 className="account-card-title">
            <Package size={17} strokeWidth={1.5} aria-hidden="true" />
            Items
          </h2>
          <ul className="order-detail-items">
            {order.items.map((item) => {
              const image = imageFor(item);
              return (
                <li className="order-detail-item" key={item.id || item.name}>
                  <span className="order-detail-img">
                    {image ? <img src={image} alt="" /> : null}
                  </span>
                  <span className="order-detail-info">
                    <span className="order-detail-name">{item.name}</span>
                    <span className="order-detail-qty">
                      {formatPrice(item.unitPrice)} &times; {item.qty}
                    </span>
                  </span>
                  <span className="order-detail-line">{formatPrice(item.lineTotal)}</span>
                </li>
              );
            })}
          </ul>

          <div className="order-detail-totals">
            <div className="order-detail-row">
              <span>Subtotal</span>
              <span>{formatPrice(pricing.subtotal)}</span>
            </div>
            {pricing.offerDiscount > 0 && (
              <div className="order-detail-row order-detail-row--discount">
                <span>3-Soap Offer</span>
                <span>-{formatPrice(pricing.offerDiscount)}</span>
              </div>
            )}
            {pricing.couponDiscount > 0 && (
              <div className="order-detail-row order-detail-row--discount">
                <span>Coupon{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                <span>-{formatPrice(pricing.couponDiscount)}</span>
              </div>
            )}
            <div className="order-detail-row order-detail-row--grand">
              <span>Total</span>
              <span>{formatPrice(pricing.total)}</span>
            </div>
            <p className="order-detail-payment">{PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus}</p>
          </div>
        </section>

        <section className="account-card">
          <h2 className="account-card-title">
            <Clipboard size={17} strokeWidth={1.5} aria-hidden="true" />
            Delivery details
          </h2>
          <ul className="order-detail-details">
            <li>
              <User size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>{customer.fullName}</span>
            </li>
            <li>
              <Phone size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>
                {customer.mobile}
                {customer.alternateMobile ? ` / ${customer.alternateMobile}` : ''}
              </span>
            </li>
            <li>
              <MapPin size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>
                {customer.address}, {customer.area}
                {customer.landmark ? `, near ${customer.landmark}` : ''}
                <br />
                {customer.city}, {customer.district}, {customer.state} - {customer.pincode}
              </span>
            </li>
          </ul>
          {customer.notes && <p className="order-detail-notes">Note: {customer.notes}</p>}
        </section>
      </div>
    </div>
  );
};

export default OrderDetailPage;
