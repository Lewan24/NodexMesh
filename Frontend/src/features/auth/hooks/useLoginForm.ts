import { translate } from '@/shared/i18n';
import { authService } from '@/app/services';
import { errorMessage } from '@/shared/api/errors';
import { useEffect, useState } from 'react';

import type { FormEvent } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';

export type LoginMode = 'login' | 'register' | 'forgot' | 'resend' | 'reset' | 'confirming';

function initialAction() {
  const query = new URLSearchParams(window.location.search);
  const action = query.get('action');
  return {
    mode:
      action === 'reset-password' ? ('reset' as const) : action === 'confirm-email' ? ('confirming' as const) : null,
    userId: query.get('userId') ?? '',
    token: query.get('token') ?? '',
  };
}

export function useLoginForm() {
  const { login } = useAuth();
  const [action] = useState(initialAction);
  const [mode, setModeState] = useState<LoginMode>(action.mode ?? 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [acceptSecurityNotice, setAcceptSecurityNotice] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(action.mode === 'confirming');
  const [registrationAvailable, setRegistrationAvailable] = useState(true);

  const setMode = (next: LoginMode) => {
    setModeState(next);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  useEffect(() => {
    void authService
      .registrationAvailable()
      .then(setRegistrationAvailable)
      .catch(() => setRegistrationAvailable(true));
  }, []);

  useEffect(() => {
    if (action.mode !== 'confirming') return;
    if (!action.userId || !action.token) {
      setError(translate('The confirmation link is invalid or expired.'));
      setSubmitting(false);
      return;
    }
    void authService
      .confirmEmail(action.userId, action.token)
      .then(() => {
        window.history.replaceState({}, '', window.location.pathname);
        setModeState('login');
        setMessage(translate('Email confirmed. You can now sign in.'));
      })
      .catch((cause) => setError(errorMessage(cause)))
      .finally(() => setSubmitting(false));
  }, [action]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || mode === 'confirming') return;
    setError('');
    setMessage('');

    if (mode === 'forgot' || mode === 'resend') {
      if (!username.trim()) {
        setError(translate('Enter your email address.'));
        return;
      }
      setSubmitting(true);
      try {
        if (mode === 'resend') {
          await authService.resendConfirmation(username.trim());
          setMessage(translate('If the account needs confirmation, a new email has been sent.'));
        } else {
          await authService.requestPasswordReset(username.trim());
          setMessage(translate('If the account is eligible, a password reset email has been sent.'));
        }
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'reset') {
      if (!action.userId || !action.token || !password) {
        setError(translate('The password reset link is invalid or expired.'));
        return;
      }
      setSubmitting(true);
      try {
        await authService.resetPassword({ userId: action.userId, token: action.token, password, confirmPassword });
        window.history.replaceState({}, '', window.location.pathname);
        setModeState('login');
        setPassword('');
        setConfirmPassword('');
        setMessage(translate('Password reset. You can now sign in.'));
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!username.trim() || !password) {
      setError(translate('Enter your username and password.'));
      return;
    }

    if (mode === 'register' && !acceptSecurityNotice) {
      setError(translate('Accept the security data collection notice to register.'));
      return;
    }
    setSubmitting(true);

    if (mode === 'register') {
      try {
        const result = await authService.register?.({
          email: username.trim(),
          password,
          confirmPassword,
          acceptSecurityNotice,
        });
        if (result?.confirmationRequired) {
          setModeState('login');
          setPassword('');
          setConfirmPassword('');
          setMessage(translate('Account created. Check your email to confirm it before signing in.'));
          setSubmitting(false);
          return;
        }
      } catch (cause) {
        setError(errorMessage(cause));
        setSubmitting(false);
        return;
      }
    }
    const result = await login(username, password);

    if (!result.ok) setError(result.error);
    setSubmitting(false);
  };

  return {
    acceptSecurityNotice,
    setAcceptSecurityNotice,
    mode,
    setMode,
    registering: mode === 'register',
    registrationAvailable,
    confirmPassword,
    setConfirmPassword,
    username,
    password,
    error,
    message,
    submitting,

    setUsername,
    setPassword,

    handleSubmit,
  };
}
