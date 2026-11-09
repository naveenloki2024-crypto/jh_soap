import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  User,
} from 'lucide-react';
import { useCart } from '../context/cart';
import { formatPrice, OFFER_GROUP_PRICE } from '../data/products';
import { createStripeCheckout, getStripeConfig } from '../api/payments';

import '../styles/Checkout.css';

const INITIAL_FORM = {
  fullName: '',
  mobile: '',
  alternateMobile: '',
  address: '',
  area: '',
  city: '',
  district: '',
  state: 'Tamil Nadu',
  pincode: '',
  landmark: '',
  notes: '',
};

const MOBILE_RE = /^[6-9]\d{9}$/;
const PIN_RE = /^[1-9]\d{5}$/;

const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

const normalizeMobile = (value) => {
  let digits = onlyDigits(value);
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
};

const sanitizeForm = (form) => ({
  fullName: form.fullName.trim(),
  mobile: normalizeMobile(form.mobile),
  alternateMobile: normalizeMobile(form.alternateMobile),
  address: form.address.trim(),
  area: form.area.trim(),
  city: form.city.trim(),
  district: form.district.trim(),
  state: form.state.trim() || 'Tamil Nadu',
  pincode: onlyDigits(form.pincode).slice(0, 6),
  landmark: form.landmark.trim(),
  notes: form.notes.trim(),
});

const allTouched = () =>
  Object.fromEntries(Object.keys(INITIAL_FORM).map((key) => [key, true]));

function validateForm(form) {
  const values = sanitizeForm(form);
  const errors = {};

  if (values.fullName.length < 2) errors.fullName = 'Please enter your full name.';
  if (!MOBILE_RE.test(values.mobile)) {
    errors.mobile = 'Enter a valid 10-digit mobile number.';
  }
  if (values.alternateMobile && !MOBILE_RE.test(values.alternateMobile)) {
    errors.alternateMobile = 'Enter a valid 10-digit number or leave it blank.';
  }
  if (!values.address) errors.address = 'Please enter your house no. / street.';
  if (!values.area) errors.area = 'Please enter your area / locality.';
  if (!values.city) errors.city = 'Please enter your city.';
  if (!values.district) errors.district = 'Please enter your district.';
  if (!values.state) errors.state = 'Please select your state.';
  if (!PIN_RE.test(values.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code.';

  return errors;
}

function FormField({
  label,
  name,
  value,
  error,
  touched,
  onChange,
  onBlur,
  required = false,
  hint,
  textarea = false,
  ...inputProps
}) {
  const showError = touched && error;
  const className = `checkout-input${showError ? ' has-error' : ''}`;

  return (
    <label className="checkout-field" htmlFor={`field-${name}`}>
      <span className="checkout-label">
        {label}
        {required ? (
          <span className="checkout-required" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="checkout-optional">optional</span>
        )}
      </span>
      {textarea ? (
        <textarea
          id={`field-${name}`}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={className}
          rows={3}
          {...inputProps}
        />
      ) : (
        <input
          id={`field-${name}`}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={className}
          {...inputProps}
        />
      )}
      {showError ? (
        <span className="checkout-error">{error}</span>
      ) : hint ? (
        <span className="checkout-hint">{hint}</span>
      ) : null}
    </label>
  );
}

const CheckoutPage = () => {
  const { cartItems, cartLines, totals, closeCheckout, openCart } = useCart();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [stripeConfig, setStripeConfig] = useState({
    enabled: false,
    paymentMethods: [],
    upiEnabled: false,
    loading: true,
  });
  const submittingRef = useRef(false);
  const formTopRef = useRef(null);
  const idempotencyKeyRef = useRef(null);

  useEffect(() => {
    let active = true;
    getStripeConfig()
      .then((config) => {
        if (!active) return;
        setStripeConfig({ ...config, loading: false });
      })
      .catch(() => {
        if (!active) return;
        setStripeConfig({
          enabled: false,
          paymentMethods: [],
          upiEnabled: false,
          loading: false,
        });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !submittingRef.current) {
        closeCheckout();
        openCart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeCheckout, openCart]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;
    if (name === 'mobile' || name === 'alternateMobile') {
      nextValue = normalizeMobile(value);
    } else if (name === 'pincode') {
      nextValue = onlyDigits(value).slice(0, 6);
    }
    const nextForm = { ...form, [name]: nextValue };

    setForm(nextForm);
    setSubmitError('');
    if (touched[name]) {
      setErrors(validateForm(nextForm));
    }
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validateForm(form));
  };

  const handleBackToCart = () => {
    closeCheckout();
    openCart();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const cleaned = sanitizeForm(form);
    setForm(cleaned);

    const nextErrors = validateForm(cleaned);
    setErrors(nextErrors);
    setTouched(allTouched());

    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Please fill in the required details correctly.');
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (cartItems.length === 0) {
      setSubmitError('Your cart is empty. Add a product before checking out.');
      return;
    }

    if (!stripeConfig.loading && !stripeConfig.enabled) {
      setSubmitError(
        'Online payment is not configured on the server. Please contact the store or try again later.',
      );
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    try {
      idempotencyKeyRef.current ||=
        globalThis.crypto?.randomUUID?.() ||
        `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const result = await createStripeCheckout(
        {
          customer: cleaned,
          items: cartItems.map((item) => ({ id: item.id, qty: item.qty })),
          idempotencyKey: idempotencyKeyRef.current,
        },
        { idempotencyKey: idempotencyKeyRef.current },
      );

      const checkoutUrl = result?.checkoutUrl || result?.session?.url || result?.url;
      if (!checkoutUrl) {
        throw new Error('Stripe did not return a checkout URL. Please try again.');
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      if (error.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...error.fieldErrors }));
        setTouched(allTouched());
      }
      setSubmitError(error.message || 'Could not start payment. Please try again.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const isEmpty = cartLines.length === 0;

  return (
    <div className="checkout-overlay" role="dialog" aria-modal="true" aria-label="Checkout">
      <div className="checkout-scroll">
        <header className="checkout-header">
          <button className="checkout-back" onClick={handleBackToCart}>
            <ArrowLeft size={16} strokeWidth={1.5} />
            Back to Cart
          </button>
          <div className="checkout-brand">
            <span className="checkout-brand-name">JH Soap</span>
            <span className="checkout-brand-tag">Secure Checkout</span>
          </div>
          <span className="checkout-header-spacer" aria-hidden="true" />
        </header>

        <div className="checkout-container">
          {isEmpty ? (
            <div className="checkout-empty">
              <span className="checkout-empty-icon">
                <ShoppingBag size={34} strokeWidth={1.25} />
              </span>
              <h2 className="checkout-empty-title">Your cart is empty</h2>
              <p className="checkout-empty-text">
                Add some handmade herbal soaps before checking out.
              </p>
              <button className="checkout-place-btn" onClick={handleBackToCart}>
                Back to Shop
              </button>
            </div>
          ) : (
            <>
              <div className="checkout-title-block">
                <span className="checkout-eyebrow">Almost there</span>
                <h1 className="checkout-heading">Customer Details</h1>
                <p className="checkout-subheading">
                  Enter your delivery details to complete your order.
                </p>
              </div>

              <form className="checkout-grid" onSubmit={handleSubmit} noValidate>
                <div className="checkout-form-card" ref={formTopRef}>
                  <section className="checkout-section">
                    <h2 className="checkout-section-title">
                      <User size={18} strokeWidth={1.5} />
                      Contact
                    </h2>
                    <div className="checkout-row two">
                      <FormField
                        label="Full Name"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.fullName}
                        touched={touched.fullName}
                        required
                        autoComplete="name"
                        placeholder="e.g. Janani Hariharan"
                      />
                      <FormField
                        label="Mobile Number"
                        name="mobile"
                        value={form.mobile}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.mobile}
                        touched={touched.mobile}
                        required
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="10-digit mobile number"
                      />
                    </div>
                    <div className="checkout-row one">
                      <FormField
                        label="Alternate Mobile Number"
                        name="alternateMobile"
                        value={form.alternateMobile}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.alternateMobile}
                        touched={touched.alternateMobile}
                        type="tel"
                        inputMode="numeric"
                        placeholder="Optional"
                      />
                    </div>
                  </section>

                  <section className="checkout-section">
                    <h2 className="checkout-section-title">
                      <MapPin size={18} strokeWidth={1.5} />
                      Delivery Address
                    </h2>
                    <div className="checkout-row one">
                      <FormField
                        label="House No. / Street Address"
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.address}
                        touched={touched.address}
                        required
                        autoComplete="street-address"
                        placeholder="House no., building, street"
                      />
                    </div>
                    <div className="checkout-row two">
                      <FormField
                        label="Area / Locality"
                        name="area"
                        value={form.area}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.area}
                        touched={touched.area}
                        required
                        placeholder="Area or locality"
                      />
                      <FormField
                        label="Landmark"
                        name="landmark"
                        value={form.landmark}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.landmark}
                        touched={touched.landmark}
                        placeholder="Nearby landmark"
                      />
                    </div>
                    <div className="checkout-row two">
                      <FormField
                        label="City"
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.city}
                        touched={touched.city}
                        required
                        autoComplete="address-level2"
                        placeholder="City"
                      />
                      <FormField
                        label="District"
                        name="district"
                        value={form.district}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.district}
                        touched={touched.district}
                        required
                        placeholder="District"
                      />
                    </div>
                    <div className="checkout-row two">
                      <FormField
                        label="State"
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.state}
                        touched={touched.state}
                        required
                        autoComplete="address-level1"
                        placeholder="State"
                      />
                      <FormField
                        label="PIN Code"
                        name="pincode"
                        value={form.pincode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.pincode}
                        touched={touched.pincode}
                        required
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="6-digit PIN code"
                      />
                    </div>
                  </section>

                  <section className="checkout-section">
                    <h2 className="checkout-section-title">
                      <FileText size={18} strokeWidth={1.5} />
                      Order Notes
                    </h2>
                    <div className="checkout-row one">
                      <FormField
                        label="Order Notes"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        textarea
                        placeholder="Any delivery instructions? (optional)"
                      />
                    </div>
                  </section>

                  <div className="checkout-submit">
                    {submitError && <p className="checkout-submit-error">{submitError}</p>}
                    <button
                      type="submit"
                      className="checkout-place-btn"
                      disabled={submitting}
                      aria-busy={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="checkout-spinner" size={18} strokeWidth={2} />
                          Redirecting to secure payment...
                        </>
                      ) : (
                        <>
                          Proceed to Payment &middot; {formatPrice(totals.total)}
                          <ArrowRight size={16} strokeWidth={1.5} />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="checkout-back-btn"
                      onClick={handleBackToCart}
                      disabled={submitting}
                    >
                      <ArrowLeft size={15} strokeWidth={1.5} />
                      Back to Cart
                    </button>
                  </div>
                </div>

                <aside className="checkout-summary-card">
                  <h2 className="checkout-section-title">
                    <ShoppingBag size={18} strokeWidth={1.5} />
                    Order Summary
                  </h2>
                  <ul className="checkout-summary-items">
                    {cartLines.map(({ product, qty }) => (
                      <li className="checkout-summary-item" key={product.id}>
                        <span className="checkout-summary-img">
                          <img src={product.image} alt={`${product.name} soap`} />
                        </span>
                        <span className="checkout-summary-info">
                          <span className="checkout-summary-name">{product.name}</span>
                          <span className="checkout-summary-meta">
                            {formatPrice(product.price)} &times; {qty}
                          </span>
                        </span>
                        <span className="checkout-summary-line">
                          {formatPrice(product.price * qty)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="checkout-summary-totals">
                    <div className="checkout-summary-row">
                      <span>Subtotal ({totals.unitCount} items)</span>
                      <span>{formatPrice(totals.subtotal)}</span>
                    </div>
                    {totals.discount > 0 ? (
                      <div className="checkout-summary-row checkout-summary-discount">
                        <span>
                          3-Soap Offer ({totals.offerGroups} &times; 3 for{' '}
                          {formatPrice(OFFER_GROUP_PRICE)})
                        </span>
                        <span>-{formatPrice(totals.discount)}</span>
                      </div>
                    ) : (
                      <div className="checkout-summary-row checkout-summary-hint">
                        <span>3-Soap Offer</span>
                        <span>
                          Add {3 - (totals.unitCount % 3)} more to save {formatPrice(45)}
                        </span>
                      </div>
                    )}
                    <div className="checkout-summary-row checkout-summary-grand">
                      <span>Total</span>
                      <span>{formatPrice(totals.total)}</span>
                    </div>
                  </div>
                  <p className="checkout-summary-note">
                    <ShieldCheck size={14} strokeWidth={1.5} aria-hidden="true" />
                    Prices include the automatic 3-soap offer. Payment is processed securely by
                    Stripe{stripeConfig.upiEnabled ? ' (cards and UPI accepted)' : ' (cards accepted)'}.
                    You will be redirected to Stripe to complete your payment.
                  </p>
                </aside>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
