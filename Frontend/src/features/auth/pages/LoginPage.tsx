import LanguageSelect from '@/shared/i18n/LanguageSelect';
import SecurityNotice from '../components/SecurityNotice';
import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { isMockDataSource } from '@/app/services';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';

export default function LoginPage() {
  useTranslation();
  const {
    acceptSecurityNotice,
    setAcceptSecurityNotice,
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
  } = useLoginForm();

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-6 sm:py-10"
      style={{ backgroundColor: 'var(--color-chrome-bg)' }}
    >
      {/* Ambient background accents */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute pointer-events-none"
          style={{
            width: 520,
            height: 520,
            borderRadius: '50%',
            top: -180,
            left: -160,
            background: 'radial-gradient(circle, rgba(124, 58, 237,0.25), transparent 70%)',
          }}
        />

        <div
          className="absolute pointer-events-none"
          style={{
            width: 460,
            height: 460,
            borderRadius: '50%',
            bottom: -160,
            right: -140,
            background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)',
          }}
        />
      </div>

      <div
        className={`relative mx-auto my-auto w-full shrink-0 rounded-3xl p-5 shadow-2xl sm:p-8 ${registering ? 'max-w-3xl' : 'max-w-sm'}`}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animation: 'slide-up 0.25s ease forwards',
        }}
      >
        <div className="mb-4 flex justify-end">
          <LanguageSelect surface />
        </div>
        {/* Logo */}

        <div className="mb-6 flex flex-col items-center gap-2">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.3" />
            </svg>
          </div>

          <span
            className="text-sm font-bold"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            NodexMesh
          </span>

          <p className="text-sm text-center mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {registering ? translate('Create your NodexMesh account') : translate('Sign in to open your boards')}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={registering ? 'grid gap-5 md:grid-cols-2 md:gap-x-8' : 'flex flex-col gap-3.5'}
        >
          <div className="flex min-w-0 flex-col gap-3.5">
            {registering && <h2 className="text-sm font-semibold">{translate('Account details')}</h2>}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                {isMockDataSource ? translate('Username') : translate('Email')}
              </span>

              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type={isMockDataSource ? 'text' : 'email'}
                placeholder={isMockDataSource ? translate('e.g. demo') : 'you@example.com'}
                className="input-theme text-sm px-3.5 py-2.5"
                autoComplete="username"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                {translate('Password')}
              </span>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-theme text-sm px-3.5 py-2.5"
                autoComplete={registering ? 'new-password' : 'current-password'}
              />
            </label>

            {registering && (
              <label className="flex flex-col gap-1.5 text-xs">
                {translate('Confirm new password')}
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="input-theme text-sm px-3.5 py-2.5"
                  required
                />
              </label>
            )}
            {registering && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {translate('Use 12+ characters with uppercase, lowercase, a number and a symbol.')}
              </p>
            )}
          </div>
          {registering && (
            <div className="flex flex-col gap-4 md:border-l md:pl-8" style={{ borderColor: 'var(--color-border)' }}>
              <SecurityNotice />
              <label
                className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs leading-relaxed"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <input
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                  type="checkbox"
                  required
                  checked={acceptSecurityNotice}
                  onChange={(event) => setAcceptSecurityNotice(event.target.checked)}
                />
                {translate('I understand and accept the required collection of security data described above.')}
              </label>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl px-3 py-2 text-xs md:col-span-2"
              style={{ color: 'var(--color-danger-strong)', backgroundColor: 'rgba(255,107,138,0.1)' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (registering && !acceptSecurityNotice)}
            className="btn-accent mt-1.5 rounded-xl py-3 text-sm font-semibold disabled:opacity-60 md:col-span-2"
          >
            {submitting ? translate('Please wait…') : registering ? translate('Create account') : translate('Sign in')}
          </button>
        </form>
        {!isMockDataSource && registrationAvailable && (
          <button
            type="button"
            disabled={submitting}
            className="btn-ghost mt-4 w-full rounded-xl px-3 py-2 text-sm"
            onClick={() => setRegistering(!registering)}
          >
            {registering ? translate('Back to sign in') : translate('Create an account')}
          </button>
        )}

        {!registering && (
          <p className="text-xs text-center mt-6" style={{ color: 'var(--color-text-muted)' }}>
            {isMockDataSource
              ? translate('Sign in with a demo account.')
              : translate('Sign in with your registered email address.')}
          </p>
        )}

        {/* Handy for first-time reviewers of this build */}

        {isMockDataSource && (
          <div
            className="mt-4 text-[11px] rounded-xl px-3 py-2 leading-relaxed"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }}
          >
            {translate('Demo logins —') + ' '}
            <strong>demo / demo123</strong> {' ' + translate('(user) or') + ' '}
            <strong>admin / admin123</strong> {' ' + translate('(admin)')}
          </div>
        )}
      </div>
    </div>
  );
}
