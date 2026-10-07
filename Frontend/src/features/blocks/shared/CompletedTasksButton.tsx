import { useRef, useState } from 'react';
import type { BoardItem } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import { completeTaskItems } from './completeTaskItems';
import { mergeCompletedTasks } from './useCompletedTasks';

export default function CompletedTasksButton({
  item,
  onUpdate,
  readOnly = false,
}: {
  item: BoardItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  readOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(item);
  latest.current = item;
  if (item.type !== 'checklist' && item.type !== 'kanban') return null;
  const hiding = item.hideCompleted === true;
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const complete = hiding && item.taskSummary ? (await completeTaskItems([item]))[0]! : item;
      if (latest.current.id !== item.id || latest.current.taskSummary?.revision !== item.taskSummary?.revision)
        throw new Error(translate('Tasks changed. Refresh and retry.'));
      onUpdate((current) => {
        if (current.id !== item.id || current.taskSummary?.revision !== item.taskSummary?.revision) return current;
        const next = hiding ? { ...mergeCompletedTasks(current, complete), taskSummary: undefined } : current;
        return next.type === 'checklist' || next.type === 'kanban' ? { ...next, hideCompleted: !hiding } : next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Unable to load completed tasks.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div onMouseDown={(event) => event.stopPropagation()} className="px-3 py-2 text-xs">
      <button
        data-read-only-action={readOnly || undefined}
        type="button"
        aria-pressed={hiding}
        disabled={busy}
        onClick={() => void toggle()}
        className="btn-ghost rounded px-2 py-1"
      >
        {busy ? translate('Loading…') : hiding ? translate('Show all tasks') : translate('Only unfinished tasks')}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
