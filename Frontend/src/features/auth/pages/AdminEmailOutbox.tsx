import { authService } from '@/app/services';
import type { EmailOutboxMessage } from '@/features/auth/types';
import { useEffect, useState } from 'react';

export default function AdminEmailOutbox() {
  const [rows, setRows] = useState<EmailOutboxMessage[]>([]);
  const [counts, setCounts] = useState({ pendingMessages: 0, failedMessages: 0 });
  const [error, setError] = useState('');
  const load = async () => { try { const result = await authService.emailOutbox('all'); setRows(result.items); setCounts(result); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load email outbox.'); } };
  useEffect(() => { void load(); }, []);
  const retry = async (id: string) => { await authService.retryEmailOutbox(id); await load(); };
  const remove = async (id: string) => { if (!window.confirm('Delete this unsent email?')) return; await authService.deleteEmailOutbox(id); await load(); };
  const retryAll = async () => { await authService.retryFailedEmails(); await load(); };
  return <section className="mt-6 space-y-4 rounded-2xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Email outbox</h3><p className="text-sm opacity-70">Pending: {counts.pendingMessages} · Failed: {counts.failedMessages}. Message bodies and security links are hidden.</p></div><div className="flex gap-2"><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => void retryAll()}>Retry failed</button><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => void load()}>Refresh</button></div></div>
    {error && <p className="text-sm text-red-600">{error}</p>}
    <div className="space-y-2">{rows.map((row) => <div key={row.id} className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--color-border)' }}><div className="flex flex-wrap justify-between gap-2"><div><strong>{row.kind}</strong> · {row.status} · attempts: {row.attempts}<div>{row.userDisplayName ? `${row.userDisplayName} · ` : ''}<a className="underline" href={`mailto:${row.recipient}`}>{row.recipient}</a></div><div className="opacity-70">{row.subject}</div></div><div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={() => void retry(row.id)}>Retry</button>{row.status !== 'sent' && <button className="rounded border px-2 py-1" onClick={() => void remove(row.id)}>Delete</button>}</div></div>{row.lastError && <pre className="mt-2 whitespace-pre-wrap text-xs text-red-700">{row.lastError}</pre>}</div>)}</div>
  </section>;
}
