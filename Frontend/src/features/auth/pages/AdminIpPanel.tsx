import { useEffect, useState } from 'react';
import { httpClient } from '@/app/services';
import { translate } from '@/shared/i18n';
import Modal from '@/shared/components/dialogs/Modal';
import AdminIpBan from './AdminIpBan';

type IpRow = {
  ip: string;
  lastSeen: string;
  windowStart: string;
  failedLogins: number;
  unauthorized: number;
  notFound: number;
  rateLimited: number;
  bannedUntil: string | null;
  reason: string | null;
  releasedAt: string | null;
};
type Page = { items: IpRow[]; total: number };

export default function AdminIpPanel() {
  const [data, setData] = useState<Page>({ items: [], total: 0 });
  const [status, setStatus] = useState('banned');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<IpRow | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    if (!httpClient) {
      setError(translate('IP protection requires the API connection.'));
      setLoading(false);
      return;
    }
    httpClient
      .request(`/admin/security/ips?status=${status}&search=${encodeURIComponent(search)}&page=${page}`, {
        signal: controller.signal,
      })
      .then((result) => {
        if (!controller.signal.aborted) setData(result as Page);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : translate('Unable to load IP activity.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, search, page, revision]);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{translate('IP protection')}</h2>
      <p className="text-sm">
        {translate(
          'Repeated failures trigger temporary bans across the site and API. Releasing a ban clears its failure counters; future abuse can trigger a new ban.',
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <AdminIpBan
          onBanned={() => {
            setStatus('banned');
            setSearch('');
            setPage(1);
            setRevision((value) => value + 1);
          }}
        />
        <select
          aria-label={translate('IP status')}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="input-theme px-3 py-2"
        >
          <option value="banned">{translate('Banned IPs')}</option>
          <option value="suspicious">{translate('Suspicious IPs')}</option>
          <option value="all">{translate('All IP records')}</option>
        </select>
        <input
          aria-label={translate('Search IP')}
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="input-theme px-3 py-2"
        />
        <button disabled={loading} onClick={() => setRevision((value) => value + 1)} className="btn-ghost px-3 py-2">
          {translate('Refresh')}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p role="status">{translate('Loading…')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {[
                  'IP address',
                  'Status',
                  'Failed logins',
                  'Unauthorized',
                  'Not found',
                  'Rate limited',
                  'Last seen',
                  'Actions',
                ].map((label) => (
                  <th key={label} className="p-2">
                    {translate(label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.ip} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="p-2 font-mono">{row.ip}</td>
                  <td className="p-2">
                    {row.bannedUntil && new Date(row.bannedUntil).getTime() > Date.now() ? (
                      <>
                        {new Date(row.bannedUntil).getUTCFullYear() === 9999
                          ? translate('Banned forever')
                          : `${translate('Banned until')} ${new Date(row.bannedUntil).toLocaleString()}`}
                        <br />
                        {row.reason}
                      </>
                    ) : (
                      translate(
                        row.releasedAt && new Date(row.releasedAt) >= new Date(row.lastSeen)
                          ? 'Released'
                          : 'Suspicious / expired',
                      )
                    )}
                  </td>
                  <td className="p-2">{row.failedLogins}</td>
                  <td className="p-2">{row.unauthorized}</td>
                  <td className="p-2">{row.notFound}</td>
                  <td className="p-2">{row.rateLimited}</td>
                  <td className="p-2">{new Date(row.lastSeen).toLocaleString()}</td>
                  <td className="p-2">
                    <button
                      className="btn-ghost px-3 py-2"
                      onClick={() => {
                        setSelected(row);
                        setReason('');
                      }}
                    >
                      {translate('Release / clear counters')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.items.length && <p>{translate('No IP records match these filters.')}</p>}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)}>
          {translate('Previous')}
        </button>
        <span>
          {page} / {Math.max(1, Math.ceil(data.total / 50))}
        </span>
        <button disabled={loading || page * 50 >= data.total} onClick={() => setPage((value) => value + 1)}>
          {translate('Next')}
        </button>
      </div>
      {selected && (
        <Modal
          centered
          label={translate('Release IP')}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form
            className="w-full max-w-md space-y-4 overflow-y-auto rounded-3xl border p-5 shadow-2xl"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || !httpClient) return;
              setBusy(true);
              setError('');
              try {
                await httpClient.request(`/admin/security/ips/${encodeURIComponent(selected.ip)}/release`, {
                  method: 'POST',
                  body: { reason },
                });
                setSelected(null);
                setRevision((value) => value + 1);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : translate('Unable to release IP.'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="text-lg font-semibold">{translate('Release IP')}</h2>
            <p className="break-all font-mono">{selected.ip}</p>
            {error && <p role="alert">{error}</p>}
            <label className="block">
              {translate('Reason')}
              <textarea
                autoFocus
                required
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-theme w-full px-3 py-2"
              />
            </label>
            <button disabled={busy} className="btn-accent rounded-xl px-4 py-2">
              {translate('Confirm release')}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
