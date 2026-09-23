import { translate, displayLabel } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { memo, useCallback, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { useReadOnlyNavigation } from '../hooks/useReadOnlyNavigation';
import ItemInspector from '@/features/inspector/ItemInspector';
import type { BoardItem } from '@/entities/board/types';
import BlockRenderer from '@/features/blocks/BlockRenderer';
import { getApproxItemSize } from '@/features/canvas/utils/itemGeometry';
import { resolveLineItem } from '@/features/canvas/utils/lineGeometry';
import ItemWatcher from '@/features/canvas/components/ItemWatcher';
import RemoteCursors from '@/features/canvas/components/RemoteCursors';
import type { RemoteCursor } from '@/features/projects/hooks/useCollaborationPresence';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';
import './sharing.css';

const noop = () => {};

/** Render existing block visuals without mounting any canvas mutation or history hooks. */
const ReadOnlyBlock = memo(function ReadOnlyBlock({
  item,
  onSelect,
  onOpenBoard,
  selected,
}: {
  item: BoardItem;
  onSelect?: (id: string) => void;
  onOpenBoard?: (id: string) => void;
  selected: boolean;
}) {
  useTranslation();
  const stopBoardNavigation = (event: SyntheticEvent) => {
    // Keep native selection, scrolling, links and copy actions working without
    // allowing a block interaction to start canvas navigation.
    event.stopPropagation();
  };
  const preventMutation = (event: SyntheticEvent) => {
    const target = event.target as HTMLElement;
    const allowed = target.closest('a, [data-read-only-action]');
    const mutatingControl = target.closest('button, input, select, textarea, [contenteditable="true"]');
    if (allowed) {
      return;
    }
    if (mutatingControl) {
      event.preventDefault();
      event.stopPropagation();
    } else {
      event.stopPropagation();
    }
  };
  return (
    <div
      className="read-only-block"
      aria-label={translate('{{value1}} block (read-only)', { value1: displayLabel(item.type) })}
      tabIndex={onSelect ? 0 : undefined}
      style={{ outline: selected ? '2px solid var(--color-accent)' : undefined }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect?.(item.id);
        }
      }}
      onClickCapture={(event) => {
        const nested = (event.target as Element).closest('[data-nested-item-id]');
        onSelect?.(nested?.getAttribute('data-nested-item-id') ?? item.id);
        preventMutation(event);
      }}
      onDoubleClickCapture={(event) => {
        if (item.type === 'board' && item.boardId) onOpenBoard?.(item.boardId);
        event.stopPropagation();
      }}
      onMouseDownCapture={stopBoardNavigation}
      onPointerDownCapture={stopBoardNavigation}
      onBeforeInputCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onChangeCapture={preventMutation}
      onDropCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragStartCapture={(event) => event.preventDefault()}
    >
      <BlockRenderer
        item={item}
        readOnly
        isSelected={selected}
        onOpenBoard={onOpenBoard}
        onUpdate={noop}
        onDelete={noop}
        onFitFrame={noop}
        onLineEndpointDrag={noop}
      />
    </div>
  );
});

export default function ReadOnlyBoard({
  items,
  inspect = false,
  canComment = false,
  currentUserId,
  onSaveComments,
  onOpenBoard,
  remoteCursors = [],
  onCursorMove,
}: {
  items: BoardItem[];
  inspect?: boolean;
  canComment?: boolean;
  currentUserId?: string;
  onSaveComments?: (itemId: string, comments: import('@/entities/board/types').ItemComment[]) => Promise<void>;
  onOpenBoard?: (boardId: string) => void;
  remoteCursors?: RemoteCursor[];
  onCursorMove?: (position: { x: number; y: number } | null) => void;
}) {
  useTranslation();
  const [selectedId, setSelectedId] = useState('');
  const findItem = (entries: BoardItem[]): BoardItem | undefined => {
    for (const item of entries) {
      if (item.id === selectedId) return item;
      if (item.type === 'column') {
        const nested = findItem(item.items);
        if (nested) return nested;
      }
    }
    return undefined;
  };
  const selected = findItem(items);
  const navigation = useReadOnlyNavigation();
  const { camera, touchMode } = navigation;
  const zoom = camera.zoom;
  const [measuredSizes, setMeasuredSizes] = useState<SizeMap>(() => new Map());
  const handleItemResize = useCallback((itemId: string, width: number, height: number) => {
    setMeasuredSizes((current) => {
      const previous = current.get(itemId);
      if (previous && Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5) {
        return current;
      }
      const next = new Map(current);
      next.set(itemId, { width, height });
      return next;
    });
  }, []);
  const rendered = useMemo(
    () => items.map((item) => (item.type === 'line' ? resolveLineItem(item, items, measuredSizes) : item)),
    [items, measuredSizes],
  );
  const { minX, minY, width, height } = useMemo(() => {
    let left = 0,
      top = 0,
      right = 800,
      bottom = 600;
    for (const item of rendered) {
      const size = getApproxItemSize(item);
      left = Math.min(left, item.x, item.type === 'line' ? item.x2 : item.x);
      top = Math.min(top, item.y, item.type === 'line' ? item.y2 : item.y);
      right = Math.max(right, item.type === 'line' ? Math.max(item.x, item.x2) : item.x + size.width);
      bottom = Math.max(bottom, item.type === 'line' ? Math.max(item.y, item.y2) : item.y + size.height);
    }
    return { minX: left - 40, minY: top - 40, width: right - left + 120, height: bottom - top + 120 };
  }, [rendered]);
  // Incoming items must not move the desktop camera's coordinate origin.
  const origin = useRef({ x: minX, y: minY });
  const offsetX = touchMode ? minX : origin.current.x;
  const offsetY = touchMode ? minY : origin.current.y;
  return (
    <section className="relative flex min-h-0 min-w-0 flex-1 flex-col" aria-label={translate('Read-only board')}>
      <div className="flex items-center gap-3 p-2 border-b" style={{ background: 'var(--color-surface)' }}>
        <span>{canComment ? translate('Commenter — select an item to comment') : translate('Read-only')}</span>
        <button aria-label={translate('Zoom out')} onClick={() => navigation.zoomBy(1 / 1.25)}>
          -
        </button>
        <button aria-label={translate('Reset zoom')} onClick={navigation.reset}>
          {Math.round(zoom * 100)}%
        </button>
        <button aria-label={translate('Zoom in')} onClick={() => navigation.zoomBy(1.25)}>
          +
        </button>
        <span className="text-sm">
          {touchMode ? translate('Scroll to explore') : translate('Drag to pan / Scroll to zoom')}
        </span>
      </div>
      <div
        ref={navigation.viewport}
        className={`relative flex-1 min-h-0 ${touchMode ? 'overflow-auto' : 'overflow-hidden'}`}
        onPointerDownCapture={navigation.pointerDown}
        onPointerMove={(event) => {
          navigation.pointerMove(event);
          if (event.pointerType !== 'mouse') return;
          const rect = event.currentTarget.getBoundingClientRect();
          onCursorMove?.({
            x: (event.clientX - rect.left - camera.x) / zoom + offsetX,
            y: (event.clientY - rect.top - camera.y) / zoom + offsetY,
          });
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') onCursorMove?.(null);
        }}
        onPointerUp={navigation.endDrag}
        onPointerCancel={navigation.endDrag}
        onLostPointerCapture={navigation.endDrag}
        onKeyDown={navigation.keyDown}
        onClickCapture={(event) => {
          if (navigation.suppressClick()) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        tabIndex={0}
        aria-label={
          touchMode
            ? translate('Scrollable board')
            : translate('Board navigation: drag to pan, scroll to zoom, or use arrow keys')
        }
        style={{
          background: 'var(--canvas-background)',
          cursor: touchMode ? undefined : navigation.dragging ? 'grabbing' : 'grab',
          touchAction: touchMode ? 'auto' : 'none',
        }}
      >
        {!items.length ? (
          <p className="p-8">{translate('This board is empty.')}</p>
        ) : (
          <div
            style={{
              width: touchMode ? width * zoom : '100%',
              height: touchMode ? height * zoom : '100%',
              position: 'relative',
            }}
          >
            <div
              style={{
                width,
                height,
                transform: touchMode ? `scale(${zoom})` : `translate(${camera.x}px, ${camera.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
                position: 'relative',
              }}
            >
              {rendered.map((item) => (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: item.x - offsetX,
                    top: item.y - offsetY,
                    zIndex: item.zIndex,
                    width: item.type === 'line' ? undefined : item.width,
                  }}
                >
                  <ItemWatcher itemId={item.id} onResize={handleItemResize}>
                    <ReadOnlyBlock
                      item={item}
                      selected={
                        selectedId === item.id ||
                        (item.type === 'column' && item.items.some((child) => child.id === selectedId))
                      }
                      onSelect={inspect ? setSelectedId : undefined}
                      onOpenBoard={onOpenBoard}
                    />
                  </ItemWatcher>
                </div>
              ))}
            </div>
          </div>
        )}
        {!touchMode && (
          <RemoteCursors
            cursors={remoteCursors}
            pan={{ x: camera.x - offsetX * zoom, y: camera.y - offsetY * zoom }}
            zoom={zoom}
          />
        )}
      </div>
      {inspect && selected && (
        <ItemInspector
          items={[selected]}
          readOnly
          canComment={canComment}
          currentUserId={currentUserId}
          onClose={() => setSelectedId('')}
          onUpdateAll={async (updater) => {
            if (!canComment || !onSaveComments) return;
            await onSaveComments(selected.id, updater(selected).comments ?? []);
          }}
        />
      )}
    </section>
  );
}
