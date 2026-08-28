import type { BoardItem } from '@/entities/board/types';

export const LIGHT_BACKGROUNDS = [
  '#ffffff', '#fefce8', '#f0fdf4', '#eff6ff',
  '#fdf4ff', '#fff7ed', '#f1f5f9', '#fce7f3',
];

export const DARK_BACKGROUNDS = [
  '#0d2a35', '#1e1b4b', '#14532d',
  '#1c1917', '#0c4a6e', '#431407',
];

export const STRIP_COLORS = [
  '#7C3AED', '#FFBD65', '#FF6B8A', '#02A0A0',
  '#059669', '#3b82f6', '#f97316', '#e11d48',
];

export const LINE_COLORS = [
  '#7C3AED', '#FFBD65', '#FF6B8A',
  '#02A0A0', '#e8f4f4', '#5a8a94',
];

export const FRAME_COLORS = [
  '#7C3AED', '#FFBD65', '#02A0A0',
  '#FF6B8A', '#059669', '#3b82f6',
];

export const BACKGROUND_ITEM_TYPES = new Set<BoardItem['type']>([
  'note',
  'checklist',
  'link',
  'image',
  'kanban',
  'column',
  'text',
]);

export const ITEM_TYPE_LABELS: Partial<Record<BoardItem['type'], string>> = {
  note: 'Note',
  kanban: 'Kanban',
  image: 'Image',
  link: 'Link',
  text: 'Text',
  frame: 'Frame',
  checklist: 'Checklist',
  line: 'Line/Arrow',
  column: 'Column',
};