import type { BoardItem, BaseItem } from '@/entities/board/types';
export type ItemStyle = Pick<BaseItem, 'color' | 'colorRole' | 'gradient' | 'topColor' | 'typography'>;
export function copyItemStyle(item: BoardItem): ItemStyle {
  return structuredClone({ color: item.color, colorRole: item.colorRole, gradient: item.gradient, topColor: item.topColor, typography: item.typography });
}
export type StyleParts = { fill: boolean; strip: boolean; typography: boolean };
export const allStyleParts: StyleParts = { fill: true, strip: true, typography: true };
export function pasteItemStyle(item: BoardItem, style: ItemStyle, parts: StyleParts = allStyleParts): BoardItem {
  if (item.locked) return item;
  // Geometry, content, identity and frame ownership are deliberately excluded.
  const copy = structuredClone(style);
  return { ...item,
    ...(parts.fill ? { color: copy.color ?? (['note', 'dispenser', 'drawing', 'line'].includes(item.type) ? '#ffffff' : undefined), colorRole: copy.colorRole, gradient: copy.gradient } : {}),
    ...(parts.strip ? { topColor: copy.topColor } : {}),
    ...(parts.typography ? { typography: copy.typography } : {}),
  } as BoardItem;
}
