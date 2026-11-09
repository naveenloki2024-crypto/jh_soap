import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, RefreshCw, ShoppingBag } from 'lucide-react';
import { fetchMyOrders } from '../api/account';
import { useProducts } from '../context/products';
import BrandLoader from '../components/BrandLoader';
import FormAlert from '../components/FormAlert';
import { formatPrice, PRODUCT_IMAGES } from '../data/products';
import { orderStatusMeta, formatOrderDay } from '../utils/orderStatus';

const OrdersPage = () => {
  const { productById } = useProducts();
  const [status, setStatus] = useState('loading');
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const imageFor = (item) => productById[item.id]?.image || PRODUCT_IMAGES[item.id] || '';

  const load = async () => {
    setStatus('loading');
    setError('');
    try {
      const list = await fetchMyOrders();
      setOrders(list);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Could not load your orders.');
      setStatus('error');
    }
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    load();
  }, []);

  if (status === 'loading') {
    return <BrandLoader fullscreen={false} label="Loading your orders" />;
  }

  return (
    <div className="account-panel">
      <header className="account-panel-head">
        <h1 className="account-panel-title">My orders</h1>
        <p className="account-panel-subtitle">Every order you&apos;ve placed with JH Soap.</p>
      </header>

      {status === 'error' && (
        <>
          <FormAlert variant="error">{error}</FormAlert>
          <button type="button" className="auth-submit auth-submit--outline" onClick={load}>
            <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
            Try again
          </button>
        </>
      )}

      {status === 'ready' && orders.length === 0 && (
        <div className="account-empty">
          <span className="account-empty-icon" aria-hidden="true">
            <ShoppingBag size={32} strokeWidth={1.25} />
          </span>
          <p className="account-empty-title">No orders yet</p>
          <p className="account-empty-text">
            When you place an order it will appear here with its status and details.
          </p>
          <Link className="auth-submit" to="/#shop">
            Start shopping
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      )}

      {status === 'ready' && orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => {
            const meta = orderStatusMeta(order.status);
            return (
              <li key={order.id}>
                <Link className="order-card" to={`/account/orders/${order.id}`}>
                  <div className="order-card-head">
                    <span className="order-card-number">
                      <Package size={16} strokeWidth={1.5} aria-hidden="true" />
                      {order.orderNumber}
                    </span>
                    <span className={`order-badge order-badge--${meta.tone}`}>{meta.label}</span>
                  </div>

                  <div className="order-card-meta">
                    <span>{formatOrderDay(order.createdAt)}</span>
                    <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                  </div>

                  <div className="order-card-body">
                    <div className="order-card-thumbs" aria-hidden="true">
                      {order.items.slice(0, 4).map((item) => {
                        const image = imageFor(item);
                        return image ? (
                          <span className="order-thumb" key={item.id || item.name}>
                            <img src={image} alt="" />
                          </span>
                        ) : (
                          <span className="order-thumb order-thumb--empty" key={item.id || item.name} />
                        );
                      })}
                      {order.items.length > 4 && (
                        <span className="order-thumb order-thumb--more">+{order.items.length - 4}</span>
                      )}
                    </div>
                    <span className="order-card-total">{formatPrice(order.pricing.total)}</span>
                  </div>

                  <span className="order-card-cta">
                    View details
                    <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default OrdersPage;
