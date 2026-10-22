import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Code2, Info, LoaderCircle, Plus, Save, Tag, Trash2, X } from 'lucide-react';
import Modal from '@/shared/components/dialogs/Modal';
import { createId } from '@/shared/lib/createId';
import { translate } from '@/shared/i18n';
import { useProjectStatuses } from './ProjectStatusesContext';
import type { ProjectStatus } from './types';
import { validateStatusCss } from './statusModel';
import './statuses.css';

const fresh = (): ProjectStatus => ({
  id: createId(),
  title: '',
  description: '',
  customCss: { enabled: false, source: '' },
});
export default function StatusManager({ onClose }: { onClose: () => void }) {
  useTranslation();
  const { statuses, save, readOnly } = useProjectStatuses();
  const [draft, setDraft] = useState(fresh);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const persist = async (remove = false) => {
    if (busy || readOnly) return;
    setError('');
    setBusy(true);
    try {
      if (!remove && draft.customCss?.enabled) validateStatusCss(draft.customCss.source);
      const next = statuses.filter((status) => status.id !== draft.id);
      await save(remove ? next : [...next, { ...draft, title: draft.title.trim() }]);
      setDraft(fresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Could not save project statuses.'));
    } finally {
      setBusy(false);
    }
  };
  const editing = statuses.some((status) => status.id === draft.id);
  return (
    <Modal onClose={onClose} centered label={translate('Project statuses')}>
      <div className="status-manager" onKeyDown={(event) => event.stopPropagation()}>
        <div className="status-manager-accent" />
        <header className="status-manager-header">
          <span className="status-manager-heading-icon">
            <Tag size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2>{translate('Project statuses')}</h2>
            <p>{translate('Shared across every board in this project.')}</p>
          </div>
          <button
            type="button"
            className="status-manager-close"
            onClick={onClose}
            aria-label={translate('Close')}
            title={translate('Close')}
          >
            <X size={18} />
          </button>
        </header>
        <div className="status-manager-body">
          <nav className="status-manager-sidebar" aria-label={translate('Project statuses')}>
            <div className="status-manager-list-heading">
              <span>{translate('Status')}</span>
              <span className="status-manager-count">{statuses.length}/100</span>
            </div>
            <button
              type="button"
              className="status-manager-new"
              disabled={busy || statuses.length >= 100}
              onClick={() => {
                setDraft(fresh());
                setError('');
              }}
            >
              <Plus size={15} aria-hidden="true" />
              {translate('New status')}
            </button>
            <div className="status-manager-list">
              {statuses.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  className="status-manager-entry"
                  disabled={busy}
                  aria-pressed={draft.id === status.id}
                  aria-label={status.title}
                  onClick={() => {
                    setDraft(structuredClone(status));
                    setError('');
                  }}
                >
                  <span className="status-manager-entry-dot" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <strong>{status.title}</strong>
                    {status.description && <small>{status.description}</small>}
                  </span>
                  {draft.id === status.id && <Check size={14} className="shrink-0" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </nav>
          <form
            className="status-manager-form"
            onSubmit={(event) => {
              event.preventDefault();
              void persist();
            }}
          >
            <fieldset disabled={busy || readOnly}>
              <div className="status-editor-fields">
                <div className="status-editor-heading">
                  <span className="status-editor-heading-icon">
                    <Tag size={15} aria-hidden="true" />
                  </span>
                  <h3>{editing ? draft.title || translate('Status title') : translate('New status')}</h3>
                </div>
                <div className="status-editor-details">
                  <label className="status-editor-field">
                    <span className="status-editor-label">
                      {translate('Status title')}
                      <small>{draft.title.length}/100</small>
                    </span>
                    <input
                      aria-label={translate('Status title')}
                      required
                      maxLength={100}
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    />
                  </label>
                  <label className="status-editor-field">
                    <span className="status-editor-label">{translate('Description (optional)')}</span>
                    <textarea
                      maxLength={2000}
                      rows={2}
                      value={draft.description ?? ''}
                      onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    />
                  </label>
                </div>
                <section className="status-css-panel" aria-label={translate('Custom CSS (optional)')}>
                  <div className="status-css-header">
                    <span className="status-css-heading">
                      <Code2 size={16} aria-hidden="true" />
                      {translate('Custom CSS (optional)')}
                    </span>
                    <label className="status-css-toggle" title={translate('Enable status CSS')}>
                      <input
                        type="checkbox"
                        aria-label={translate('Enable status CSS')}
                        checked={draft.customCss?.enabled ?? false}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            customCss: { source: draft.customCss?.source ?? '', enabled: event.target.checked },
                          })
                        }
                      />
                      <span aria-hidden="true" />
                    </label>
                  </div>
                  <textarea
                    className="status-css-source"
                    aria-label={translate('Custom CSS (optional)')}
                    maxLength={10000}
                    rows={7}
                    spellCheck={false}
                    placeholder="border: 2px solid #22c55e;"
                    value={draft.customCss?.source ?? ''}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        customCss: { enabled: draft.customCss?.enabled ?? false, source: event.target.value },
                      })
                    }
                  />
                  <p className="status-css-help">
                    <Info size={14} aria-hidden="true" />
                    <span>
                      {translate(
                        'Status CSS layers over item CSS. Removing the status restores the item styling. External resources are disabled.',
                      )}
                    </span>
                  </p>
                </section>
              </div>
              {error && (
                <p role="alert" className="status-manager-error">
                  {error}
                </p>
              )}
              <footer className="status-manager-footer">
                {editing && (
                  <button type="button" className="status-manager-delete" onClick={() => void persist(true)}>
                    <Trash2 size={15} aria-hidden="true" />
                    {translate('Delete status')}
                  </button>
                )}
                <button type="submit" className="status-primary" disabled={!draft.title.trim()}>
                  {busy ? (
                    <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save size={15} aria-hidden="true" />
                  )}
                  {busy ? translate('Saving…') : translate('Save status')}
                </button>
              </footer>
            </fieldset>
          </form>
        </div>
      </div>
    </Modal>
  );
}
