import type { BoardItem } from '@/entities/board/types';

/** Restore presentation defaults without changing content, connections or dimensions. */
export function resetItemAppearance(item: BoardItem): BoardItem {
  const color = ['frame', 'section-title', 'line', 'drawing', 'icon'].includes(item.type) ? '#7C3AED' : '#ffffff';
  const base = {
    color,
    colorRole: undefined,
    gradient: undefined,
    topColor: undefined,
    backgroundOpacity: undefined,
    border: undefined,
  };
  if (item.type === 'text') return { ...item, ...base, color: undefined };
  if (item.type === 'frame') return { ...item, ...base, type: 'frame', color: '#7C3AED', opacity: undefined };
  if (item.type === 'board') return { ...item, ...base, type: 'board', icon: '', boardIcon: undefined };
  if (item.type === 'line')
    return {
      ...item,
      ...base,
      type: 'line',
      color: '#7C3AED',
      strokeWidth: 2,
      curve: 0,
      lineCap: undefined,
      arrowStart: false,
      arrowEnd: !item.divider,
    };
  if (item.type === 'drawing')
    return {
      ...item,
      ...base,
      type: 'drawing',
      color: '#7C3AED',
      strokeWidth: 3,
      strokes: item.strokes?.map((stroke) => ({ ...stroke, color: '#7C3AED', strokeWidth: 3 })),
    };
  return { ...item, ...base };
}

export function resetItemTypography(item: BoardItem): BoardItem {
  if (item.type === 'note') return { ...item, typography: undefined, fontSize: 'base' };
  if (item.type === 'line')
    return { ...item, typography: undefined, labelFontSize: 11, labelMode: 'horizontal', labelOffset: 14 };
  return { ...item, typography: undefined };
}
