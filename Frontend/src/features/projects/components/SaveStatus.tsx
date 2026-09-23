import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { Project } from '@/entities/project/types';
import type { WorkspaceState } from '../services/workspaceController';

function downloadDraft(projects: Project[]) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ format: 'nodexmesh-local-draft', version: 1, projects }, null, 2)], {
      type: 'application/json',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'nodexmesh-unsaved-draft.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SaveStatus({
  status,
  error,
  projects,
  retry,
  reload,
}: WorkspaceState & { retry: () => Promise<void>; reload: () => Promise<void> }) {
  useTranslation();
  const [confirmReload, setConfirmReload] = useState(false);
  const failed = status === 'error' || status === 'conflict';
  return (
    <div
      className={status === 'saved' ? 'sr-only' : 'save-status flex flex-wrap items-center gap-3 text-xs'}
      role={failed ? 'alert' : 'status'}
    >
      <span>
        {failed
          ? error
          : (
              {
                loading: translate('Loading projects…'),
                pending: translate('Unsaved changes'),
                saving: translate('Saving…'),
                saved: translate('Saved'),
              } as const
            )[status]}
      </span>
      {failed && (
        <>
          <button className="underline" onClick={() => downloadDraft(projects)}>
            {translate('Download local draft')}
          </button>
          {status === 'error' && (
            <button className="underline" onClick={() => void retry()}>
              {translate('Retry')}
            </button>
          )}
          <button className="underline" onClick={() => setConfirmReload(true)}>
            {translate('Reload saved data')}
          </button>
        </>
      )}
      {confirmReload && (
        <span>
          {translate('Discard local changes?')}
          <button
            className="underline mx-2"
            onClick={() => {
              setConfirmReload(false);
              void reload();
            }}
          >
            {translate('Discard and reload')}
          </button>
          <button className="underline" onClick={() => setConfirmReload(false)}>
            {translate('Cancel')}
          </button>
        </span>
      )}
    </div>
  );
}
