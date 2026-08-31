import type {
  BoardItem,
  ChecklistEntry,
  KanbanCard,
} from '@/entities/board/types';

export const NESTED_DRAG_MOVE_EVENT =
  'nodexmesh:nested-drag-move';

export const NESTED_DRAG_END_EVENT =
  'nodexmesh:nested-drag-end';

export type NestedDragPayload =
  | {
      kind: 'kanban-card';
      card: KanbanCard;
    }
  | {
      kind: 'checklist-entry';
      entry: ChecklistEntry;
    }
  | {
      kind: 'column-item';
      item: BoardItem;
      columnId: string;
    };

export interface NestedDragDetail {
  payload: NestedDragPayload;

  clientX: number;
  clientY: number;
}

export function emitNestedDragMove(
  payload: NestedDragPayload,
  clientX: number,
  clientY: number,
) {
  emit(
    NESTED_DRAG_MOVE_EVENT,
    payload,
    clientX,
    clientY,
  );
}

export function emitNestedDragEnd(
  payload: NestedDragPayload,
  clientX: number,
  clientY: number,
) {
  emit(
    NESTED_DRAG_END_EVENT,
    payload,
    clientX,
    clientY,
  );
}

function emit(
  eventName: string,
  payload: NestedDragPayload,
  clientX: number,
  clientY: number,
) {
  window.dispatchEvent(
    new CustomEvent<NestedDragDetail>(
      eventName,
      {
        detail: {
          payload,
          clientX,
          clientY,
        },
      },
    ),
  );
}