import type {
  BoardItem,
  ChecklistItem,
  ColumnItem,
  FrameItem,
  ImageItem,
  KanbanItem,
  LineItem,
  LinkItem,
  NoteItem,
  TextItem,
} from '@/entities/board/types';

import { ITEM_WIDTH } from '@/features/canvas/constants';

import type { ToolType } from '@/entities/board/toolTypes';

function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createCanvasItem(
  type: ToolType,
  x: number,
  y: number,
  extra?: Record<string, unknown>,
): BoardItem | null {
  const base = {
    id: createId(),
    x,
    y,
    zIndex: 1,
  };

  switch (type) {
    case 'note':
      return {
        ...base,
        type: 'note',
        content: '',
        color: '#0d2a35',
        width: ITEM_WIDTH.note,
      } as NoteItem;

    case 'kanban':
      return {
        ...base,
        type: 'kanban',
        title: 'New Board',
        width: ITEM_WIDTH.kanban,
        columns: [
          {
            id: createId(),
            title: 'To Do',
            color: '#5a8a94',
            cards: [],
          },
          {
            id: createId(),
            title: 'In Progress',
            color: '#FFBD65',
            cards: [],
          },
          {
            id: createId(),
            title: 'Done',
            color: '#7C3AED',
            cards: [],
          },
        ],
      } as KanbanItem;

    case 'image':
      return {
        ...base,
        type: 'image',
        url: '',
        caption: '',
        width: ITEM_WIDTH.image,
        imgHeight: 192,
      } as ImageItem;

    case 'link':
      return {
        ...base,
        type: 'link',
        url: '',
        title: 'New Link',
        description: '',
        width: ITEM_WIDTH.link,
      } as LinkItem;

    case 'text':
      return {
        ...base,
        type: 'text',
        content: 'Heading',
        size: 'lg',
        width: ITEM_WIDTH.text
      } as TextItem;

    case 'frame':
      return {
        ...base,
        type: 'frame',
        title: 'Group',
        width:
          typeof extra?.width === 'number'
            ? extra.width
            : ITEM_WIDTH.frame,
        height:
          typeof extra?.height === 'number'
            ? extra.height
            : 256,
        color: '#7C3AED',
      } as FrameItem;

    case 'checklist':
      return {
        ...base,
        type: 'checklist',
        title: 'Checklist',
        color: '#0d2a35',
        width: ITEM_WIDTH.checklist,
        entries: [],
      } as ChecklistItem;

    case 'line':
      return {
        ...base,
        type: 'line',
        x2: x + ITEM_WIDTH.line,
        y2: y,
        arrowStart: false,
        arrowEnd: true,
        color: '#7C3AED',
        strokeWidth: 2,
      } as LineItem;

    case 'column':
      return {
        ...base,
        type: 'column',
        title: 'Column',
        color: '#f0f9ff',
        width: ITEM_WIDTH.column,
        items: [],
      } as ColumnItem;

    default:
      return null;
  }
}