import { useCallback, useState } from 'react';
import type { RefObject } from 'react';
import type { BoardItem } from '@/entities/board/types';
import type { Project } from '@/entities/project/types';
import type { SizeMap } from '../utils/lineGeometry';
import { resolveLineItem } from '../utils/lineGeometry';
import { getFrameContents } from '../utils/frameGeometry';
import { cloneItems, copyOrigin } from '../utils/cloneItems';

// Board clipboard survives switching projects, and stays isolated per signed-in user.
const clipboards = new Map<string, BoardItem[]>();
export function useCanvasClipboard({
  projectRef,
  selectedIdsRef,
  measuredSizes,
  pushHistory,
  onRestoreItems,
  onSelectItems,
  pastePoint,
  nestedSelection,
  clearColumnSelection,
}: {
  nestedSelection?: { columnId: string; item: BoardItem } | null;
  clearColumnSelection: () => void;
  projectRef: RefObject<Project>;
  selectedIdsRef: RefObject<string[]>;
  measuredSizes: SizeMap;
  pushHistory: () => void;
  onRestoreItems: (items: BoardItem[]) => void;
  onSelectItems: (ids: string[]) => void;
  pastePoint: () => { x: number; y: number };
}) {
  const [revision, setRevision] = useState(0);
  const selected = useCallback(() => {
    const all = projectRef.current.items;
    if (nestedSelection) {
      const column = all.find((item) => item.id === nestedSelection.columnId);
      const child =
        column?.type === 'column' ? column.items.find((item) => item.id === nestedSelection.item.id) : undefined;
      return column && child ? [{ ...child, x: column.x + (column.width ?? 320) + 24, y: column.y }] : [];
    }
    const ids = new Set(selectedIdsRef.current);
    all
      .filter((item) => ids.has(item.id) && item.type === 'frame')
      .forEach((frame) => {
        if (frame.type === 'frame') getFrameContents(frame, all).forEach((item) => ids.add(item.id));
      });
    all.forEach((item) => {
      if (
        item.type === 'line' &&
        item.startItemId &&
        item.endItemId &&
        ids.has(item.startItemId) &&
        ids.has(item.endItemId)
      )
        ids.add(item.id);
    });
    return all
      .filter((item) => ids.has(item.id))
      .map((item) => (item.type === 'line' ? resolveLineItem(item, all, measuredSizes) : item));
  }, [projectRef, selectedIdsRef, measuredSizes, nestedSelection]);
  const copy = useCallback(() => {
    const items = selected();
    if (!items.length) return;
    clipboards.set(projectRef.current.ownerId, structuredClone(items));
    setRevision((value) => value + 1);
  }, [selected, projectRef]);
  const insert = useCallback(
    (items: BoardItem[], dx: number, dy: number) => {
      if (!items.length) return;
      const all = projectRef.current.items;
      const copies = cloneItems(items, dx, dy, Math.max(0, ...all.map((item) => item.zIndex)) + 1);
      pushHistory();
      onRestoreItems([...all, ...copies]);
      clearColumnSelection();
      onSelectItems(copies.map((item) => item.id));
    },
    [projectRef, pushHistory, onRestoreItems, onSelectItems, clearColumnSelection],
  );
  const paste = useCallback(
    (at?: { x: number; y: number }) => {
      const items = clipboards.get(projectRef.current.ownerId);
      if (!items?.length) return;
      const origin = copyOrigin(items);
      const point = at ?? pastePoint();
      insert(items, point.x - origin.x, point.y - origin.y);
    },
    [projectRef, pastePoint, insert],
  );
  const duplicate = useCallback(() => insert(selected(), 32, 32), [insert, selected]);
  return { copy, paste, duplicate, canPaste: Boolean(clipboards.get(projectRef.current.ownerId)?.length), revision };
}
