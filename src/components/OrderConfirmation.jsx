import { CheckCircle2, MapPin, Phone, User, ArrowRight, Package } from 'lucide-react';
import { SOAP_BY_ID, formatPrice } from '../data/products';
import { useProducts } from '../context/products';

const formatDate = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const OrderConfirmation = ({ order, onContinueShopping }) => {
  const { productById } = useProducts();
  const { customer, items, pricing } = order;

  const imageFor = (item) => (productById[item.id] || SOAP_BY_ID[item.id])?.image;

  return (
    <div className="checkout-confirmation">
      <div className="confirmation-hero">
        <span className="confirmation-icon">
          <CheckCircle2 size={40} strokeWidth={1.5} />
        </span>
        <h1 className="confirmation-title">Order Placed Successfully</h1>
        <p className="confirmation-subtitle">
          Thank you, {customer.fullName.split(' ')[0]}! Your order has been received and saved.
        </p>
        <div className="confirmation-id">
          <span className="confirmation-id-label">Order ID</span>
          <span className="confirmation-id-value">{order.orderNumber}</span>
        </div>
        <p className="confirmation-date">Placed on {formatDate(order.createdAt)}</p>
      </div>

      <div className="confirmation-grid">
        <section className="confirmation-card">
          <h2 className="confirmation-card-title">
            <Package size={18} strokeWidth={1.5} />
            Your Order
          </h2>
          <ul className="confirmation-items">
            {items.map((item) => (
              <li className="confirmation-item" key={item.id}>
                <span className="confirmation-item-img">
                  <img src={imageFor(item)} alt={`${item.name} soap`} />
                </span>
                <span className="confirmation-item-info">
                  <span className="confirmation-item-name">{item.name}</span>
                  <span className="confirmation-item-qty">
                    {item.qty} &times; {formatPrice(item.unitPrice)}
                  </span>
                </span>
                <span className="confirmation-item-total">{formatPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="confirmation-totals">
            <div className="confirmation-total-row">
              <span>Subtotal</span>
              <span>{formatPrice(pricing.subtotal)}</span>
            </div>
            {pricing.offerDiscount > 0 && (
              <div className="confirmation-total-row confirmation-total-discount">
                <span>3-Soap Offer Discount</span>
                <span>-{formatPrice(pricing.offerDiscount)}</span>
              </div>
            )}
            {pricing.couponDiscount > 0 && (
              <div className="confirmation-total-row confirmation-total-discount">
                <span>Coupon{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                <span>-{formatPrice(pricing.couponDiscount)}</span>
              </div>
            )}
            <div className="confirmation-total-row confirmation-total-grand">
              <span>Total Paid</span>
              <span>{formatPrice(pricing.total)}</span>
            </div>
          </div>
        </section>

        <section className="confirmation-card">
          <h2 className="confirmation-card-title">
            <MapPin size={18} strokeWidth={1.5} />
            Delivery Details
          </h2>
          <ul className="confirmation-details">
            <li>
              <User size={15} strokeWidth={1.5} />
              <span>{customer.fullName}</span>
            </li>
            <li>
              <Phone size={15} strokeWidth={1.5} />
              <span>
                {customer.mobile}
                {customer.alternateMobile ? ` / ${customer.alternateMobile}` : ''}
              </span>
            </li>
            <li>
              <MapPin size={15} strokeWidth={1.5} />
              <span>
                {customer.address}, {customer.area}
                {customer.landmark ? `, near ${customer.landmark}` : ''}
                <br />
                {customer.city}, {customer.district}, {customer.state} - {customer.pincode}
              </span>
            </li>
          </ul>
          {customer.notes && (
            <p className="confirmation-notes">
              <strong>Order notes:</strong> {customer.notes}
            </p>
          )}
        </section>
      </div>

      <button className="checkout-continue-btn" onClick={onContinueShopping}>
        Continue Shopping
        <ArrowRight size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
};

export default OrderConfirmation;
