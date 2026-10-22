import { Component, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { flushPendingChanges } from '@/shared/api/pendingChanges';

export async function reloadAfterSaving(reload = () => window.location.reload()): Promise<boolean> {
  try {
    if (!(await flushPendingChanges(true))) return false;
    reload();
    return true;
  } catch {
    return false;
  }
}

function ErrorRecovery({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const pending = useRef(false);
  const loadFailed = /ChunkLoadError|dynamically imported module|module script|Loading chunk/i.test(
    `${error.name} ${error.message}`,
  );

  const reload = async () => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setSaveFailed(false);
    const reloaded = await reloadAfterSaving();
    if (!reloaded) setSaveFailed(true);
    pending.current = false;
    setSaving(false);
  };

  return (
    <div role="alert" className="rounded-xl border p-4 text-sm" style={{ color: 'var(--color-text-primary)' }}>
      <p>
        {t(
          loadFailed
            ? 'This view could not be downloaded. Check your connection and retry.'
            : 'This view stopped working.',
        )}
      </p>
      <p>{t('You can retry this view. Reloading requires saving pending changes first.')}</p>
      {saveFailed && <p>{t('Changes could not be saved. Reload was cancelled. Please retry when connected.')}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" disabled={saving} onClick={onRetry}>
          {t('Try again')}
        </button>
        <button type="button" disabled={saving} onClick={() => void reload()}>
          {t(saving ? 'Saving…' : 'Save changes and reload')}
        </button>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  error: Error | null;
  resetKey?: string;
}

/** Keep render/chunk failures local. Never display raw errors or reload automatically. */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error('Render failed') };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  override render() {
    if (this.state.error)
      return <ErrorRecovery error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
