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
    color: '#ffffff',
    typography: undefined
  };

  switch (type) {
    case 'timeline':
      return { ...base, type, title: 'Project timeline', mode: 'simple', tasks: [], width: ITEM_WIDTH.timeline, height: 520 };
    case 'database':
      return { ...base, type, title: 'Database schema', tables: [], relations: [], width: ITEM_WIDTH.database, height: 600 };
    case 'diagram':
      return { ...base, type, title: 'System diagram', nodes: [], edges: [], width: ITEM_WIDTH.diagram, height: 560 };
    case 'document':
      return { ...base, type, title: 'Untitled document', content: '', width: ITEM_WIDTH.document, height: 600, autoHeight: true };
    case 'embed':
      return { ...base, type, title: '', url: '', showLabel: false, width: ITEM_WIDTH.embed, height: 320 };
    case 'code':
      return { ...base, type, content: '', language: 'javascript', width: ITEM_WIDTH.code, height: 280 };
    case 'dispenser':
      return { ...base, type, title: 'Quick thoughts', color: '#ffffff', width: ITEM_WIDTH.dispenser, height: 200 };
    case 'note':
      return {
        ...base,
        type: 'note',
        content: '',
        color: typeof extra?.color === 'string' ? extra.color : '#ffffff',
        colorRole: extra?.colorRole as NoteItem['colorRole'],
        gradient: extra?.gradient as NoteItem['gradient'],
        dispenserId: typeof extra?.dispenserId === 'string' ? extra.dispenserId : undefined,
        height: extra?.dispenserId ? 160 : undefined,
        typography: extra?.dispenserId ? { textAlign: 'center', verticalAlign: 'middle' } : undefined,
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
        color: undefined,
        content: 'Heading',
        size: 'lg',
        width: ITEM_WIDTH.text
      } as TextItem;

    case 'frame':
      return {
        ...base,
        type: 'frame',
        zIndex: 0,
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
        color: '#ffffff',
        width: ITEM_WIDTH.checklist,
        entries: [],
      } as ChecklistItem;

    case 'divider':
    case 'line':
      return {
        ...base,
        type: 'line',
        divider: type === 'divider',
        x: type === 'divider' ? Math.round(x / 16) * 16 : x,
        y: type === 'divider' ? Math.round(y / 16) * 16 : y,
        x2: (type === 'divider' ? Math.round(x / 16) * 16 : x) + ITEM_WIDTH.line,
        y2: type === 'divider' ? Math.round(y / 16) * 16 : y,
        arrowStart: false,
        arrowEnd: type !== 'divider',
        color: '#7C3AED',
        strokeWidth: 2,
        label: '',
        labelMode: 'horizontal',
        labelOffset: 14,
        labelFontSize: 11,
      } as LineItem;

    case 'column':
      return {
        ...base,
        type: 'column',
        title: 'Column',
        color: '#ffffff',
        width: ITEM_WIDTH.column,
        layout: 'vertical',
        gridColumns: 2,
        gap: 10,
        items: [],
      } as ColumnItem;

    default:
      return null;
  }
}
