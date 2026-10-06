import { useEffect, useState } from 'react';
import AuthenticatorSetup from './AuthenticatorSetup';
import type { FormEvent } from 'react';
import { authService, isMockDataSource } from '@/app/services';
import { translate } from '@/shared/i18n';
import { errorMessage } from '@/shared/api/errors';
import type { MfaSettings, MfaChallenge } from '../types';

export default function MfaSettingsSection() {
  const [settings, setSettings] = useState<MfaSettings | null>(null);
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [method, setMethod] = useState<'email' | 'authenticator'>('email');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isMockDataSource) return;
    let active = true;
    void authService
      .mfaSettings()
      .then((value) => {
        if (!active) return;
        setSettings(value);
        setEnabled(value.enabled);
        setMethod(value.emailAvailable ? value.preferredMethod : 'authenticator');
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      if (challenge) {
        const result = await authService.completeMfaChange({
          challengeToken: challenge.challengeToken,
          code,
          setupCode,
        });
        setRecoveryCodes(result.recoveryCodes);
        setChallenge(null);
        setCode('');
        setSetupCode('');
        setSettings(await authService.mfaSettings());
        setSaved(true);
      } else {
        setRecoveryCodes([]);
        setChallenge(await authService.startMfaChange({ currentPassword: password, enabled, preferredMethod: method }));
        setPassword('');
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (isMockDataSource) return null;
  const needsSetupCode =
    challenge &&
    enabled &&
    ((method === 'email' && challenge.method !== 'email') || (challenge.setupSecret && settings?.enabled));
  return (
    <form
      id="account-mfa"
      onSubmit={submit}
      className="space-y-4 rounded-3xl border p-6"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <h2 className="text-lg font-semibold">{translate('Multi-factor authentication')}</h2>
      {settings && (
        <p>
          {translate(settings.enabled ? 'MFA is enabled.' : 'MFA is disabled.')}{' '}
          {translate('Recovery codes remaining: {{count}}', { count: settings.recoveryCodesRemaining })}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">{translate('MFA settings saved. Other sessions were closed.')}</p>}
      {!challenge ? (
        <>
          <label className="flex gap-2">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            {translate('Enable MFA')}
          </label>
          <label className="block">
            {translate('Preferred MFA method')}
            <select
              disabled={!enabled}
              value={method}
              onChange={(event) => setMethod(event.target.value as typeof method)}
              className="input-theme block w-full p-2"
            >
              {settings?.emailAvailable && <option value="email">{translate('Email confirmation')}</option>}
              <option value="authenticator">{translate('Authenticator app')}</option>
            </select>
          </label>
          <label className="block">
            {translate('Current password')}
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-theme block w-full p-2"
            />
          </label>
        </>
      ) : (
        <>
          <p>
            {translate(
              challenge.method === 'email'
                ? 'Enter the code sent to your email.'
                : challenge.method === 'recovery'
                  ? 'Email is unavailable. Enter a recovery code.'
                  : 'Enter a code from your authenticator app or a recovery code.',
            )}
          </p>
          {challenge.setupSecret && <AuthenticatorSetup secret={challenge.setupSecret} uri={challenge.setupUri} />}
          <label className="block">
            {translate('Verification or recovery code')}
            <input
              required
              autoComplete="one-time-code"
              maxLength={64}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="input-theme block w-full p-2"
            />
          </label>
          {needsSetupCode && (
            <label className="block">
              {translate('Code from the new MFA method')}
              <input
                required
                autoComplete="one-time-code"
                maxLength={6}
                value={setupCode}
                onChange={(event) => setSetupCode(event.target.value)}
                className="input-theme block w-full p-2"
              />
            </label>
          )}
          <button
            type="button"
            disabled={busy}
            className="btn-ghost rounded-xl px-3 py-2"
            onClick={() => {
              setChallenge(null);
              setCode('');
              setSetupCode('');
            }}
          >
            {translate('Cancel')}
          </button>
        </>
      )}
      <button
        disabled={busy || !settings || (!challenge && !enabled && !settings.enabled)}
        className="btn-accent rounded-xl px-3 py-2"
      >
        {translate(busy ? 'Please wait…' : challenge ? 'Verify and save' : 'Continue')}
      </button>
      {recoveryCodes.length > 0 && (
        <div>
          <p>{translate('Save these recovery codes securely. Each works once. They will not be shown again.')}</p>
          <pre className="select-all overflow-auto p-3">{recoveryCodes.join('\n')}</pre>
          <button type="button" className="btn-ghost rounded-xl px-3 py-2" onClick={() => setRecoveryCodes([])}>
            {translate('I saved my recovery codes')}
          </button>
        </div>
      )}
    </form>
  );
}
