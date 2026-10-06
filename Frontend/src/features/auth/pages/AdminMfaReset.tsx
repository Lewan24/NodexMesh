import { useState } from 'react';
import { httpClient } from '@/app/services';
import { translate } from '@/shared/i18n';
import Modal from '@/shared/components/dialogs/Modal';

type Challenge = { mfaRequired: boolean; challengeToken?: string; method?: string };

export default function AdminMfaReset({ userId, email }: { userId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const close = () => {
    setOpen(false);
    setPassword('');
    setReason('');
    setCode('');
    setChallenge(null);
    setError('');
  };
  return (
    <>
      <button
        className="btn-ghost rounded-lg px-2.5 py-1.5 text-xs"
        onClick={() => {
          setSuccess(false);
          setOpen(true);
        }}
      >
        {translate('Reset MFA')}
      </button>
      {success && (
        <span role="status" className="text-xs">
          {translate('MFA reset. User must sign in and enroll again.')}
        </span>
      )}
      {open && (
        <Modal
          centered
          label={translate('Reset MFA')}
          onClose={() => {
            if (!busy) close();
          }}
        >
          <form
            className="w-full max-w-md space-y-4 overflow-y-auto rounded-3xl border p-5 shadow-2xl"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              setBusy(true);
              setError('');
              try {
                if (!httpClient) throw new Error(translate('This action requires the API connection.'));
                if (!challenge) {
                  setChallenge(
                    (await httpClient.request(`/admin/users/${encodeURIComponent(userId)}/mfa/reset/start`, {
                      method: 'POST',
                      body: { currentPassword: password },
                    })) as Challenge,
                  );
                } else {
                  await httpClient.request(`/admin/users/${encodeURIComponent(userId)}/mfa/reset`, {
                    method: 'POST',
                    body: { currentPassword: password, reason, challengeToken: challenge.challengeToken, code },
                  });
                  close();
                  setSuccess(true);
                }
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : translate('The operation failed.'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="text-lg font-semibold">{translate('Reset MFA')}</h2>
            <p className="break-all text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {email}
            </p>
            <p className="text-sm">
              {translate(
                'Verify the user’s identity before resetting MFA. This disables MFA and invalidates their sessions, authenticator and recovery codes.',
              )}
            </p>
            {error && <p role="alert">{error}</p>}
            {!challenge && (
              <label className="block">
                {translate('Your administrator password')}
                <input
                  required
                  autoFocus
                  maxLength={256}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-theme w-full px-3 py-2"
                />
              </label>
            )}
            <label className="block">
              {translate('Reason')}
              <textarea
                required
                minLength={5}
                maxLength={500}
                disabled={busy}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-theme w-full px-3 py-2"
              />
            </label>
            {challenge?.mfaRequired && (
              <label className="block">
                {translate(
                  challenge.method === 'recovery'
                    ? 'Your recovery code'
                    : challenge.method === 'email'
                      ? 'Your email verification code (or recovery code)'
                      : 'Your authenticator code (or recovery code)',
                )}
                <input
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  maxLength={64}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input-theme w-full px-3 py-2"
                />
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={close} className="btn-ghost rounded-xl px-4 py-2">
                {translate('Cancel')}
              </button>
              <button disabled={busy} className="btn-accent rounded-xl px-4 py-2">
                {translate(challenge ? 'Confirm MFA reset' : 'Verify administrator')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
