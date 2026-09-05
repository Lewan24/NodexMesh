import type { ReactNode } from 'react';

import DragHandle from '@/features/blocks/shared/DragHandle';

interface ColumnItemRowProps {
  children: ReactNode;

  isDragging?: boolean;
  isSelected?: boolean;

  onDragHandleMouseDown: (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;

  onEject: () => void;
  onSelect: () => void;
}

export default function ColumnItemRow({
  children,
  isDragging = false,
  isSelected = false,
  onDragHandleMouseDown,
  onEject,
  onSelect,
}: ColumnItemRowProps) {
  return (
    <div
      data-column-item="true"
      className="group/row relative grid grid-cols-[24px_minmax(0,1fr)_24px] gap-2 items-start w-full min-w-0 rounded-xl transition-all"
      style={{
        width: '100%',
        opacity: isDragging ? 0.32 : 1,
        boxShadow: isSelected ? '0 0 0 2px var(--color-accent)' : undefined,
      }}
      onClick={event => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {/* Drag column */}

      <div
        className="
          flex
          flex-shrink-0
          items-start
          justify-center
          pt-2
        "
        onClick={event =>
          event.stopPropagation()
        }
      >
        <DragHandle
          color="var(--color-text-faint)"
          title="Drag to reorder or move out of column"
          onMouseDown={
            onDragHandleMouseDown
          }
        />
      </div>

      {/* Actual nested block */}

      <div className="min-w-0 w-full overflow-hidden">
        {children}
      </div>

      {/* Eject */}

      <div
        className="
          flex
          flex-shrink-0
          items-start
          pt-2
        "
        onMouseDown={event =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onEject();
          }}
          className="
            w-6
            h-6

            flex
            items-center
            justify-center

            rounded-md

            transition-all

            hover:ring-1
            hover:ring-[var(--color-accent)]
            hover:bg-black/5
          "
          style={{
            color:
              'var(--color-text-faint)',
          }}
          title="Move item to canvas"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 3h7v7" />
            <path d="M10 14 21 3" />
            <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
          </svg>
        </button>
      </div>
    </div>
  );
}