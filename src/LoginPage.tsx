import { useState } from 'react';
import { useAuth } from './auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    // Mimic a network round trip so the loading state is visible.
    setTimeout(() => {
      const result = login(username, password);
      if (!result.ok) setError(result.error);
      setSubmitting(false);
    }, 250);
  };

  return (
    <div
      className="flex h-screen w-screen items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-chrome-bg)' }}
    >
      {/* Ambient background accents */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 520, height: 520, borderRadius: '50%', top: -180, left: -160,
          background: 'radial-gradient(circle, rgba(124, 58, 237,0.25), transparent 70%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 460, height: 460, borderRadius: '50%', bottom: -160, right: -140,
          background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)',
        }}
      />

      <div
        className="relative w-full max-w-sm mx-4 rounded-3xl shadow-2xl p-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          animation: 'slide-up 0.25s ease forwards',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-7">
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
            Sign in to open your boards
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Username</span>
            <input
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. demo"
              className="input-theme text-sm px-3.5 py-2.5"
              autoComplete="username"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-theme text-sm px-3.5 py-2.5"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div
              className="text-xs px-3 py-2 rounded-xl"
              style={{ color: 'var(--color-danger-strong)', backgroundColor: 'rgba(255,107,138,0.1)' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-accent text-sm font-semibold rounded-xl py-2.5 mt-1.5 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--color-text-muted)' }}>
          Accounts are created by your workspace admin — there's no self sign-up.
        </p>

        {/* Handy for first-time reviewers of this build */}
        <div
          className="mt-4 text-[11px] rounded-xl px-3 py-2 leading-relaxed"
          style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-muted)' }}
        >
          Demo logins — <strong>demo / demo123</strong> (user) or <strong>admin / admin123</strong> (admin)
        </div>
      </div>
    </div>
  );
}
