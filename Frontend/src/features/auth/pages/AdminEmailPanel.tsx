import { authService } from '@/app/services';
import { translate } from '@/shared/i18n';
import { useEffect, useState } from 'react';
import type { EmailSettings } from '@/features/auth/types';
import AdminEmailTemplates from './AdminEmailTemplates';
import AdminEmailOutbox from './AdminEmailOutbox';

type EmailDraft = Pick<
  EmailSettings,
  | 'enabled'
  | 'host'
  | 'port'
  | 'useSsl'
  | 'username'
  | 'fromAddress'
  | 'fromName'
  | 'publicBaseUrl'
  | 'userNotificationsEnabled'
  | 'adminAlertsEnabled'
> & { password: string; clearPassword: boolean };

function toDraft(settings: EmailSettings): EmailDraft {
  return {
    enabled: settings.enabled,
    host: settings.host,
    port: settings.port,
    useSsl: settings.useSsl,
    username: settings.username,
    password: '',
    clearPassword: false,
    fromAddress: settings.fromAddress,
    fromName: settings.fromName,
    publicBaseUrl: settings.publicBaseUrl,
    userNotificationsEnabled: settings.userNotificationsEnabled,
    adminAlertsEnabled: settings.adminAlertsEnabled,
  };
}

export default function AdminEmailPanel() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void authService
      .emailSettings()
      .then((value) => {
        setSettings(value);
        setDraft(toDraft(value));
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : translate('Unable to load email settings.')),
      );
  }, []);

  if (!settings || !draft) return <p role="status">{translate('Loading…')}</p>;

  const update = <K extends keyof EmailDraft>(key: K, value: EmailDraft[K]) => setDraft({ ...draft, [key]: value });
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const next = await authService.updateEmailSettings(draft);
      setSettings(next);
      setDraft(toDraft(next));
      setMessage(translate('Email settings saved. Changes take effect immediately.'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Unable to save email settings.'));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await authService.testEmailSettings();
      setMessage(translate('Test email sent to your administrator address.'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Test email could not be sent.'));
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || !settings.editable;
  return (
    <section className="space-y-5 rounded-3xl p-4 sm:p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{translate('Email delivery')}</h2>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {settings.editable
              ? translate('SMTP credentials are encrypted before they are stored in the database.')
              : translate('These values are managed by server configuration and are read-only here.')}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full px-3 py-1.5" style={{ backgroundColor: 'var(--color-accent-soft)' }}>
            {translate('Pending')}: {settings.pendingMessages}
          </span>
          <span className="rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(255,107,138,.12)' }}>
            {translate('Failed')}: {settings.failedMessages}
          </span>
        </div>
      </div>

      {(error || message) && (
        <p
          role={error ? 'alert' : 'status'}
          className="rounded-xl px-3 py-2 text-sm"
          style={{
            backgroundColor: error ? 'rgba(255,107,138,.12)' : 'var(--color-accent-soft)',
            color: error ? 'var(--color-danger-strong)' : 'var(--color-accent)',
          }}
        >
          {error || message}
        </p>
      )}

      <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
        <label className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            disabled={disabled}
            checked={draft.enabled}
            onChange={(event) => update('enabled', event.target.checked)}
          />
          {translate('Enable email delivery and require account confirmation')}
        </label>

        <Field label={translate('SMTP server')}>
          <input
            className="input-theme w-full px-3 py-2"
            required={draft.enabled}
            disabled={disabled}
            value={draft.host}
            onChange={(event) => update('host', event.target.value)}
          />
        </Field>
        <Field label={translate('SMTP port')}>
          <input
            className="input-theme w-full px-3 py-2"
            type="number"
            min={1}
            max={65535}
            required
            disabled={disabled}
            value={draft.port}
            onChange={(event) => update('port', Number(event.target.value))}
          />
        </Field>
        <Field label={translate('SMTP username')}>
          <input
            className="input-theme w-full px-3 py-2"
            autoComplete="off"
            disabled={disabled}
            value={draft.username}
            onChange={(event) => update('username', event.target.value)}
          />
        </Field>
        <Field label={translate('SMTP password')}>
          <input
            className="input-theme w-full px-3 py-2"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
            placeholder={settings.hasPassword ? translate('Stored securely — leave blank to keep') : ''}
            value={draft.password}
            onChange={(event) => update('password', event.target.value)}
          />
        </Field>
        <Field label={translate('Sender email')}>
          <input
            className="input-theme w-full px-3 py-2"
            type="email"
            required={draft.enabled}
            disabled={disabled}
            value={draft.fromAddress}
            onChange={(event) => update('fromAddress', event.target.value)}
          />
        </Field>
        <Field label={translate('Sender name')}>
          <input
            className="input-theme w-full px-3 py-2"
            maxLength={100}
            disabled={disabled}
            value={draft.fromName}
            onChange={(event) => update('fromName', event.target.value)}
          />
        </Field>
        <Field label={translate('Public application URL')} wide>
          <input
            className="input-theme w-full px-3 py-2"
            type="url"
            required={draft.enabled}
            disabled={disabled}
            placeholder="https://nodexmesh.example.com"
            value={draft.publicBaseUrl}
            onChange={(event) => update('publicBaseUrl', event.target.value)}
          />
        </Field>

        <div className="grid gap-3 md:col-span-2 sm:grid-cols-3">
          <Toggle
            label={translate('Use TLS/STARTTLS')}
            checked={draft.useSsl}
            disabled={disabled}
            onChange={(value) => update('useSsl', value)}
          />
          <Toggle
            label={translate('Project access notifications')}
            checked={draft.userNotificationsEnabled}
            disabled={disabled}
            onChange={(value) => update('userNotificationsEnabled', value)}
          />
          <Toggle
            label={translate('Critical administrator alerts')}
            checked={draft.adminAlertsEnabled}
            disabled={disabled}
            onChange={(value) => update('adminAlertsEnabled', value)}
          />
        </div>

        {settings.editable && settings.hasPassword && (
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              disabled={busy}
              checked={draft.clearPassword}
              onChange={(event) => update('clearPassword', event.target.checked)}
            />
            {translate('Remove the stored SMTP password')}
          </label>
        )}

        <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
          <button
            type="button"
            disabled={busy || !settings.enabled || !settings.configured}
            className="btn-ghost rounded-xl px-4 py-2 disabled:opacity-50"
            onClick={() => void test()}
          >
            {translate('Send test email')}
          </button>
          {settings.editable && (
            <button disabled={busy} className="btn-accent rounded-xl px-4 py-2 font-semibold disabled:opacity-50">
              {translate('Save email settings')}
            </button>
          )}
        </div>
      </form>
      <AdminEmailTemplates />
      <AdminEmailOutbox />
    </section>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`space-y-1 text-sm ${wide ? 'md:col-span-2' : ''}`}>
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className="flex items-center gap-2 rounded-xl border p-3 text-sm"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
