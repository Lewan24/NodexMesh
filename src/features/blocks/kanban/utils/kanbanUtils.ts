import { createId } from '@/shared/lib/createId';
import type { KanbanCard, KanbanColumn } from '@/entities/board/types';

export const KANBAN_COLUMN_COLORS = ['#5a8a94', '#FFBD65', '#7C3AED', '#02A0A0', '#FF6B8A', '#059669'] as const;

export const DEFAULT_KANBAN_COLUMN_WIDTH = 180;
export const MIN_KANBAN_COLUMN_WIDTH = 180;

export function getKanbanMinWidth(columnCount: number): number {
  const count = Math.max(1, columnCount);
  // Include row padding, gaps and room for the vertical scrollbar.
  return Math.max(288, count * MIN_KANBAN_COLUMN_WIDTH + 24 + (count - 1) * 8 + 16);
}

export function equalizeKanbanColumns(columns: KanbanColumn[]): KanbanColumn[] {
  return columns.map((column) => ({ ...column, width: DEFAULT_KANBAN_COLUMN_WIDTH }));
}

// Keep legacy pixel values as relative weights so saved boards retain their proportions.
export function getColumnWeight(column: KanbanColumn): number {
  return Number.isFinite(column.width) && column.width! > 0 ? column.width! : DEFAULT_KANBAN_COLUMN_WIDTH;
}

export function getColumnShare(columns: KanbanColumn[], columnId: string): number {
  const total = columns.reduce((sum, column) => sum + getColumnWeight(column), 0);
  const column = columns.find((column) => column.id === columnId);
  return column && total ? getColumnWeight(column) / total : 0;
}

export function setColumnShare(columns: KanbanColumn[], columnId: string, share: number): KanbanColumn[] {
  if (columns.length < 2 || !Number.isFinite(share) || !columns.some((column) => column.id === columnId)) {
    return columns;
  }

  const nextShare = Math.max(0.01, Math.min(0.99, share));
  const otherWeight = columns.reduce((sum, column) => sum + (column.id === columnId ? 0 : getColumnWeight(column)), 0);
  const totalWeight = columns.length * DEFAULT_KANBAN_COLUMN_WIDTH;

  return columns.map((column) => ({
    ...column,
    width:
      totalWeight * (column.id === columnId ? nextShare : ((1 - nextShare) * getColumnWeight(column)) / otherWeight),
  }));
}

export function appendKanbanColumn(columns: KanbanColumn[]): KanbanColumn[] {
  const width = columns.length
    ? columns.reduce((sum, column) => sum + getColumnWeight(column), 0) / columns.length
    : DEFAULT_KANBAN_COLUMN_WIDTH;
  return [...columns, { ...createKanbanColumn(columns.length), width }];
}

export const DEFAULT_KANBAN_BACKGROUND = '#ffffff';

export { createId } from '@/shared/lib/createId';

export function createKanbanCard(text: string): KanbanCard {
  return { id: createId(), text, done: false };
}

export function createKanbanColumn(index: number): KanbanColumn {
  const color = KANBAN_COLUMN_COLORS[index % KANBAN_COLUMN_COLORS.length] ?? KANBAN_COLUMN_COLORS[0];

  return { id: createId(), title: 'New', color, cards: [], width: DEFAULT_KANBAN_COLUMN_WIDTH };
}

export function isLightColor(hex: string): boolean {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  return (red * 299 + green * 587 + blue * 114) / 1000 > 155;
}
