import type { KanbanCard, KanbanColumn } from '@/entities/board/types';

export const KANBAN_COLUMN_COLORS = [
  '#5a8a94',
  '#FFBD65',
  '#7C3AED',
  '#02A0A0',
  '#FF6B8A',
  '#059669',
] as const;

export const DEFAULT_KANBAN_COLUMN_WIDTH = 180;
export const MIN_KANBAN_COLUMN_WIDTH = 140;
export const MAX_KANBAN_COLUMN_WIDTH = 600;

export const DEFAULT_KANBAN_BACKGROUND = '#08171d';

export function createId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function createKanbanCard(text: string): KanbanCard {
  return {
    id: createId(),
    text,
    done: false,
  };
}

export function createKanbanColumn(index: number): KanbanColumn {
  const color =
    KANBAN_COLUMN_COLORS[index % KANBAN_COLUMN_COLORS.length] ??
    KANBAN_COLUMN_COLORS[0];

  return {
    id: createId(),
    title: 'New',
    color,
    cards: [],
    width: DEFAULT_KANBAN_COLUMN_WIDTH,
  };
}

export function isLightColor(hex: string): boolean {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  return (red * 299 + green * 587 + blue * 114) / 1000 > 155;
}