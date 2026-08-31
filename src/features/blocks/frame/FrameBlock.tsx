import type { BoardItem, FrameItem } from '@/entities/board/types';

interface FrameBlockProps {
  item: FrameItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onFitFrame: () => void;
}

export default function FrameBlock({
  item,
}: FrameBlockProps) {
  return (
    <div
      className="group/frame"
      style={{
        width: item.width,
        height: item.height,
        pointerEvents: 'none',
      }}
    >
      {/* Frame background / border */}

      <div
        className="absolute inset-0 item-rounded"
        style={{
          border: `2px solid ${item.color}50`,
          backgroundColor: `${item.color}12`,
          transition:
            'border-color 0.15s, background-color 0.15s',
        }}
      />

      {/* Hover border */}

      <div
        className="absolute inset-0 item-rounded opacity-0 group-hover/frame:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          border: `2px solid ${item.color}aa`,
          boxShadow: `0 0 0 1px ${item.color}20`,
        }}
      />

      {/* Size indicator */}

      <span
        className="absolute opacity-0 group-hover/frame:opacity-100 transition-opacity text-[9px] font-mono pointer-events-none"
        style={{
          bottom: -22,
          right: 0,
          color: `${item.color}88`,
        }}
      >
        {Math.round(item.width)} × {Math.round(item.height)}
      </span>
    </div>
  );
}