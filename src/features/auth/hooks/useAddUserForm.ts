import { useState } from 'react';

import type { FormEvent } from 'react';

import type { Role } from '@/entities/user/types';

import { useAuth } from '@/features/auth/hooks/useAuth';

export function useAddUserForm() {
  const { addUser } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setUsername('');
    setPassword('');
    setRole('user');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const result = await addUser({ name, username, password, role });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      setNotice('');
      return;
    }

    setError('');
    setNotice(`${username.trim()} was added.`);

    reset();
  };

  return {
    submitting,
    name,
    username,
    password,
    role,
    error,
    notice,

    setName,
    setUsername,
    setPassword,
    setRole,

    handleSubmit,
  };
}
