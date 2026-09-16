import { memo, useMemo, useRef, type SyntheticEvent } from 'react';
import { useReadOnlyNavigation } from '../hooks/useReadOnlyNavigation';
import type { BoardItem } from '@/entities/board/types';
import BlockRenderer from '@/features/blocks/BlockRenderer';
import { getApproxItemSize } from '@/features/canvas/utils/itemGeometry';
import { resolveLineItem } from '@/features/canvas/utils/lineGeometry';
import './sharing.css';

const noop = () => {};

/** Render existing block visuals without mounting any canvas mutation, history or clipboard hooks. */
const ReadOnlyBlock = memo(function ReadOnlyBlock({ item }: { item: BoardItem }) {
  const stopEditing = (event: SyntheticEvent) => {
    // Preserve native selection, scrolling and link navigation, but do not dispatch
    // editor activation or drag handlers in the reused interactive blocks.
    event.stopPropagation();
  };
  return (
    <fieldset
      disabled
      className="read-only-block"
      aria-label={`${item.type} block (read-only)`}
      onClickCapture={stopEditing}
      onDoubleClickCapture={stopEditing}
      onMouseDownCapture={stopEditing}
      onPointerDownCapture={stopEditing}
      onKeyDownCapture={stopEditing}
      onBeforeInputCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDropCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragStartCapture={(event) => event.preventDefault()}
    >
      <BlockRenderer
        item={item}
        isSelected={false}
        onUpdate={noop}
        onDelete={noop}
        onFitFrame={noop}
        onLineEndpointDrag={noop}
      />
    </fieldset>
  );
});

export default function ReadOnlyBoard({ items }: { items: BoardItem[] }) {
  const navigation = useReadOnlyNavigation();
  const { camera, touchMode } = navigation;
  const zoom = camera.zoom;
  const rendered = useMemo(
    () => items.map((item) => (item.type === 'line' ? resolveLineItem(item, items) : item)),
    [items],
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
    <section className="relative flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Read-only board">
      <div className="flex items-center gap-3 p-2 border-b" style={{ background: 'var(--color-surface)' }}>
        <span>Read-only</span>
        <button aria-label="Zoom out" onClick={() => navigation.zoomBy(1 / 1.25)}>
          -
        </button>
        <button aria-label="Reset zoom" onClick={navigation.reset}>
          {Math.round(zoom * 100)}%
        </button>
        <button aria-label="Zoom in" onClick={() => navigation.zoomBy(1.25)}>
          +
        </button>
        <span className="text-sm">{touchMode ? 'Scroll to explore' : 'Drag to pan / Scroll to zoom'}</span>
      </div>
      <div
        ref={navigation.viewport}
        className={`relative flex-1 min-h-0 ${touchMode ? 'overflow-auto' : 'overflow-hidden'}`}
        onPointerDownCapture={navigation.pointerDown}
        onPointerMove={navigation.pointerMove}
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
        aria-label={touchMode ? 'Scrollable board' : 'Board navigation: drag to pan, scroll to zoom, or use arrow keys'}
        style={{
          background: 'var(--canvas-background)',
          cursor: touchMode ? undefined : navigation.dragging ? 'grabbing' : 'grab',
          touchAction: touchMode ? 'auto' : 'none',
        }}
      >
        {!items.length ? (
          <p className="p-8">This board is empty.</p>
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
                  <ReadOnlyBlock item={item} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
