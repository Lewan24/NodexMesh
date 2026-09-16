import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Project } from '@/entities/project/types';
import { exportProjectJson } from '@/features/projects/services/projectJson';

export default function ProjectTransfer({
  project,
  onImport,
}: {
  project: Project | undefined;
  onImport: (text: string) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const exportProject = () => {
    if (!project) return;
    const url = URL.createObjectURL(new Blob([exportProjectJson(project)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 80) || 'project'}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex gap-2 px-2 text-xs" style={{ color: 'var(--color-chrome-text)' }}>
      <button type="button" disabled={!project} onClick={exportProject}>
        Export JSON
      </button>
      <button type="button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Importing…' : 'Import JSON'}
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
            if (file.size > 20 * 1024 * 1024) throw new Error('Project file exceeds 20 MB.');
            await onImport(await file.text());
            toast.success('Project imported. Changes will be saved automatically.');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not import project.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
