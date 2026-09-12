import type { BaseItem } from '@/entities/board/types';
import type { ToolType } from '@/entities/board/toolTypes';

export const TOOL_DRAG_MOVE_EVENT = 'nodexmesh:tool-drag-move';
export const TOOL_DRAG_END_EVENT = 'nodexmesh:tool-drag-end';

export interface ToolDragDetail {
  extra?: { color: string; dispenserId: string; colorRole?: BaseItem['colorRole']; gradient?: BaseItem['gradient'] };
  tool: ToolType;
  clientX: number;
  clientY: number;
}

const DRAG_THRESHOLD = 6;

let suppressNextToolClick = false;

export function startToolDrag(
  tool: ToolType,
  event: React.MouseEvent,
  extra?: ToolDragDetail['extra'],
) {
  if (event.button !== 0 || tool === 'select') return;

  const startX = event.clientX;
  const startY = event.clientY;

  let dragging = false;

  const handleMove = (moveEvent: MouseEvent) => {
    const distance = Math.hypot(
      moveEvent.clientX - startX,
      moveEvent.clientY - startY,
    );

    if (!dragging && distance < DRAG_THRESHOLD) return;

    if (!dragging) {
      dragging = true;
      document.body.style.userSelect = 'none';
    }

    moveEvent.preventDefault();

    dispatchToolDragEvent(
      TOOL_DRAG_MOVE_EVENT,
      tool,
      moveEvent.clientX,
      moveEvent.clientY,
      extra,
    );
  };

  const handleUp = (upEvent: MouseEvent) => {
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleUp);

    document.body.style.userSelect = '';

    if (!dragging) return;

    suppressNextToolClick = true;

    dispatchToolDragEvent(
      TOOL_DRAG_END_EVENT,
      tool,
      upEvent.clientX,
      upEvent.clientY,
      extra,
    );

    window.setTimeout(() => {
      suppressNextToolClick = false;
    }, 0);
  };

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleUp);
}

export function consumeToolDragClickSuppression(): boolean {
  if (!suppressNextToolClick) return false;

  suppressNextToolClick = false;
  return true;
}

function dispatchToolDragEvent(
  eventName: string,
  tool: ToolType,
  clientX: number,
  clientY: number,
  extra?: ToolDragDetail['extra'],
) {
  window.dispatchEvent(
    new CustomEvent<ToolDragDetail>(eventName, {
      detail: {
        tool,
        extra,
        clientX,
        clientY,
      },
    }),
  );
}
