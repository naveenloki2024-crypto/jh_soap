import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import { retryStripeCheckout, verifyStripeSession } from '../api/payments';
import { useCart } from '../context/cart';
import BrandLoader from '../components/BrandLoader';
import OrderConfirmation from '../components/OrderConfirmation';
import '../styles/Checkout.css';

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const [status, setStatus] = useState(sessionId ? 'verifying' : 'error');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(
    sessionId ? '' : 'The payment session id is missing from this link.',
  );
  const [retrying, setRetrying] = useState(false);
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return undefined;

    let active = true;

    verifyStripeSession(sessionId)
      .then((result) => {
        if (!active) return;
        const verifiedOrder = result?.order || null;
        setOrder(verifiedOrder);

        if (verifiedOrder?.paymentStatus === 'paid') {
          setStatus('paid');
          if (!clearedRef.current) {
            clearCart();
            clearedRef.current = true;
          }
          return;
        }

        if (['failed', 'refunded'].includes(verifiedOrder?.paymentStatus)) {
          setStatus('failed');
          return;
        }

        setStatus('pending');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'We could not verify this payment. Please contact support.');
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [sessionId, clearCart]);

  const handleRetry = async () => {
    if (!sessionId || retrying) return;
    setRetrying(true);
    setError('');

    try {
      const result = await retryStripeCheckout(sessionId);
      if (result?.paid) {
        setOrder(result.order || null);
        setStatus('paid');
        if (!clearedRef.current) {
          clearCart();
          clearedRef.current = true;
        }
        return;
      }
      if (result?.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Could not restart payment. Please try again.');
      setStatus('error');
    } finally {
      setRetrying(false);
    }
  };

  if (status === 'verifying') {
    return (
      <main className="checkout-result-page">
        <BrandLoader fullscreen={false} label="Confirming your payment" />
      </main>
    );
  }

  if (status === 'paid' && order) {
    return (
      <main className="checkout-result-page">
        <div className="checkout-container">
          <OrderConfirmation order={order} onContinueShopping={() => navigate('/#shop')} />
        </div>
      </main>
    );
  }

  const isPending = status === 'pending';
  const Icon = isPending ? Clock : AlertCircle;

  return (
    <main className="checkout-result-page">
      <div className="checkout-container">
        <div className="checkout-empty">
          <span className={`checkout-empty-icon${isPending ? '' : ' checkout-empty-icon--alert'}`}>
            <Icon size={34} strokeWidth={1.25} />
          </span>
          <h1 className="checkout-empty-title">
            {isPending ? 'Payment is being confirmed' : 'Payment could not be confirmed'}
          </h1>
          <p className="checkout-empty-text">
            {isPending
              ? 'Your payment was submitted and is still processing. This page will show your confirmation once Stripe reports a successful payment.'
              : error ||
                'The payment was not completed. Your cart is still saved, so you can try again.'}
          </p>
          {order?.orderNumber && (
            <p className="checkout-result-reference">Order reference: {order.orderNumber}</p>
          )}
          <div className="checkout-result-actions">
            {!isPending && (
              <button
                type="button"
                className="checkout-place-btn"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? (
                  <>
                    <Loader2 className="checkout-spinner" size={17} strokeWidth={2} />
                    Checking payment...
                  </>
                ) : (
                  'Try payment again'
                )}
              </button>
            )}
            <button
              type="button"
              className="checkout-back-btn"
              onClick={() => navigate('/#shop')}
            >
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CheckoutSuccessPage;
