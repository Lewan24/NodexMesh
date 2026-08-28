import type { TextItem } from '@/entities/board/types';

export const TEXT_SIZE_STYLES: Record<TextItem['size'], string> = {
  sm: 'text-sm font-normal',
  md: 'text-base font-medium',
  lg: 'text-2xl font-bold',
  xl: 'text-4xl font-extrabold',
};

export const TEXT_SIZE_LABELS: TextItem['size'][] = [
  'sm',
  'md',
  'lg',
  'xl',
];

export const DEFAULT_TEXT_CARD_WIDTH = 220;

export function isLightColor(hex: string): boolean {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  return (red * 299 + green * 587 + blue * 114) / 1000 > 128;
}