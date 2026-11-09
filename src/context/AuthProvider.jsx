import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './auth';
import { fetchMyProfile, updateMyProfile } from '../api/account';
import {
  requestPasswordReset as requestResetEmail,
  requestPhoneOtp,
  requestSession,
  resendVerificationEmail,
  resetPassword as resetPasswordWithToken,
  signInAdminWithPassword,
  signInWithPassword,
  signOutSession,
  signUpWithPassword,
  updatePassword as updatePasswordRequest,
  verifyPhoneOtp as verifyPhoneOtpRequest,
} from '../api/auth';

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState('idle');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await requestSession();
        if (active) setSession(data.session ?? null);
      } catch {
        if (active) setSession(null);
      } finally {
        if (active) setStatus('ready');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const sessionRole = session?.user?.role;

  useEffect(() => {
    if (!session?.user || sessionRole !== 'customer') {
      setProfile(null);
      setProfileStatus('idle');
      return undefined;
    }

    let active = true;
    setProfileStatus('loading');
    (async () => {
      try {
        const loaded = await fetchMyProfile();
        if (active) {
          setProfile(loaded);
          setProfileStatus('ready');
        }
      } catch {
        if (active) {
          setProfile(null);
          setProfileStatus('error');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [session?.user?.id, sessionRole]);

  const signIn = useCallback(async (email, password, remember = true) => {
    const data = await signInWithPassword({ email: String(email).trim(), password, remember });
    setSession(data.session ?? null);
    return data;
  }, []);

  const signInAdmin = useCallback(async (email, password, remember = true) => {
    const data = await signInAdminWithPassword({
      email: String(email).trim(),
      password,
      remember,
    });
    setSession(data.session ?? null);
    return data;
  }, []);

  const signInWithPhone = useCallback(async (phone) => {
    return requestPhoneOtp({ phone });
  }, []);

  const verifyPhoneOtp = useCallback(async (phone, token, remember = true) => {
    const data = await verifyPhoneOtpRequest({ phone, token, remember });
    setSession(data.session ?? null);
    return data;
  }, []);

  const resendPhoneOtp = useCallback(async (phone) => {
    return requestPhoneOtp({ phone });
  }, []);

  const signUp = useCallback(async ({ email, password, fullName }) => {
    const data = await signUpWithPassword({
      email: String(email).trim(),
      password,
      fullName: String(fullName).trim(),
    });
    setSession(data.session ?? null);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutSession();
    } finally {
      setSession(null);
      setProfile(null);
    }
  }, []);

  const resendVerification = useCallback(async (email) => {
    return resendVerificationEmail(email);
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    return requestResetEmail(String(email).trim());
  }, []);

  const updatePassword = useCallback(async (password) => {
    return updatePasswordRequest({ password });
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    const data = await resetPasswordWithToken({ token, password });
    setSession(data.session ?? null);
    return data;
  }, []);

  const refreshProfile = useCallback(async () => {
    const loaded = await fetchMyProfile();
    setProfile(loaded);
    return loaded;
  }, []);

  const updateProfile = useCallback(async (values) => {
    const updated = await updateMyProfile(values);
    setProfile(updated);
    return updated;
  }, []);

  const user = session?.user ?? null;

  const value = useMemo(
    () => ({
      status,
      session,
      user,
      isAuthenticated: Boolean(user),
      emailVerified: Boolean(user?.email_confirmed_at || user?.confirmed_at),
      profile,
      profileStatus,
      displayName:
        profile?.fullName ||
        user?.user_metadata?.full_name ||
        (user?.email ? user.email.split('@')[0] : user?.phone || ''),
      signIn,
      signInAdmin,
      signInWithPhone,
      verifyPhoneOtp,
      resendPhoneOtp,
      signUp,
      signOut,
      resendVerification,
      requestPasswordReset,
      updatePassword,
      resetPassword,
      refreshProfile,
      updateProfile,
    }),
    [
      status,
      session,
      user,
      profile,
      profileStatus,
      signIn,
      signInAdmin,
      signInWithPhone,
      verifyPhoneOtp,
      resendPhoneOtp,
      signUp,
      signOut,
      resendVerification,
      requestPasswordReset,
      updatePassword,
      resetPassword,
      refreshProfile,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
