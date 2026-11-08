import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from '../utils/lineGeometry';
import type { DragGeometry } from '../types';
import { getItemRect } from '../utils/itemGeometry';

export default function GroupSelection({
  items,
  selectedIds,
  sizes,
  overrides,
}: {
  items: BoardItem[];
  selectedIds: readonly string[];
  sizes: SizeMap;
  overrides: ReadonlyMap<string, DragGeometry>;
}) {
  const selected = new Set(selectedIds);
  const groups = new Set(items.filter((item) => selected.has(item.id) && item.groupId).map((item) => item.groupId));
  return [...groups].map((groupId) => {
    const rects = items
      .filter((item) => item.groupId === groupId)
      .map((item) => getItemRect({ ...item, ...overrides.get(item.id) } as BoardItem, sizes));
    const x = Math.min(...rects.map((rect) => rect.x)) - 6;
    const y = Math.min(...rects.map((rect) => rect.y)) - 6;
    return (
      <div
        key={groupId}
        data-group-selection={groupId}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          left: x,
          top: y,
          width: Math.max(...rects.map((rect) => rect.right)) - x + 6,
          height: Math.max(...rects.map((rect) => rect.bottom)) - y + 6,
          border: '1px dashed var(--color-accent)',
          zIndex: 45,
        }}
      />
    );
  });
}
