import { useEffect, useState } from 'react';
import { httpClient } from '@/app/services';
import { translate } from '@/shared/i18n';
import Modal from '@/shared/components/dialogs/Modal';

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

const severityTone = (severity: string) => {
  const value = severity.toLowerCase();
  if (value.includes('error') || value.includes('critical'))
    return { color: 'var(--color-danger-strong)', background: 'rgba(255,107,138,.14)', icon: '!' };
  if (value.includes('warn')) return { color: '#b7791f', background: 'rgba(245,158,11,.16)', icon: '⚠' };
  return { color: 'var(--color-accent)', background: 'var(--color-accent-soft)', icon: 'i' };
};

function SeverityBadge({ severity }: { severity: string }) {
  const tone = severityTone(severity);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ color: tone.color, backgroundColor: tone.background }}
    >
      <span
        className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
        style={{ backgroundColor: tone.color, color: 'var(--color-surface)' }}
      >
        {tone.icon}
      </span>
      {severity}
    </span>
  );
}

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
  const openIncidents = incidents.items.filter((incident) => incident.status !== 'resolved').length;
  const errorCount = incidents.items.filter((incident) => /error|critical/i.test(incident.severity)).length;
  const warningCount = incidents.items.filter((incident) => /warn/i.test(incident.severity)).length;
  const infoCount = incidents.items.filter((incident) => /info/i.test(incident.severity)).length;
  return (
    <section className="min-w-0 space-y-5 rounded-3xl p-3 sm:p-5" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div
        className="relative overflow-hidden rounded-3xl border p-5 sm:p-7"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface-alt), var(--color-accent-soft))',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-40"
          style={{ background: 'var(--color-accent)', filter: 'blur(45px)' }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p
              className="mb-2 text-[10px] font-bold uppercase tracking-[.24em]"
              style={{ color: 'var(--color-accent)' }}
            >
              NodexMesh · {translate('Security')}
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {translate('Audit and security monitoring')}
            </h2>
            <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {translate('Times are displayed in UTC. Statistics cover the last 24 hours.')}
            </p>
          </div>
          <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,.16)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              {translate('Open incidents')}
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: openIncidents ? 'var(--color-danger-strong)' : 'var(--color-accent)' }}
            >
              {openIncidents}
            </p>
          </div>
        </div>
      </div>
      {statistics && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: translate('Info logs'), value: infoCount, color: 'var(--color-accent)', icon: 'i' },
            { label: translate('Warning logs'), value: warningCount, color: '#b7791f', icon: '⚠' },
            { label: translate('Error logs'), value: errorCount, color: 'var(--color-danger-strong)', icon: '!' },
            {
              label: translate('Persistence failures'),
              value: statistics.persistenceFailuresSinceStartup,
              color: 'var(--color-text-secondary)',
              icon: '↗',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border p-4"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl font-bold"
                  style={{ color: card.color, backgroundColor: `${card.color}22` }}
                >
                  {card.icon}
                </span>
                <span className="text-2xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {card.label}
              </p>
            </div>
          ))}
        </div>
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
      {error && (
        <p
          className="rounded-xl px-3 py-2 text-sm"
          role="alert"
          style={{ color: 'var(--color-danger-strong)', backgroundColor: 'rgba(255,107,138,.12)' }}
        >
          {error}
        </p>
      )}
      {busy ? (
        <p role="status">{translate('Loading…')}</p>
      ) : (
        <>
          {total === 0 && <p>{translate('No audit records match these filters.')}</p>}
          {mode === 'events' ? (
            <div className="min-w-0 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
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
                    <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="p-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(entry.occurredAt).toISOString()}
                      </td>
                      <td className="font-semibold">{entry.eventType}</td>
                      <td>
                        <SeverityBadge severity={entry.severity} />
                      </td>
                      <td>
                        <span
                          className="rounded-full px-2 py-1 text-xs"
                          style={{
                            backgroundColor:
                              entry.outcome.toLowerCase() === 'success'
                                ? 'var(--color-accent-soft)'
                                : 'rgba(255,107,138,.12)',
                          }}
                        >
                          {entry.outcome}
                        </span>
                      </td>
                      <td className="text-right pr-3">
                        <button
                          className="btn-ghost rounded-lg px-3 py-1.5 text-xs"
                          onClick={() => void inspect(entry.id)}
                        >
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
                <article
                  key={incident.id}
                  className="min-w-0 break-words rounded-2xl border p-4"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={incident.severity} />
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{
                            backgroundColor:
                              incident.status === 'resolved' ? 'var(--color-accent-soft)' : 'rgba(245,158,11,.16)',
                          }}
                        >
                          {incident.status}
                        </span>
                      </div>
                      <h3 className="mt-2 font-semibold">{incident.rule}</h3>
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(incident.windowStart).toISOString()}
                      </p>
                    </div>
                    <button
                      className="btn-ghost rounded-lg px-3 py-1.5 text-xs"
                      onClick={() => void inspect(incident.eventId)}
                    >
                      {translate('Underlying event')}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {translate('Review status')}
                    </span>
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
                  </div>
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
        <Modal onClose={() => setDetails(null)} centered label={translate('Details')}>
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(8,16,20,.62)', backdropFilter: 'blur(6px)' }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDetails(null);
            }}
          >
            <section
              className="w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <header
                className="flex items-start justify-between gap-4 p-5"
                style={{ background: 'linear-gradient(135deg, var(--color-surface-alt), var(--color-accent-soft))' }}
              >
                <div>
                  <p
                    className="mb-1 text-[10px] font-bold uppercase tracking-[.2em]"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {translate('Audit event')}
                  </p>
                  <h2 className="text-xl font-bold">{translate('Event details')}</h2>
                </div>
                <button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={() => setDetails(null)}>
                  ×
                </button>
              </header>
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {['eventType', 'severity', 'outcome'].map((field) => (
                    <div
                      key={field}
                      className="rounded-2xl p-3"
                      style={{ backgroundColor: 'var(--color-surface-alt)' }}
                    >
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {field}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {String((details as Record<string, unknown>)[field] ?? '—')}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                  <p
                    className="mb-2 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {translate('Raw event data')}
                  </p>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    className="btn-ghost rounded-xl px-4 py-2 text-sm"
                    onClick={() => {
                      const requestId = (details as AuditRow).requestId;
                      if (requestId) {
                        setMode('events');
                        setPage(1);
                        setFilters({ requestId });
                        setQuery(`requestId=${encodeURIComponent(requestId)}`);
                        setDetails(null);
                      }
                    }}
                  >
                    {translate('Related request events')}
                  </button>
                  <button
                    className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold"
                    onClick={() => setDetails(null)}
                  >
                    {translate('Close details')}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </Modal>
      )}
    </section>
  );
}
