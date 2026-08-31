import type {
  BoardItem,
  ChecklistEntry,
  KanbanCard,
} from '@/entities/board/types';

export type BlockUpdateHandler = (
  updater: (item: BoardItem) => BoardItem,
) => void;

export type BlockDeleteHandler = () => void;

export type LineEndpointDragHandler = (
  event: React.MouseEvent,
  endpoint: 1 | 2,
) => void;

export type RequestDeleteHandler = (
  execute: () => void,
) => void;

export type EntryDroppedOutsideHandler = (
  entry: ChecklistEntry,
  clientX: number,
  clientY: number,
) => boolean;

export type CardDroppedOutsideHandler = (
  card: KanbanCard,
  clientX: number,
  clientY: number,
) => boolean;