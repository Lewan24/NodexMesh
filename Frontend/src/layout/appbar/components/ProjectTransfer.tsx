import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Project } from '@/entities/project/types';
import { hasLibraryMedia } from '@/features/projects/services/projectJson';

function notifyLibraryReferences(text: string) {
  const { version, project } = JSON.parse(text);
  if (hasLibraryMedia(version === 1 ? { ...project, boards: undefined } : project))
    toast.info(
      translate(
        'JSON contains library references, not files. Images and icons still require access to the original library.',
      ),
    );
}

export default function ProjectTransfer({
  project,
  onImport,
  onExport,
}: {
  project: Project | undefined;
  onImport: (text: string) => Promise<void>;
  onExport: () => Promise<string>;
}) {
  useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const exportProject = async () => {
    if (!project) return;
    setBusy(true);
    try {
      const text = await onExport();
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 80) || 'project'}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notifyLibraryReferences(text);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : translate('Could not export project.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2 px-2 text-xs" style={{ color: 'var(--color-chrome-text)' }}>
      <button type="button" disabled={!project || busy} onClick={exportProject}>
        {translate('Export JSON')}
      </button>
      <button type="button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? translate('Importing…') : translate('Import JSON')}
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          setBusy(true);
          try {
            if (file.size > 20 * 1024 * 1024) throw new Error(translate('Project file exceeds 20 MB.'));
            const text = await file.text();
            await onImport(text);
            toast.success(translate('Project imported. Changes will be saved automatically.'));
            notifyLibraryReferences(text);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : translate('Could not import project.'));
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
