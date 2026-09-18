import { authService } from '@/app/services';
import { errorMessage } from '@/shared/api/errors';
import { useEffect, useState } from 'react';

import type { FormEvent } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';

export function useLoginForm() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [registering, setRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registrationAvailable, setRegistrationAvailable] = useState(true);

  useEffect(() => {
    void authService
      .registrationAvailable()
      .then(setRegistrationAvailable)
      .catch(() => setRegistrationAvailable(true));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setSubmitting(true);
    setError('');

    if (registering) {
      try {
        await authService.register?.({ email: username.trim(), password, confirmPassword });
      } catch (error) {
        setError(errorMessage(error));
        setSubmitting(false);
        return;
      }
    }
    const result = await login(username, password);

    if (!result.ok) {
      setError(result.error);
    }

    setSubmitting(false);
  };

  return {
    registering,
    registrationAvailable,
    setRegistering,
    confirmPassword,
    setConfirmPassword,
    username,
    password,
    error,
    submitting,

    setUsername,
    setPassword,

    handleSubmit,
  };
}
