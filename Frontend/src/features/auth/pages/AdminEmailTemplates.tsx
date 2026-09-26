import { authService, isMockDataSource } from '@/app/services';
import type { EmailTemplate, EmailTemplateContent } from '@/features/auth/types';
import { translate } from '@/shared/i18n';
import { useEffect, useState } from 'react';

function contentOf(template: EmailTemplate): EmailTemplateContent {
  return { subject: template.subject, textBody: template.textBody, htmlBody: template.htmlBody };
}

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [draft, setDraft] = useState<EmailTemplateContent | null>(null);
  const [preview, setPreview] = useState<EmailTemplateContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void authService
      .emailTemplates()
      .then(setTemplates)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : translate('Unable to load email templates.')),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setSelected(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selected]);

  const open = async (template: EmailTemplate) => {
    const content = contentOf(template);
    setSelected(template);
    setDraft(content);
    setPreview(null);
    setError('');
    try {
      setPreview(await authService.previewEmailTemplate(template.key, content));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Unable to preview email template.'));
    }
  };

  const runPreview = async () => {
    if (!selected || !draft) return;
    setBusy(true);
    setError('');
    try {
      setPreview(await authService.previewEmailTemplate(selected.key, draft));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Unable to preview email template.'));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!selected || !draft) return;
    setBusy(true);
    setError('');
    try {
      const updated = await authService.updateEmailTemplate(selected.key, draft);
      setTemplates((current) => current.map((template) => (template.key === updated.key ? updated : template)));
      setSelected(updated);
      setDraft(contentOf(updated));
      setPreview(await authService.previewEmailTemplate(updated.key, contentOf(updated)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Unable to save email template.'));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!selected || !window.confirm(translate('Restore this template to its default content?'))) return;
    setBusy(true);
    setError('');
    try {
      const restored = await authService.resetEmailTemplate(selected.key);
      const content = contentOf(restored);
      setTemplates((current) => current.map((template) => (template.key === restored.key ? restored : template)));
      setSelected(restored);
      setDraft(content);
      setPreview(await authService.previewEmailTemplate(restored.key, content));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Unable to reset email template.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
      <div>
        <h3 className="text-lg font-bold">{translate('Email templates')}</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {translate('Customize the subject and message content. The branded email frame is applied automatically.')}
        </p>
      </div>

      {error && !selected && (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 px-3 py-2 text-sm"
          style={{ color: 'var(--color-danger-strong)' }}
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">{translate('Loading…')}</p>
      ) : templates.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--color-border)' }}>
          {isMockDataSource
            ? translate('Email templates are unavailable in demo mode.')
            : translate('No email templates are available.')}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article
              key={template.key}
              className="flex flex-col rounded-2xl border p-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h4 className="font-semibold">{template.name}</h4>
              <p className="mt-1 flex-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {template.description}
              </p>
              <code className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {template.key}
              </code>
              <button className="btn-ghost mt-3 rounded-xl px-3 py-2 text-sm" onClick={() => void open(template)}>
                {translate('Edit template')}
              </button>
            </article>
          ))}
        </div>
      )}

      {selected && draft && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 sm:p-6"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-template-title"
            className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl shadow-2xl"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <header
              className="flex items-start justify-between gap-4 border-b p-5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <h3 id="email-template-title" className="text-xl font-bold">
                  {selected.name}
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {selected.description}
                </p>
              </div>
              <button
                className="btn-ghost rounded-xl px-3 py-2"
                onClick={() => setSelected(null)}
                aria-label={translate('Close')}
              >
                ×
              </button>
            </header>

            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-2">
              <div className="space-y-4 p-5 lg:border-r" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <p
                    className="mb-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {translate('Available variables')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.variables.map((variable) => (
                      <code
                        key={variable}
                        className="rounded-lg px-2 py-1 text-xs"
                        style={{ backgroundColor: 'var(--color-accent-soft)' }}
                      >
                        {'{{'}
                        {variable}
                        {'}}'}
                      </code>
                    ))}
                  </div>
                </div>
                <label className="block space-y-1 text-sm font-semibold">
                  {translate('Subject')}
                  <input
                    className="input-theme w-full px-3 py-2 font-normal"
                    maxLength={200}
                    value={draft.subject}
                    onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm font-semibold">
                  {translate('Plain-text fallback')}
                  <textarea
                    className="input-theme min-h-36 w-full px-3 py-2 font-mono text-xs font-normal"
                    value={draft.textBody}
                    onChange={(event) => setDraft({ ...draft, textBody: event.target.value })}
                  />
                </label>
                <label className="block space-y-1 text-sm font-semibold">
                  {translate('HTML content')}
                  <textarea
                    className="input-theme min-h-64 w-full px-3 py-2 font-mono text-xs font-normal"
                    spellCheck={false}
                    value={draft.htmlBody}
                    onChange={(event) => setDraft({ ...draft, htmlBody: event.target.value })}
                  />
                </label>
              </div>

              <div className="min-h-[520px] bg-[#f4f2f8] p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {translate('Preview')}
                </p>
                {preview ? (
                  <iframe
                    title={translate('Email template preview')}
                    className="h-[620px] w-full rounded-xl bg-white"
                    sandbox=""
                    srcDoc={preview.htmlBody}
                  />
                ) : (
                  <p className="text-sm text-slate-600">
                    {translate('Generate a preview to see the rendered message.')}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mx-5 rounded-xl bg-red-500/10 px-3 py-2 text-sm"
                style={{ color: 'var(--color-danger-strong)' }}
              >
                {error}
              </p>
            )}
            <footer
              className="flex flex-wrap justify-between gap-2 border-t p-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button disabled={busy} className="btn-ghost rounded-xl px-4 py-2" onClick={() => void reset()}>
                {translate('Restore default')}
              </button>
              <div className="flex gap-2">
                <button disabled={busy} className="btn-ghost rounded-xl px-4 py-2" onClick={() => void runPreview()}>
                  {translate('Refresh preview')}
                </button>
                <button
                  disabled={busy}
                  className="btn-accent rounded-xl px-4 py-2 font-semibold"
                  onClick={() => void save()}
                >
                  {translate('Save template')}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
