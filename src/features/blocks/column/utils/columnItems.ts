import type {
  BoardItem,
  ChecklistItem,
  ImageItem,
  LinkItem,
  NoteItem,
  TextItem,
} from '@/entities/board/types';

export const COLUMN_BG_COLORS = [
  '#f0f9ff',
  '#fefce8',
  '#f0fdf4',
  '#fdf4ff',
  '#fff7ed',
  '#f8fafc',
  '#e0f2fe',
  '#dcfce7',
  '#ede9fe',
  '#fce7f3',
] as const;

export type ColumnChildType = 'note' | 'checklist' | 'link' | 'text' | 'image';

export const COLUMN_ADD_TYPES: {
  kind: ColumnChildType;
  label: string;
  icon: string;
}[] = [
  { kind: 'note', label: 'Note', icon: '📝' },
  { kind: 'checklist', label: 'Checklist', icon: '✅' },
  { kind: 'link', label: 'Link', icon: '🔗' },
  { kind: 'text', label: 'Text', icon: 'T' },
  { kind: 'image', label: 'Image', icon: '🖼' },
];

function createId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function createDefaultColumnItem(kind: ColumnChildType): BoardItem {
  const base = {
    id: createId(),
    x: 0,
    y: 0,
    zIndex: 1,
  };

  switch (kind) {
    case 'note':
      return {
        ...base,
        type: 'note',
        content: '',
        color: '#fefce8',
        width: 240,
      } as NoteItem;

    case 'checklist':
      return {
        ...base,
        type: 'checklist',
        title: 'Checklist',
        color: '#f0fdf4',
        entries: [],
      } as ChecklistItem;

    case 'link':
      return {
        ...base,
        type: 'link',
        url: '',
        title: 'New Link',
        description: '',
      } as LinkItem;

    case 'image':
      return {
        ...base,
        type: 'image',
        url: '',
        caption: '',
        width: 240,
        imgHeight: 150,
      } as ImageItem;

    case 'text':
      return {
        ...base,
        type: 'text',
        content: 'Text',
        size: 'md',
      } as TextItem;
  }
}

export function isLightColor(hex: string): boolean {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  return (red * 299 + green * 587 + blue * 114) / 1000 > 155;
}