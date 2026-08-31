import { BoardItem } from '@/entities/board/types';
import type {
  NestedDragPayload,
} from '@/features/canvas/utils/nestedDrag';

interface NestedDragGhostProps {
  payload: NestedDragPayload;
  clientX: number;
  clientY: number;
}

export default function NestedDragGhost({
  payload,
  clientX,
  clientY,
}: NestedDragGhostProps) {
  return (
    <div
      className="
        fixed
        pointer-events-none

        rounded-xl
        border

        px-3
        py-2

        flex
        items-center
        gap-2
      "
      style={{
        left: clientX + 14,
        top: clientY + 12,

        zIndex: 10000,

        minWidth: 150,
        maxWidth: 260,

        backgroundColor:
          'var(--color-surface-translucent)',

        borderColor:
          'var(--color-accent)',

        boxShadow:
          '0 14px 32px rgba(0,0,0,0.2), 0 0 0 2px rgba(124,58,237,0.08)',

        backdropFilter:
          'blur(10px)',

        transform:
          'rotate(1.5deg) scale(1.02)',

        opacity: 0.92,
      }}
    >
      <DragIcon />

      <div className="min-w-0 flex-1">
        <div
          className="
            text-[9px]
            uppercase
            tracking-widest
            font-semibold
          "
          style={{
            color:
              'var(--color-text-faint)',
          }}
        >
          {getTypeLabel(payload)}
        </div>

        <div
          className="
            text-xs
            font-medium
            truncate
          "
          style={{
            color:
              'var(--color-text-primary)',
          }}
        >
          {getText(payload)}
        </div>
      </div>
    </div>
  );
}

function getTypeLabel(
  payload: NestedDragPayload,
): string {
  switch (payload.kind) {
    case 'kanban-card':
      return 'Kanban card';

    case 'checklist-entry':
      return 'Checklist item';

    case 'column-item':
      return payload.item.type;
  }
}

function getText(
  payload: NestedDragPayload,
): string {
  switch (payload.kind) {
    case 'kanban-card':
      return (
        payload.card.text ||
        'Untitled card'
      );

    case 'checklist-entry':
      return (
        payload.entry.text ||
        'Untitled item'
      );

    case 'column-item':
      return getBoardItemText(
        payload.item,
      );
  }
}

function getBoardItemText(item: BoardItem): string {
  switch (item.type) {
    case 'note':
      return item.content || 'Note';

    case 'text':
      return item.content || 'Text';

    case 'link':
      return item.title || 'Link';

    case 'checklist':
      return item.title || 'Checklist';

    case 'image':
      return item.caption || 'Image';

    default:
      return 'Item';
  }
}

function DragIcon() {
  return (
    <div
      className="
        flex
        flex-col
        gap-[2px]
        opacity-50
      "
    >
      {[0, 1, 2].map(row => (
        <div
          key={row}
          className="flex gap-[2px]"
        >
          <span className="w-1 h-1 rounded-full bg-current" />
          <span className="w-1 h-1 rounded-full bg-current" />
        </div>
      ))}
    </div>
  );
}