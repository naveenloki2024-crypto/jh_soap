import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import { retryStripeCheckout } from '../api/payments';
import { useCart } from '../context/cart';
import '../styles/Checkout.css';

const CheckoutCancelPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const navigate = useNavigate();
  const { openCart } = useCart();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  const handleRetry = async () => {
    if (!sessionId || retrying) return;
    setRetrying(true);
    setError('');

    try {
      const result = await retryStripeCheckout(sessionId);
      if (result?.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      if (result?.paid) {
        window.location.assign(
          `/checkout/success?session_id=${encodeURIComponent(sessionId)}`,
        );
        return;
      }
      setError('This payment session has ended. Please return to the cart to start again.');
    } catch (err) {
      setError(err.message || 'Could not resume payment. Please return to the cart.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <main className="checkout-result-page">
      <div className="checkout-container">
        <div className="checkout-empty">
          <span className="checkout-empty-icon checkout-empty-icon--alert">
            <XCircle size={34} strokeWidth={1.25} />
          </span>
          <h1 className="checkout-empty-title">Payment cancelled</h1>
          <p className="checkout-empty-text">
            Your payment was not completed and no money has been charged. Your cart is still
            saved.
          </p>
          {error && <p className="checkout-submit-error">{error}</p>}
          <div className="checkout-result-actions">
            <button
              type="button"
              className="checkout-place-btn"
              onClick={handleRetry}
              disabled={retrying || !sessionId}
            >
              {retrying ? (
                <>
                  <Loader2 className="checkout-spinner" size={17} strokeWidth={2} />
                  Restarting payment...
                </>
              ) : (
                'Try payment again'
              )}
            </button>
            <button
              type="button"
              className="checkout-back-btn"
              onClick={() => {
                navigate('/');
                window.setTimeout(openCart, 0);
              }}
            >
              Back to cart
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CheckoutCancelPage;
