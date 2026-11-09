import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Phone, KeyRound } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import FormAlert from './FormAlert';
import Spinner from './Spinner';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/LanguageContext';
import { getRedirectTarget } from '../utils/redirect';

const MobileOtpLogin = () => {
  const { signInWithPhone, verifyPhoneOtp, resendPhoneOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const redirectTo = getRedirectTarget(location.search);

  const [step, setStep] = useState('phone'); // phone or otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const validatePhone = (phoneNumber) => {
    // Indian mobile number validation (10 digits starting with 6-9)
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      return true;
    }
    return false;
  };

  const formatPhone = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return `+91${cleaned}`;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validatePhone(phone)) {
      setError(t('auth.invalidPhone'));
      return;
    }

    setLoading(true);
    try {
      await signInWithPhone(formatPhone(phone));
      setStep('otp');
      setResendTimer(60);
      setOtp('');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError(t('auth.invalidOtp'));
      return;
    }

    setLoading(true);
    try {
      await verifyPhoneOtp(formatPhone(phone), otp);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      await resendPhoneOtp(formatPhone(phone));
      setResendTimer(60);
      setOtp('');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setOtp('');
    setError('');
  };

  return (
    <AuthLayout
      eyebrow={t('auth.welcomeBack')}
      title={step === 'phone' ? t('auth.mobileLoginTitle') : t('auth.verifyOtp')}
      subtitle={step === 'phone' ? t('auth.mobileLoginSubtitle') : `${t('auth.verifyOtpSubtitle')} +91 ${phone}`}
      footer={
        <p>
          <Link className="auth-link" to="/login">
            {t('loginPage.signIn')} ({t('loginPage.email')})
          </Link>
        </p>
      }
    >
      {error && <FormAlert variant="error">{error}</FormAlert>}

      {step === 'phone' && (
        <form className="auth-form" onSubmit={handleSendOtp} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="mobile-phone">
              {t('auth.phoneNumber')}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ 
                padding: '0.75rem 0.875rem', 
                background: 'rgba(100, 124, 55, 0.08)', 
                borderRadius: '12px',
                border: '1px solid rgba(56, 95, 42, 0.18)',
                color: 'var(--color-forest-green)',
                fontWeight: '500'
              }}>
                +91
              </div>
              <input
                id="mobile-phone"
                type="tel"
                className="auth-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                maxLength={10}
                inputMode="tel"
                autoComplete="tel"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || phone.length !== 10}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Spinner />
                {t('auth.sendingOtp')}
              </>
            ) : (
              <>
                <Phone size={17} strokeWidth={1.75} aria-hidden="true" />
                {t('auth.sendOtp')}
                <ArrowRight size={17} strokeWidth={1.75} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form className="auth-form" onSubmit={handleVerifyOtp} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="otp-input">
              {t('auth.verifyOtp')}
            </label>
            <input
              id="otp-input"
              type="text"
              className="auth-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.5rem' }}
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || otp.length !== 6}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Spinner />
                {t('auth.verifying')}
              </>
            ) : (
              <>
                <KeyRound size={17} strokeWidth={1.75} aria-hidden="true" />
                {t('auth.verifyOtp')}
                <ArrowRight size={17} strokeWidth={1.75} aria-hidden="true" />
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-deep-olive)' }}>
              {t('auth.didntReceive')}{' '}
              {resendTimer > 0 ? (
                <span>{t('auth.resendIn')} {resendTimer}{t('auth.seconds')}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendTimer > 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-natural-leaf)',
                    fontWeight: '600',
                    cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline',
                    opacity: resendTimer > 0 ? 0.6 : 1
                  }}
                >
                  {t('auth.resendOtp')}
                </button>
              )}
            </p>
            <button
              type="button"
              onClick={handleChangeNumber}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-forest-green)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {t('auth.changeNumber')}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default MobileOtpLogin;
