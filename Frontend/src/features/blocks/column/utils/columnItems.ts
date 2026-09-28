import { translate } from '@/shared/i18n';
import type { BoardItem } from '@/entities/board/types';
import { createCanvasItem } from '@/features/canvas/utils/createCanvasItem';
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

export type ColumnChildType = 'note' | 'checklist' | 'link' | 'text' | 'image' | 'file' | 'document' | 'code' | 'embed';

export const COLUMN_ADD_TYPES: { kind: ColumnChildType; label: string; icon: string }[] = [
  {
    kind: 'document',
    get label() {
      return translate('Document');
    },
    icon: '📄',
  },
  {
    kind: 'code',
    get label() {
      return translate('Code');
    },
    icon: '</>',
  },
  {
    kind: 'embed',
    get label() {
      return translate('Embed');
    },
    icon: '▶',
  },
  {
    kind: 'note',
    get label() {
      return translate('Note');
    },
    icon: '📝',
  },
  {
    kind: 'checklist',
    get label() {
      return translate('Checklist');
    },
    icon: '✅',
  },
  {
    kind: 'link',
    get label() {
      return translate('Link');
    },
    icon: '🔗',
  },
  {
    kind: 'text',
    get label() {
      return translate('Text');
    },
    icon: 'T',
  },
  {
    kind: 'image',
    get label() {
      return translate('Image');
    },
    icon: '🖼',
  },
  {
    kind: 'file',
    get label() {
      return translate('File');
    },
    icon: 'F',
  },
];

export function createDefaultColumnItem(kind: ColumnChildType): BoardItem {
  const item = createCanvasItem(kind, 0, 0);
  if (!item) throw new Error(translate('Unsupported column item:') + ' ' + kind);
  return item.type === 'document' || item.type === 'code' ? { ...item, autoHeight: true } : item;
}

export function isLightColor(hex: string): boolean {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  return (red * 299 + green * 587 + blue * 114) / 1000 > 155;
}
