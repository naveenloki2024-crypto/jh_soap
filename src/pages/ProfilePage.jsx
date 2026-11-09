import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MailWarning, Save } from 'lucide-react';
import { useAuth } from '../context/auth';
import { AuthField } from '../components/AuthField';
import FormAlert from '../components/FormAlert';
import Spinner from '../components/Spinner';
import BrandLoader from '../components/BrandLoader';
import { formatOrderDay } from '../utils/orderStatus';

const EMPTY = { fullName: '', phone: '', avatarUrl: '' };

function validate(values) {
  const errors = {};
  if (values.fullName.trim().length < 1) errors.fullName = 'Please enter your full name.';
  if (values.phone.trim()) {
    const digits = values.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(digits)) errors.phone = 'Enter a valid 10-digit mobile number.';
  }
  if (values.avatarUrl.trim() && !/^(https?:\/\/|\/)/i.test(values.avatarUrl.trim())) {
    errors.avatarUrl = 'Avatar URL must start with http(s):// or "/".';
  }
  return errors;
}

const ProfilePage = () => {
  const { user, profile, profileStatus, updateProfile, resendVerification, emailVerified } = useAuth();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [resendState, setResendState] = useState('idle');

  useEffect(() => {
    if (profile) {
      setValues((prev) => {
        const next = {
          fullName: profile.fullName || '',
          phone: profile.phone || '',
          avatarUrl: profile.avatarUrl || '',
        };
        if (
          prev.fullName === next.fullName &&
          prev.phone === next.phone &&
          prev.avatarUrl === next.avatarUrl
        ) {
          return prev;
        }
        return next;
      });
    }
  }, [profile]);

  if (profileStatus === 'loading' && !profile) {
    return <BrandLoader fullscreen={false} label="Loading your profile" />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
    setFormError('');
    if (touched[name]) setErrors(validate({ ...values, [name]: value }));
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setTouched({ fullName: true, phone: true, avatarUrl: true });
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setFormError('');
    setSaved(false);
    try {
      await updateProfile({
        fullName: values.fullName.trim(),
        phone: values.phone.trim() || null,
        avatarUrl: values.avatarUrl.trim() || null,
      });
      setSaved(true);
    } catch (error) {
      setFormError(error.message || 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (!user?.email || resendState === 'sending') return;
    setResendState('sending');
    try {
      await resendVerification(user.email);
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  return (
    <div className="account-panel">
      <header className="account-panel-head">
        <h1 className="account-panel-title">My profile</h1>
        <p className="account-panel-subtitle">Manage your personal details and delivery contact.</p>
      </header>

      {!emailVerified && (
        <div className="account-verify-banner">
          <MailWarning size={18} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <p className="account-verify-title">Your email isn&apos;t verified yet</p>
            <p className="account-verify-text">
              Verify <strong>{user?.email}</strong> to secure your account.
            </p>
            {resendState === 'sent' ? (
              <span className="account-verify-ok">Verification email sent.</span>
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
          </div>
        </div>
      )}

      {saved && <FormAlert variant="success">Your profile has been updated.</FormAlert>}
      {formError && <FormAlert variant="error">{formError}</FormAlert>}

      <form className="auth-form auth-form--account" onSubmit={handleSubmit} noValidate>
        <AuthField
          id="profile-name"
          name="fullName"
          label="Full name"
          value={values.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.fullName}
          touched={touched.fullName}
          autoComplete="name"
          placeholder="Your full name"
        />

        <AuthField
          id="profile-email"
          name="email"
          label="Email address"
          type="email"
          value={user?.email || ''}
          readOnly
          disabled
          onChange={() => {}}
          required={false}
          hint="Your email is used to sign in and can't be changed here."
        />

        <AuthField
          id="profile-phone"
          name="phone"
          label="Mobile number"
          type="tel"
          value={values.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.phone}
          touched={touched.phone}
          autoComplete="tel"
          inputMode="numeric"
          maxLength={10}
          required={false}
          placeholder="10-digit mobile number"
          hint="Used to prefill checkout and contact you about orders."
        />

        <AuthField
          id="profile-avatar"
          name="avatarUrl"
          label="Avatar URL"
          value={values.avatarUrl}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.avatarUrl}
          touched={touched.avatarUrl}
          required={false}
          placeholder="https://…/photo.jpg"
          hint="Optional link to a profile photo."
        />

        <div className="account-panel-actions">
          <button type="submit" className="auth-submit" disabled={saving} aria-busy={saving}>
            {saving ? (
              <>
                <Spinner />
                Saving…
              </>
            ) : (
              <>
                <Save size={16} strokeWidth={1.75} aria-hidden="true" />
                Save changes
              </>
            )}
          </button>
          <Link className="auth-link" to="/account/orders">
            View my orders
            <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </form>

      {profile?.createdAt && (
        <p className="account-meta">Member since {formatOrderDay(profile.createdAt)}</p>
      )}
    </div>
  );
};

export default ProfilePage;
