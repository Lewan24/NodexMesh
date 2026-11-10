import type { KanbanCard, KanbanColumn } from '@/entities/board/types';
import { taskCategoryIds } from '../../shared/taskDetails';

export interface KanbanFilters {
  query: string;
  /** null includes every assigned person; [] includes no assigned people. */
  assigneeIds: string[] | null;
  includeUnassigned: boolean;
  categoryIds: string[];
  deadlineBefore: string;
  includeWithoutDeadline: boolean;
}
export const EMPTY_KANBAN_FILTERS: KanbanFilters = {
  query: '',
  assigneeIds: null,
  includeUnassigned: true,
  categoryIds: [],
  deadlineBefore: '',
  includeWithoutDeadline: false,
};
export function hasKanbanFilters(filters: KanbanFilters): boolean {
  return !!(
    filters.query.trim() ||
    filters.assigneeIds !== null ||
    !filters.includeUnassigned ||
    filters.categoryIds.length ||
    filters.deadlineBefore
  );
}
export function matchesKanbanFilters(card: KanbanCard, filters: KanbanFilters): boolean {
  const query = filters.query.trim().toLocaleLowerCase();
  if (query && !`${card.text}\n${card.description ?? ''}`.toLocaleLowerCase().includes(query)) return false;
  if (
    card.assigneeUserId
      ? filters.assigneeIds !== null && !filters.assigneeIds.includes(card.assigneeUserId)
      : !filters.includeUnassigned
  )
    return false;
  if (filters.categoryIds.length && !taskCategoryIds(card).some((id) => filters.categoryIds.includes(id))) return false;
  if (
    filters.deadlineBefore &&
    (card.deadline ? card.deadline >= filters.deadlineBefore : !filters.includeWithoutDeadline)
  )
    return false;
  return true;
}

/** Reorder by visible neighbours, retaining every hidden card and its metadata. */
export function moveFilteredKanbanCard(
  columns: KanbanColumn[],
  sourceId: string,
  targetId: string,
  cardId: string,
  visibleTarget: readonly KanbanCard[],
  index: number,
): KanbanColumn[] {
  const card = columns.find((column) => column.id === sourceId)?.cards.find((card) => card.id === cardId);
  if (!card || !columns.some((column) => column.id === targetId)) return columns;
  const after = visibleTarget.slice(index).find((candidate) => candidate.id !== cardId);
  const before = visibleTarget
    .slice(0, index)
    .reverse()
    .find((candidate) => candidate.id !== cardId);
  return columns.map((column) => {
    if (column.id !== sourceId && column.id !== targetId) return column;
    const cards = column.cards.filter((candidate) => candidate.id !== cardId);
    if (column.id === targetId) {
      const afterIndex = after ? cards.findIndex((candidate) => candidate.id === after.id) : -1;
      const beforeIndex = before ? cards.findIndex((candidate) => candidate.id === before.id) : -1;
      cards.splice(afterIndex >= 0 ? afterIndex : beforeIndex >= 0 ? beforeIndex + 1 : cards.length, 0, card);
    }
    return { ...column, cards };
  });
}
