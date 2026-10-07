import type { BoardItem, ChecklistEntry } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import { completeTaskItems } from './completeTaskItems';

function containsTask(item: BoardItem, id: string): boolean {
  return item.type === 'checklist'
    ? item.entries.some((task) => task.id === id)
    : item.type === 'kanban' && item.columns.some((column) => column.cards.some((task) => task.id === id));
}

/** An acknowledged completed task may be omitted from the next board projection while its dialog is open. */
export async function saveTaskDetails(
  source: BoardItem,
  task: ChecklistEntry,
  onUpdate: (updater: (current: BoardItem) => BoardItem) => void,
) {
  const complete = containsTask(source, task.id) ? source : (await completeTaskItems([source]))[0];
  if (!complete || !containsTask(complete, task.id))
    throw new Error(translate('This task was removed. Close the dialog and reload the board.'));
  onUpdate((current) => {
    if (current.type !== source.type) throw new Error(translate('This task block has changed. Reload the board.'));
    const missing = !containsTask(current, task.id);
    if (missing && complete === source) throw new Error(translate('This task changed while saving. Please retry.'));
    const columnId =
      complete.type === 'kanban'
        ? complete.columns.find((column) => column.cards.some((card) => card.id === task.id))?.id
        : undefined;
    // The task is now explicit in the local item, so remove its omitted-task count.
    const taskSummary =
      missing && current.taskSummary
        ? {
            ...current.taskSummary,
            completedCount: Math.max(0, current.taskSummary.completedCount - 1),
            columns: {
              ...current.taskSummary.columns,
              ...(columnId ? { [columnId]: Math.max(0, (current.taskSummary.columns[columnId] ?? 0) - 1) } : {}),
            },
          }
        : current.taskSummary;
    if (current.type === 'checklist')
      return {
        ...current,
        taskSummary,
        entries: missing
          ? [...current.entries, task]
          : current.entries.map((entry) => (entry.id === task.id ? task : entry)),
      };
    if (current.type === 'kanban') {
      if (missing && !current.columns.some((column) => column.id === columnId))
        throw new Error(translate('This task column was removed. Reload the board.'));
      return {
        ...current,
        taskSummary,
        columns: current.columns.map((column) => ({
          ...column,
          cards:
            missing && column.id === columnId
              ? [...column.cards, task]
              : column.cards.map((card) => (card.id === task.id ? task : card)),
        })),
      };
    }
    return current;
  });
}
