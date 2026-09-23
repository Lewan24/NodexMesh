import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { useTheme } from '@/app/providers/ThemeProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { errorMessage } from '@/shared/api/errors';

export default function ProfilePage({ onClose }: { onClose: () => void }) {
  useTranslation();
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState({
    displayName: auth.currentUser?.name ?? '',
    email: auth.currentUser?.username ?? '',
    currentPassword: '',
  });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState<'profile' | 'password' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (kind: 'profile' | 'password', action: () => Promise<void>, success: string) => {
    setBusy(kind);
    setMessage('');
    setError('');
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    void run(
      'profile',
      async () => {
        const updated = await auth.updateProfile(profile);
        setProfile({ displayName: updated.name, email: updated.username, currentPassword: '' });
      },
      translate('Profile updated.'),
    );
  };

  const savePassword = (event: FormEvent) => {
    event.preventDefault();
    void run(
      'password',
      async () => {
        await auth.changePassword(password);
        setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      translate('Password changed. Other signed-in sessions were closed.'),
    );
  };

  return (
    <main
      className="min-h-dvh p-4 sm:p-8"
      style={{ backgroundColor: 'var(--color-app-bg)', color: 'var(--color-text-primary)' }}
    >
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-accent)' }}>
              NodexMesh
            </p>
            <h1 className="text-2xl font-bold">{translate('Your profile')}</h1>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={toggleTheme}>
              {translate('Use') + ' '}
              {theme === 'light' ? 'dark' : 'light'} {' ' + translate('theme')}
            </button>
            <button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={onClose}>
              {translate('Workspace')}
            </button>
          </div>
        </header>

        {(error || message) && (
          <p
            role={error ? 'alert' : 'status'}
            className="mb-4 rounded-xl px-3 py-2 text-sm"
            style={{
              backgroundColor: error ? 'rgba(255,107,138,.12)' : 'var(--color-accent-soft)',
              color: error ? 'var(--color-danger-strong)' : 'var(--color-accent)',
            }}
          >
            {error || message}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <form
            onSubmit={saveProfile}
            className="space-y-4 rounded-2xl p-5"
            style={{ background: 'var(--color-surface)' }}
          >
            <div>
              <h2 className="font-semibold">{translate('Account details')}</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {translate('Enter your current password when changing your email address.')}
              </p>
            </div>
            <Field label={translate('Display name')}>
              <input
                required
                maxLength={100}
                autoComplete="name"
                className="input-theme w-full px-3 py-2 text-sm"
                value={profile.displayName}
                onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
              />
            </Field>
            <Field label={translate('Email address')}>
              <input
                required
                type="email"
                autoComplete="email"
                className="input-theme w-full px-3 py-2 text-sm"
                value={profile.email}
                onChange={(event) => setProfile({ ...profile, email: event.target.value })}
              />
            </Field>
            <Field label={translate('Current password for email changes')}>
              <input
                type="password"
                autoComplete="current-password"
                className="input-theme w-full px-3 py-2 text-sm"
                value={profile.currentPassword}
                onChange={(event) => setProfile({ ...profile, currentPassword: event.target.value })}
              />
            </Field>
            <button disabled={busy !== null} className="btn-accent w-full rounded-xl px-3 py-2 text-sm font-semibold">
              {busy === 'profile' ? translate('Saving…') : translate('Save profile')}
            </button>
          </form>

          <form
            onSubmit={savePassword}
            className="space-y-4 rounded-2xl p-5"
            style={{ background: 'var(--color-surface)' }}
          >
            <div>
              <h2 className="font-semibold">{translate('Change password')}</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {translate('Use 12+ characters with uppercase, lowercase, a number and a symbol.')}
              </p>
            </div>
            <Field label={translate('Current password')}>
              <input
                required
                type="password"
                autoComplete="current-password"
                className="input-theme w-full px-3 py-2 text-sm"
                value={password.currentPassword}
                onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
              />
            </Field>
            <Field label={translate('New password')}>
              <input
                required
                minLength={12}
                type="password"
                autoComplete="new-password"
                className="input-theme w-full px-3 py-2 text-sm"
                value={password.newPassword}
                onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
              />
            </Field>
            <Field label={translate('Confirm new password')}>
              <input
                required
                minLength={12}
                type="password"
                autoComplete="new-password"
                className="input-theme w-full px-3 py-2 text-sm"
                value={password.confirmPassword}
                onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
              />
            </Field>
            <button disabled={busy !== null} className="btn-accent w-full rounded-xl px-3 py-2 text-sm font-semibold">
              {busy === 'password' ? translate('Changing…') : translate('Change password')}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  useTranslation();
  return (
    <label className="block space-y-1.5 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}
