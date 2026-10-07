import { httpClient } from '@/app/services';
import type { BoardItem, ChecklistEntry, KanbanColumn } from '@/entities/board/types';
import { translate } from '@/shared/i18n';

/** Copying requires complete source data, including tasks omitted from initial reads. */
export async function completeTaskItems(items: BoardItem[]): Promise<BoardItem[]> {
  const complete = async (item: BoardItem): Promise<BoardItem> => {
    if (item.type === 'column') return { ...item, items: await completeTaskItems(item.items) };
    const summary = item.taskSummary;
    if (!summary || (item.type !== 'checklist' && item.type !== 'kanban')) return item;
    if (!httpClient) throw new Error(translate('This action requires the API connection.'));
    const data = (await httpClient.request(
      `/boards/${encodeURIComponent(summary.boardId)}/items/${encodeURIComponent(item.id)}/completed-tasks?expectedRevision=${encodeURIComponent(summary.revision)}`,
    )) as { entries: ChecklistEntry[]; columns: KanbanColumn[] };
    if (item.type === 'checklist') {
      const ids = new Set(item.entries.map((entry) => entry.id));
      return {
        ...item,
        taskSummary: undefined,
        entries: [...item.entries, ...data.entries.filter((entry) => !ids.has(entry.id))],
      };
    }
    const ids = new Set(item.columns.flatMap((column) => column.cards.map((card) => card.id)));
    return {
      ...item,
      taskSummary: undefined,
      columns: item.columns.map((column) => ({
        ...column,
        cards: [
          ...column.cards,
          ...(data.columns.find((old) => old.id === column.id)?.cards.filter((card) => !ids.has(card.id)) ?? []),
        ],
      })),
    };
  };
  // Bound the number of outstanding requests even when copying a large selection.
  const result: BoardItem[] = [];
  for (const item of items) result.push(await complete(item));
  return result;
}
