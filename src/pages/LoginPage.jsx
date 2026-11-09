import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Smartphone } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { AuthField, PasswordField } from '../components/AuthField';
import FormAlert from '../components/FormAlert';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/auth';
import { friendlyAuthError, isUnverifiedEmailError } from '../utils/authErrors';
import { isValidEmail } from '../utils/authValidation';
import { getRedirectTarget } from '../utils/redirect';
import { useLanguage } from '../context/LanguageContext';

const INITIAL = { email: '', password: '' };

function validate(values) {
  const errors = {};
  if (!values.email.trim()) errors.email = 'Please enter your email address.';
  else if (!isValidEmail(values.email)) errors.email = 'Please enter a valid email address.';
  if (!values.password) errors.password = 'Please enter your password.';
  return errors;
}

const LoginPage = () => {
  const { signIn, resendVerification } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTo = getRedirectTarget(location.search);

  const [values, setValues] = useState(INITIAL);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState('idle');

  const justVerified = searchParams.get('verified') === '1';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setFormError('');
    setNeedsVerification(false);
    setResendState('idle');
    if (touched[name]) setErrors(validate({ ...values, [name]: value }));
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setTouched({ email: true, password: true });
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');
    setNeedsVerification(false);

    try {
      await signIn(values.email, values.password, remember);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(friendlyAuthError(error));
      setNeedsVerification(isUnverifiedEmailError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendState === 'sending') return;
    setResendState('sending');
    try {
      await resendVerification(values.email);
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  return (
    <AuthLayout
      eyebrow={t('auth.welcomeBack')}
      title={t('loginPage.title')}
      subtitle={t('loginPage.subtitle')}
      footer={
        <p>
          {t('loginPage.newToJH')}{' '}
          <Link className="auth-link" to="/register">
            {t('loginPage.createAccount')}
          </Link>
        </p>
      }
    >
      {justVerified && (
        <FormAlert variant="success">
          {t('loginPage.emailVerified')}
        </FormAlert>
      )}

      {formError && <FormAlert variant="error">{formError}</FormAlert>}

      {needsVerification && (
        <div className="auth-resend">
          {resendState === 'sent' ? (
            <FormAlert variant="success">{t('loginPage.verificationSent')}</FormAlert>
          ) : (
            <button
              type="button"
              className="auth-text-btn"
              onClick={handleResend}
              disabled={resendState === 'sending'}
            >
              {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
          {resendState === 'error' && (
            <FormAlert variant="error">{t('loginPage.resendError')}</FormAlert>
          )}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="login-email"
          name="email"
          label={t('loginPage.email')}
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          touched={touched.email}
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
        />

        <PasswordField
          id="login-password"
          name="password"
          label={t('loginPage.password')}
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          touched={touched.password}
          autoComplete="current-password"
          placeholder="Your password"
        />

        <div className="auth-row-between">
          <label className="auth-checkbox" htmlFor="login-remember">
            <input
              id="login-remember"
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>{t('loginPage.rememberMe')}</span>
          </label>
          <Link className="auth-link auth-link--sm" to="/forgot-password">
            {t('loginPage.forgotPassword')}
          </Link>
        </div>

        <button
          type="submit"
          className="auth-submit"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <Spinner />
              {t('loginPage.signingIn')}
            </>
          ) : (
            <>
              {t('loginPage.signIn')}
              <ArrowRight size={17} strokeWidth={1.75} aria-hidden="true" />
            </>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(56, 95, 42, 0.18)' }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-deep-olive)' }}>{t('loginPage.or')}</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(56, 95, 42, 0.18)' }} />
        </div>

        <Link
          to="/mobile-login"
          className="auth-submit"
          style={{ textDecoration: 'none', justifyContent: 'center' }}
        >
          <Smartphone size={17} strokeWidth={1.75} aria-hidden="true" />
          {t('loginPage.signInWithMobile')}
          <ArrowRight size={17} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
