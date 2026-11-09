import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { PasswordField } from '../components/AuthField';
import FormAlert from '../components/FormAlert';
import Spinner from '../components/Spinner';
import BrandLoader from '../components/BrandLoader';
import { useAuth } from '../context/auth';
import { friendlyAuthError } from '../utils/authErrors';
import { MIN_PASSWORD_LENGTH } from '../utils/authValidation';

const ResetPasswordPage = () => {
  const { status, user, updatePassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  if (status === 'loading') {
    return <BrandLoader label="Verifying your reset link" />;
  }

  if (!user && !resetToken) {
    return (
      <AuthLayout
        eyebrow="Reset password"
        title="This link is no longer valid"
        subtitle="Reset links expire quickly for your security."
        footer={
          <p>
            <Link className="auth-link" to="/login">
              Back to sign in
            </Link>
          </p>
        }
      >
        <FormAlert variant="error">
          Your password reset link is invalid or has expired. Please request a new one.
        </FormAlert>
        <Link className="auth-submit" to="/forgot-password">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  const validate = () => {
    const next = {};
    if (!password) next.password = 'Please choose a new password.';
    else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirmPassword) next.confirmPassword = 'Please confirm your new password.';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    setTouched({ password: true, confirmPassword: true });
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');
    try {
      if (resetToken) await resetPassword(resetToken, password);
      else await updatePassword(password);
      setDone(true);
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthLayout
        eyebrow="All set"
        title="Password updated"
        subtitle="Your password has been changed successfully."
      >
        <div className="auth-success">
          <span className="auth-success-icon" aria-hidden="true">
            <ShieldCheck size={34} strokeWidth={1.5} />
          </span>
          <p className="auth-success-text">
            You can now sign in with your new password, or continue where you left off.
          </p>
          <button type="button" className="auth-submit" onClick={() => navigate('/account', { replace: true })}>
            Go to my account
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="New password"
      title="Choose a new password"
      subtitle="Make it strong and memorable — at least 8 characters."
    >
      {formError && <FormAlert variant="error">{formError}</FormAlert>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <PasswordField
          id="reset-password"
          name="password"
          label="New password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFormError('');
            if (touched.password) setErrors(validate());
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, password: true }));
            setErrors(validate());
          }}
          error={errors.password}
          touched={touched.password}
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        />

        <PasswordField
          id="reset-confirm"
          name="confirmPassword"
          label="Confirm new password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFormError('');
            if (touched.confirmPassword) setErrors(validate());
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, confirmPassword: true }));
            setErrors(validate());
          }}
          error={errors.confirmPassword}
          touched={touched.confirmPassword}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
        />

        <button type="submit" className="auth-submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <Spinner />
              Updating password…
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
