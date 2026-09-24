import { useEffect, useState } from 'react';
import { httpClient } from '@/app/services';
import { translate } from '@/shared/i18n';

type AuditRow = {
  id: string;
  occurredAt: string;
  eventType: string;
  severity: string;
  outcome: string;
  actorId: string | null;
  targetUserId: string | null;
  projectId: string | null;
  requestId: string | null;
};
type Incident = { id: string; rule: string; severity: string; status: string; eventId: string; windowStart: string };
type Page<T> = { items: T[]; total: number };
const fields = [
  'from',
  'to',
  'category',
  'severity',
  'eventType',
  'outcome',
  'actorId',
  'targetUserId',
  'projectId',
  'clientIp',
  'statusCode',
  'requestId',
  'search',
] as const;
const labels: Record<(typeof fields)[number], string> = {
  from: 'From (UTC)',
  to: 'To (UTC)',
  category: 'Category',
  severity: 'Severity',
  eventType: 'Event type',
  outcome: 'Outcome',
  actorId: 'Actor ID',
  targetUserId: 'Target account ID',
  projectId: 'Project ID',
  clientIp: 'Client IP',
  statusCode: 'HTTP status',
  requestId: 'Request ID',
  search: 'Event or resource search',
};

export default function AdminAuditPanel() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'events' | 'incidents'>('events');
  const [events, setEvents] = useState<Page<AuditRow>>({ items: [], total: 0 });
  const [incidents, setIncidents] = useState<Page<Incident>>({ items: [], total: 0 });
  const [details, setDetails] = useState<unknown>(null);
  const [statistics, setStatistics] = useState<{
    counts: { eventType: string; count: number }[];
    persistenceFailuresSinceStartup: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError('');
    if (!httpClient) {
      setError(translate('Audit history requires the API connection.'));
      setBusy(false);
      return;
    }
    Promise.all([
      httpClient.request(`/admin/audit/${mode}?page=${page}&${query}`, { signal: controller.signal }),
      httpClient.request('/admin/audit/statistics', { signal: controller.signal }),
    ])
      .then(([result, stats]) => {
        if (controller.signal.aborted) return;
        if (mode === 'events') setEvents(result as Page<AuditRow>);
        else setIncidents(result as Page<Incident>);
        setStatistics(stats as typeof statistics);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : translate('Unable to load audit history.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [mode, page, query, revision]);

  async function inspect(id: string) {
    try {
      setDetails(await httpClient?.request(`/admin/audit/events/${id}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Unable to load audit history.'));
    }
  }
  async function review(id: string, status: string) {
    try {
      await httpClient?.request(`/admin/audit/incidents/${id}`, { method: 'PATCH', body: { status } });
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('The operation failed.'));
    }
  }
  const total = mode === 'events' ? events.total : incidents.total;
  return (
    <section className="min-w-0 space-y-4 rounded-2xl p-3 sm:p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
      <h2 className="font-semibold">{translate('Audit and security monitoring')}</h2>
      <p className="text-sm">{translate('Times are displayed in UTC. Statistics cover the last 24 hours.')}</p>
      {statistics && (
        <details>
          <summary>{translate('Recent statistics')}</summary>
          <ul>
            {statistics.counts.map((entry) => (
              <li key={entry.eventType}>
                {entry.eventType}: {entry.count}
              </li>
            ))}
            <li>
              {translate('Audit persistence failures since startup')}: {statistics.persistenceFailuresSinceStartup}
            </li>
          </ul>
        </details>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-ghost rounded-xl px-3 py-2"
          onClick={() => {
            setMode('events');
            setPage(1);
            setQuery('');
          }}
        >
          {translate('Events')}
        </button>
        <button
          className="btn-ghost rounded-xl px-3 py-2"
          onClick={() => {
            setMode('incidents');
            setPage(1);
            setQuery('');
          }}
        >
          {translate('Incidents')}
        </button>
        <button className="btn-ghost rounded-xl px-3 py-2" onClick={() => setRevision((value) => value + 1)}>
          {translate('Refresh')}
        </button>
      </div>
      {mode === 'events' ? (
        <form
          className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(filters))
              if (value) params.set(key, key === 'from' || key === 'to' ? `${value}:00Z` : value);
            setPage(1);
            setQuery(params.toString());
          }}
        >
          {fields.map((field) => (
            <label key={field} className="min-w-0 text-xs">
              {translate(labels[field])}
              <input
                className="input-theme min-w-0 max-w-full block w-full px-3 py-2 text-sm"
                type={field === 'from' || field === 'to' ? 'datetime-local' : 'text'}
                maxLength={128}
                value={filters[field] ?? ''}
                onChange={(event) => setFilters({ ...filters, [field]: event.target.value })}
              />
            </label>
          ))}
          <label className="min-w-0 text-xs">
            {translate('Sort')}
            <select
              className="input-theme min-w-0 max-w-full block w-full px-3 py-2"
              value={filters.sort ?? ''}
              onChange={(event) => setFilters({ ...filters, sort: event.target.value })}
            >
              <option value="">{translate('Newest first')}</option>
              <option value="oldest">{translate('Oldest first')}</option>
            </select>
          </label>
          <button className="btn-primary rounded-xl px-3 py-2" type="submit">
            {translate('Apply filters')}
          </button>
        </form>
      ) : (
        <label>
          {translate('Review status')}
          <select
            className="input-theme min-w-0 max-w-full ml-2 px-3 py-2"
            onChange={(event) => {
              setPage(1);
              setQuery(`status=${event.target.value}`);
            }}
          >
            <option value="">{translate('All')}</option>
            {['open', 'investigating', 'resolved'].map((status) => (
              <option key={status} value={status}>
                {translate(status)}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      {busy ? (
        <p role="status">{translate('Loading…')}</p>
      ) : (
        <>
          {total === 0 && <p>{translate('No audit records match these filters.')}</p>}
          {mode === 'events' ? (
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr>
                    <th>{translate('Time (UTC)')}</th>
                    <th>{translate('Event type')}</th>
                    <th>{translate('Severity')}</th>
                    <th>{translate('Outcome')}</th>
                    <th>{translate('Details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.items.map((entry) => (
                    <tr key={entry.id}>
                      <td className="p-2">{new Date(entry.occurredAt).toISOString()}</td>
                      <td>{entry.eventType}</td>
                      <td>{entry.severity}</td>
                      <td>{entry.outcome}</td>
                      <td>
                        <button className="btn-ghost p-2" onClick={() => void inspect(entry.id)}>
                          {translate('Inspect')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.items.map((incident) => (
                <article key={incident.id} className="min-w-0 break-words rounded-xl border p-3">
                  <p>
                    {incident.rule} · {incident.severity} · {new Date(incident.windowStart).toISOString()}
                  </p>
                  <button className="btn-ghost p-2" onClick={() => void inspect(incident.eventId)}>
                    {translate('Underlying event')}
                  </button>
                  <select
                    aria-label={translate('Review status')}
                    className="input-theme min-w-0 max-w-full px-3 py-2"
                    value={incident.status}
                    onChange={(event) => void review(incident.id, event.target.value)}
                  >
                    {['open', 'investigating', 'resolved'].map((status) => (
                      <option key={status} value={status}>
                        {translate(status)}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              {translate('Previous')}
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(total / 50))}
            </span>
            <button disabled={page * 50 >= total} onClick={() => setPage(page + 1)}>
              {translate('Next')}
            </button>
          </div>
        </>
      )}
      {details !== null && (
        <div className="min-w-0 break-words rounded-xl border p-3">
          <button onClick={() => setDetails(null)}>{translate('Close details')}</button>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">
            {JSON.stringify(details, null, 2)}
          </pre>
          <button
            onClick={() => {
              const requestId = (details as AuditRow).requestId;
              if (requestId) {
                setMode('events');
                setPage(1);
                setFilters({ requestId });
                setQuery(`requestId=${encodeURIComponent(requestId)}`);
              }
            }}
          >
            {translate('Related request events')}
          </button>
        </div>
      )}
    </section>
  );
}
