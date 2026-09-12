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

export type ColumnChildType = 'note' | 'checklist' | 'link' | 'text' | 'image' | 'document' | 'code' | 'embed';

export const COLUMN_ADD_TYPES: {
  kind: ColumnChildType;
  label: string;
  icon: string;
}[] = [
  { kind: 'document', label: 'Document', icon: '📄' },
  { kind: 'code', label: 'Code', icon: '</>' },
  { kind: 'embed', label: 'Embed', icon: '▶' },
  { kind: 'note', label: 'Note', icon: '📝' },
  { kind: 'checklist', label: 'Checklist', icon: '✅' },
  { kind: 'link', label: 'Link', icon: '🔗' },
  { kind: 'text', label: 'Text', icon: 'T' },
  { kind: 'image', label: 'Image', icon: '🖼' },
];

export function createDefaultColumnItem(kind: ColumnChildType): BoardItem {
  const item = createCanvasItem(kind, 0, 0);
  if (!item) throw new Error('Unsupported column item: ' + kind);
  return item.type === 'document' || item.type === 'code' ? { ...item, autoHeight: true } : item;
}

export function isLightColor(hex: string): boolean {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  return (red * 299 + green * 587 + blue * 114) / 1000 > 155;
}