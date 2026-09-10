import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { BoardItem, ChecklistEntry } from '@/entities/board/types';
import type { Project } from '@/entities/project/types';

export function insertTask(item: BoardItem, task: ChecklistEntry, index: number, columnId?: string): BoardItem {
  if (item.locked) return item;
  const insert = (tasks: ChecklistEntry[]) => {
    if (tasks.some(current => current.id === task.id)) return tasks;
    const next = [...tasks]; next.splice(Math.max(0, Math.min(index, next.length)), 0, { ...task }); return next;
  };
  if (item.type === 'checklist') return { ...item, entries: insert(item.entries) };
  if (item.type === 'kanban') return { ...item, columns: item.columns.map(column => column.id === columnId ? { ...column, cards: insert(column.cards) } : column) };
  return item;
}

function findItem(item: BoardItem, id: string): BoardItem | undefined {
  if (item.locked) return undefined;
  if (item.id === id) return item;
  if (item.type === 'column') return item.items.map(child => findItem(child, id)).find(Boolean);
  return undefined;
}
function updateNested(item: BoardItem, id: string, update: (item: BoardItem) => BoardItem): BoardItem {
  if (item.id === id) return update(item);
  return item.type === 'column' ? { ...item, items: item.items.map(child => updateNested(child, id, update)) } : item;
}

export function useCrossItemDrop({ projectRef, onUpdateItem, pushHistory }: {
  projectRef: RefObject<Project>;
  pushHistory: () => void;
  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;
}) {
  // Both task types share id, text and done, so transfers preserve identity and completion.
  const dropTask = useCallback((sourceId: string, task: ChecklistEntry, clientX: number, clientY: number): boolean => {
    const hit = document.elementFromPoint(clientX, clientY);
    const container = hit?.closest<HTMLElement>('[data-checklist-id], [data-kanban-id]');
    const targetId = container?.dataset.checklistId ?? container?.dataset.kanbanId;
    if (!container || !targetId || targetId === sourceId) return false;
    const root = projectRef.current.items.find(item => findItem(item, targetId));
    const target = root && findItem(root, targetId);
    if (!root || !target || !['checklist', 'kanban'].includes(target.type)) return false;
    const columnElement = hit?.closest<HTMLElement>('[data-kanban-column-id]');
    const column = target.type === 'kanban' ? target.columns.find(column => column.id === columnElement?.dataset.kanbanColumnId) ?? target.columns[0] : undefined;
    if (target.type === 'kanban' && !column) return false;
    const rowsRoot = target.type === 'checklist' ? container : columnElement ?? Array.from(container.querySelectorAll<HTMLElement>('[data-kanban-column-id]')).find(el => el.dataset.kanbanColumnId === column?.id);
    const rows = Array.from(rowsRoot?.querySelectorAll<HTMLElement>(target.type === 'checklist' ? '[data-checklist-entry-index]' : '[data-kanban-card-id]') ?? []);
    const before = rows.findIndex(row => { const rect = row.getBoundingClientRect(); return clientY < rect.top + rect.height / 2; });
    const index = before < 0 ? rows.length : before;
    pushHistory();
    onUpdateItem(root.id, current => updateNested(current, targetId, item => insertTask(item, task, index, column?.id)));
    return true;
  }, [projectRef, onUpdateItem, pushHistory]);
  return { handleChecklistDropOutside: dropTask, handleKanbanCardDropOutside: dropTask };
}
