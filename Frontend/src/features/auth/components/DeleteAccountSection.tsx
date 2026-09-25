import { useState } from 'react';
import { authService } from '@/app/services';
import { errorMessage } from '@/shared/api/errors';
import { translate } from '@/shared/i18n';
import type { AccountDeletionPlan } from '../services/authService';

export default function DeleteAccountSection() {
  const [plan, setPlan] = useState<AccountDeletionPlan | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setPlan(await authService.accountDeletionPlan());
      setChoices({});
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="mt-6 space-y-4 rounded-2xl border p-5"
      style={{ borderColor: 'var(--color-danger-strong)', background: 'var(--color-surface)' }}
    >
      <h2 className="font-semibold">{translate('Delete account')}</h2>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {translate(
          'Your account will be blocked immediately and permanently deleted after 90 days. An administrator can restore it before cleanup, or permanently delete it sooner. Project changes and collaborator removal are immediate and are not undone by restoring your account.',
        )}
      </p>
      {error && (
        <p role="alert" className="text-sm" style={{ color: 'var(--color-danger-strong)' }}>
          {error}
        </p>
      )}
      {!plan ? (
        <button disabled={busy} className="btn-ghost rounded-xl px-4 py-2 text-sm" onClick={() => void load()}>
          {translate('Review account deletion')}
        </button>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !confirmed) return;
            setBusy(true);
            setError('');
            try {
              await authService.deleteAccount({
                currentPassword: password,
                projects: plan.projects.map((project) => ({
                  projectId: project.id,
                  action: choices[project.id] === 'delete' ? 'delete' : 'transfer',
                  newOwnerId: choices[project.id] === 'delete' ? null : choices[project.id]!,
                })),
              });
            } catch (cause) {
              setError(errorMessage(cause));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm">
            {translate(
              'Choose what happens to every project you own, including trashed projects. Deleting a project permanently removes its boards and files. Transfers preserve its current trash status.',
            )}
          </p>
          {plan.projects.map((project) => (
            <label className="block space-y-2 text-sm" key={project.id}>
              <span className="font-semibold">{project.name}</span>
              <select
                required
                disabled={busy}
                className="input-theme w-full px-3 py-2"
                value={choices[project.id] ?? ''}
                onChange={(event) => setChoices({ ...choices, [project.id]: event.target.value })}
              >
                <option value="">{translate('Choose an action')}</option>
                <option value="delete">{translate('Permanently delete project')}</option>
                {project.collaborators.map((user) => (
                  <option key={user.id} value={user.id}>
                    {translate('Transfer ownership')} · {user.displayName} ({user.email})
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label className="block space-y-2 text-sm">
            <span>{translate('Current password')}</span>
            <input
              required
              disabled={busy}
              type="password"
              autoComplete="current-password"
              className="input-theme w-full px-3 py-2"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              required
              disabled={busy}
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            {translate(
              'I confirm these project decisions and understand that I will be removed from all other projects and signed out immediately.',
            )}
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              className="btn-ghost rounded-xl px-4 py-2 text-sm"
              onClick={() => {
                setPlan(null);
                setPassword('');
                setConfirmed(false);
              }}
            >
              {translate('Cancel')}
            </button>
            <button
              disabled={busy || !confirmed}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--color-danger-strong)' }}
            >
              {busy ? translate('Please wait…') : translate('Confirm account deletion')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
