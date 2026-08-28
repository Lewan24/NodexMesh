import { useState } from 'react';

import type { FormEvent } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';

export function useLoginForm() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setSubmitting(true);
    setError('');

    setTimeout(() => {
      const result = login(username, password);

      if (!result.ok) {
        setError(result.error);
      }

      setSubmitting(false);
    }, 250);
  };

  return {
    username,
    password,
    error,
    submitting,

    setUsername,
    setPassword,

    handleSubmit,
  };
}