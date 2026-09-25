import { ArrowLeft, KeyRound, Moon, Sun, UserRound, ShieldCheck } from 'lucide-react';
import SecurityNotice from '../components/SecurityNotice';
import DeleteAccountSection from '../components/DeleteAccountSection';
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
      className="h-dvh overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-8"
      style={{
        background:
          'radial-gradient(ellipse at top left, var(--color-accent-soft), transparent 55%), var(--color-app-bg)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div className="mx-auto w-full max-w-6xl pb-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button className="btn-ghost flex items-center gap-2 rounded-xl px-3 py-2 text-sm" onClick={onClose}>
            <ArrowLeft size={16} aria-hidden="true" />
            {translate('Workspace')}
          </button>
          <button className="btn-ghost flex items-center gap-2 rounded-xl px-3 py-2 text-sm" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
            {theme === 'light' ? translate('Dark theme') : translate('Light theme')}
          </button>
        </header>

        <section
          className="mb-6 flex flex-wrap items-center gap-5 rounded-3xl border p-6 shadow-sm sm:p-8"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold"
            style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            {auth.currentUser?.name?.trim().slice(0, 1).toUpperCase() || <UserRound size={28} aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: 'var(--color-accent)' }}
            >
              NodexMesh · {translate('Account settings')}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{translate('Your profile')}</h1>
            <p className="mt-2 break-all text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {auth.currentUser?.username}
            </p>
          </div>
          <span
            className="rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {auth.isAdmin ? translate('Administrator') : translate('User')}
          </span>
        </section>

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

        <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label={translate('Account settings')}
            className="flex flex-wrap gap-2 lg:sticky lg:top-0 lg:flex-col"
          >
            {[
              { id: 'account-details', label: translate('Account details'), icon: UserRound },
              { id: 'account-password', label: translate('Change password'), icon: KeyRound },
              { id: 'account-security', label: translate('Security data collection'), icon: ShieldCheck },
            ].map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className="btn-ghost flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium"
              >
                <Icon size={17} className="shrink-0" aria-hidden="true" />
                {label}
              </a>
            ))}
          </nav>
          <div className="min-w-0 space-y-6">
            <div className="grid items-stretch gap-5 md:grid-cols-2">
              <form
                id="account-details"
                onSubmit={saveProfile}
                className="scroll-mt-6 flex min-w-0 flex-col gap-4 rounded-3xl border p-5 shadow-sm sm:p-6"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div>
                  <UserRound size={20} className="mb-3" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                  <h2 className="text-lg font-semibold">{translate('Account details')}</h2>
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {translate('Enter your current password when changing your email address.')}
                  </p>
                </div>
                <Field label={translate('Display name')}>
                  <input
                    required
                    maxLength={100}
                    autoComplete="name"
                    className="input-theme w-full px-3.5 py-2.5 text-sm"
                    value={profile.displayName}
                    onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
                  />
                </Field>
                <Field label={translate('Email address')}>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    className="input-theme w-full px-3.5 py-2.5 text-sm"
                    value={profile.email}
                    onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                  />
                </Field>
                <Field label={translate('Current password for email changes')}>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className="input-theme w-full px-3.5 py-2.5 text-sm"
                    value={profile.currentPassword}
                    onChange={(event) => setProfile({ ...profile, currentPassword: event.target.value })}
                  />
                </Field>
                <button
                  disabled={busy !== null}
                  className="btn-accent mt-auto w-full rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {busy === 'profile' ? translate('Saving…') : translate('Save profile')}
                </button>
              </form>

              <form
                id="account-password"
                onSubmit={savePassword}
                className="scroll-mt-6 flex min-w-0 flex-col gap-4 rounded-3xl border p-5 shadow-sm sm:p-6"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div>
                  <KeyRound size={20} className="mb-3" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                  <h2 className="text-lg font-semibold">{translate('Change password')}</h2>
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {translate('Use 12+ characters with uppercase, lowercase, a number and a symbol.')}
                  </p>
                </div>
                <Field label={translate('Current password')}>
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    className="input-theme w-full px-3.5 py-2.5 text-sm"
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
                    className="input-theme w-full px-3.5 py-2.5 text-sm"
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
                    className="input-theme w-full px-3.5 py-2.5 text-sm"
                    value={password.confirmPassword}
                    onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                  />
                </Field>
                <button
                  disabled={busy !== null}
                  className="btn-accent mt-auto w-full rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {busy === 'password' ? translate('Changing…') : translate('Change password')}
                </button>
              </form>
            </div>
            <div id="account-security" className="scroll-mt-6">
              <SecurityNotice />
            </div>
            <DeleteAccountSection />
          </div>
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
