import { useState } from 'react';
import type { BoardItem, ChecklistEntry } from '@/entities/board/types';

/** Merge omitted completed tasks by ID while preserving edits and removed columns. */
export function mergeCompletedTasks(current: BoardItem, complete: BoardItem): BoardItem {
  const append = (entries: ChecklistEntry[], all: ChecklistEntry[], ids: Set<string>) => [
    ...entries,
    ...all.filter((entry) => entry.done && !ids.has(entry.id)),
  ];
  if (current.type === 'checklist' && complete.type === 'checklist') {
    return {
      ...current,
      entries: append(current.entries, complete.entries, new Set(current.entries.map((entry) => entry.id))),
    };
  }
  if (current.type === 'kanban' && complete.type === 'kanban') {
    const columns = complete.columns;
    const ids = new Set(current.columns.flatMap((column) => column.cards.map((card) => card.id)));
    return {
      ...current,
      columns: current.columns.map((column) => ({
        ...column,
        cards: append(column.cards, columns.find((old) => old.id === column.id)?.cards ?? [], ids),
      })),
    };
  }
  return current;
}

/** Filtering affects the view; hidden local tasks are retained in every edit. */
export function useCompletedTasks<T extends BoardItem>(
  source: T,
  save: (updater: (item: BoardItem) => BoardItem) => void,
  readOnly = false,
) {
  const [local, setLocal] = useState<{ source: T; item: T } | null>(null);
  const original = source;
  if (readOnly && local?.source === source) source = local.item;
  let item: BoardItem = source;
  if ((source.type === 'checklist' || source.type === 'kanban') && source.hideCompleted) {
    const columns: Record<string, number> = { ...source.taskSummary?.columns };
    let count = source.taskSummary?.completedCount ?? 0;
    if (source.type === 'checklist') {
      count += source.entries.filter((entry) => entry.done).length;
      item = { ...source, entries: source.entries.filter((entry) => !entry.done) };
    } else {
      item = {
        ...source,
        columns: source.columns.map((column) => {
          const done = column.cards.filter((card) => card.done).length;
          count += done;
          columns[column.id] = (columns[column.id] ?? 0) + done;
          return { ...column, cards: column.cards.filter((card) => !card.done) };
        }),
      };
    }
    if (count > 0)
      item = {
        ...item,
        taskSummary: {
          completedCount: count,
          columns,
          boardId: source.taskSummary?.boardId ?? '',
          revision: source.taskSummary?.revision ?? '',
        },
      };
  }
  return {
    item: item as T,
    controlItem: source,
    onVisibilityUpdate: (updater: (item: BoardItem) => BoardItem) => {
      if (readOnly) setLocal({ source: original, item: updater(source) as T });
      else save(updater);
    },
    onUpdate: (updater: (item: BoardItem) => BoardItem) =>
      save((current) => {
        const next = updater(current);
        return (current.type === 'checklist' || current.type === 'kanban') && current.hideCompleted
          ? mergeCompletedTasks(next, current)
          : next;
      }),
  };
}
