import { useState } from 'react';
import { httpClient } from '@/app/services';
import { translate } from '@/shared/i18n';
import Modal from '@/shared/components/dialogs/Modal';

export default function AdminIpBan({ onBanned }: { onBanned: () => void }) {
  const [open, setOpen] = useState(false);
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => {
    setOpen(false);
    setIp('');
    setReason('');
    setDurationMinutes('60');
    setError('');
  };
  return (
    <>
      <button className="btn-accent rounded-xl px-3 py-2" onClick={() => setOpen(true)}>
        {translate('Ban IP')}
      </button>
      {open && (
        <Modal
          centered
          label={translate('Ban IP')}
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
                await httpClient.request('/admin/security/ips', {
                  method: 'POST',
                  body: { ip: ip.trim(), reason: reason.trim(), durationMinutes: Number(durationMinutes) },
                });
                close();
                onBanned();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : translate('Unable to ban IP.'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="text-lg font-semibold">{translate('Ban IP')}</h2>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {translate('Block an IPv4 or IPv6 address across the site and API. You can release the ban at any time.')}
            </p>
            {error && (
              <p role="alert" style={{ color: 'var(--color-danger-strong)' }}>
                {error}
              </p>
            )}
            <label className="block space-y-1 text-sm font-medium">
              <span>{translate('IP address')}</span>
              <input
                required
                autoFocus
                maxLength={45}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
                value={ip}
                onChange={(event) => setIp(event.target.value)}
                className="input-theme w-full px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>{translate('Ban duration (minutes)')}</span>
              <input
                required
                type="number"
                min={1}
                max={43200}
                step={1}
                disabled={busy}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                className="input-theme w-full px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>{translate('Reason')}</span>
              <textarea
                required
                minLength={5}
                maxLength={500}
                rows={3}
                disabled={busy}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="input-theme w-full px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={close} className="btn-ghost rounded-xl px-4 py-2">
                {translate('Cancel')}
              </button>
              <button disabled={busy} className="btn-accent rounded-xl px-4 py-2">
                {translate('Confirm ban')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
