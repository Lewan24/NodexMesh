import { useState } from 'react';

import type { BoardItem, FrameItem } from '@/entities/board/types';

import BlockRenderer from '@/features/blocks/BlockRenderer';
import { getTypographyStyle } from '@/features/blocks/typography/typographyUtils';
import ResizeHandles from '@/features/canvas/components/ResizeHandles';
import type { ResizeDirection } from '@/features/canvas/types';

function getFrameLabelScale(zoom: number): number {
  if (zoom >= 1) return 1;
  return Math.min(3.2, 1 / zoom);
}

function getFrameLabelMode(zoom: number): 'normal' | 'overview' | 'far' {
  if (zoom >= 0.65) return 'normal';
  if (zoom >= 0.3) return 'overview';
  return 'far';
}

interface CanvasFrameProps {
  item: FrameItem;
  zoom: number;
  isSelected: boolean;
  isAnimating: boolean;
  selectedIds: string[];

  isSettling?: boolean;
  isDragging?: boolean;
  dragTilt?: number;
  isAttachTarget?: boolean;

  onMouseDown: (id: string, event: React.MouseEvent) => void;
  onAnimationEnd: (id: string) => void;

  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;

  onDeleteItem: (id: string) => void;
  onSelectItems: (ids: string[]) => void;

  onRequestDelete: (
    execute: () => void,
    count?: number,
  ) => void;

  onItemResize: (
    id: string,
    event: React.MouseEvent,
    direction: ResizeDirection,
  ) => void;

  onFitFrame: (id: string) => void;
}

export default function CanvasFrame({
  item,
  isSelected,
  isAnimating,
  selectedIds,
  isSettling = false,
  isDragging = false,
  dragTilt = 0,
  isAttachTarget = false,
  zoom,
  onMouseDown,
  onAnimationEnd,
  onUpdateItem,
  onDeleteItem,
  onSelectItems,
  onRequestDelete,
  onItemResize,
  onFitFrame,
}: CanvasFrameProps) {
  const [editingTitle, setEditingTitle] = useState(false);

  const labelScale = getFrameLabelScale(zoom);
  const labelMode = getFrameLabelMode(zoom);
  const typographyStyle = getTypographyStyle(item);

  return (
    <div
      data-board-item="true"
      data-frame-id={item.id}
      className={`absolute ${
        isAnimating ? 'board-item-enter' : ''
      } ${
        isDragging ? 'board-item-dragging' : ''
      } ${
        isSettling ? 'board-item-settling' : ''
      }`}
      style={{
        left: item.x,
        top: item.y,
        zIndex: item.zIndex,
        transform: isDragging
          ? `
              perspective(900px)
              rotateY(${dragTilt}deg)
              rotateZ(${dragTilt * 0.18}deg)
              translateZ(8px)
              scale(1.012)
            `
          : undefined,
        transformOrigin: 'center center',
      }}
      onMouseDown={event => onMouseDown(item.id, event)}
      onAnimationEnd={() => onAnimationEnd(item.id)}
    >
      {/* Semantic frame label */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: 8,
          top: -10,
          transform: `translateY(-100%) scale(${labelScale})`,
          transformOrigin: 'bottom left',
          zIndex: 50,
        }}
        onMouseDown={event => event.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 rounded-xl"
          style={{
            padding: labelMode === 'far' ? '6px 11px' : '4px 9px',
            backgroundColor:
              labelMode === 'far'
                ? item.color
                : 'var(--color-surface-translucent)',
            border:
              labelMode === 'far'
                ? 'none'
                : `1px solid ${item.color}66`,
            boxShadow:
              labelMode === 'far'
                ? '0 4px 14px rgba(0,0,0,0.18)'
                : '0 2px 8px rgba(0,0,0,0.08)',
            backdropFilter:
              labelMode === 'far'
                ? undefined
                : 'blur(8px)',
            maxWidth: Math.max(160, Math.min(item.width, 420)),
          }}
        >
          <div
            className="rounded-full flex-shrink-0"
            style={{
              width: labelMode === 'far' ? 7 : 6,
              height: labelMode === 'far' ? 7 : 6,
              backgroundColor:
                labelMode === 'far'
                  ? '#fff'
                  : item.color,
            }}
          />

          {editingTitle ? (
            <input
              autoFocus
              value={item.title}
              onChange={event =>
                onUpdateItem(
                  item.id,
                  current =>
                    current.type === 'frame'
                      ? {
                          ...current,
                          title: event.target.value,
                        }
                      : current,
                )
              }
              onBlur={() => setEditingTitle(false)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === 'Escape') {
                  setEditingTitle(false);
                }
              }}
              onMouseDown={event => event.stopPropagation()}
              className="bg-transparent outline-none min-w-0"
              style={{
                color: labelMode === 'far' ? '#fff' : item.color,
                minWidth: 100,
                maxWidth: 300,
                ...typographyStyle,
                fontSize: item.typography?.fontSize
                  ? `${item.typography.fontSize}px`
                  : '14px',
                fontWeight: item.typography?.bold ? 700 : 650,
              }}
            />
          ) : (
            <span
              className="truncate cursor-text select-none whitespace-nowrap"
              style={{
                color: labelMode === 'far' ? '#fff' : item.color,
                ...typographyStyle,
                fontSize: item.typography?.fontSize
                  ? `${item.typography.fontSize}px`
                  : '14px',
                fontWeight: item.typography?.bold ? 700 : 650,
                textTransform: labelMode === 'far' ? 'uppercase' : undefined,
                letterSpacing: labelMode === 'far' ? '0.06em' : undefined,
              }}
              title={item.title}
              onDoubleClick={() => setEditingTitle(true)}
            >
              {item.title || 'Untitled frame'}
            </span>
          )}
        </div>
      </div>

      {/* Selection */}
      {isSelected && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{
            inset: -4,
            boxShadow:
              '0 0 0 2px var(--color-accent), 0 0 12px rgba(124,58,237,0.25)',
          }}
        />
      )}

      {/* Line attach target */}
      {isAttachTarget && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{
            inset: -6,
            boxShadow:
              '0 0 0 3px var(--color-accent), 0 0 18px rgba(124,58,237,0.35)',
          }}
        />
      )}

      {/* Resize */}
      {isSelected && (
        <ResizeHandles
          visible
          onResizeStart={(event, direction) =>
            onItemResize(item.id, event, direction)
          }
        />
      )}

      <BlockRenderer
        item={item}
        isSelected={isSelected}
        onUpdate={updater => onUpdateItem(item.id, updater)}
        onDelete={() =>
          onRequestDelete(() => {
            onDeleteItem(item.id);
            onSelectItems(selectedIds.filter(id => id !== item.id));
          })
        }
        onFitFrame={() => onFitFrame(item.id)}
        onLineEndpointDrag={() => {}}
      />
    </div>
  );
}