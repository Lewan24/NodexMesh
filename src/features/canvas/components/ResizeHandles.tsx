import type { ResizeDirection } from '@/features/canvas/types';

interface ResizeHandlesProps {
  visible: boolean;
  onResizeStart: (event: React.MouseEvent, direction: ResizeDirection) => void;
}

const EDGE_SIZE = 10;
const CORNER_SIZE = 12;

export default function ResizeHandles({ visible, onResizeStart }: ResizeHandlesProps) {
  if (!visible) return null;

  const start = (direction: ResizeDirection) => (event: React.MouseEvent) => {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    onResizeStart(event, direction);
  };

  return (
    <>
      {/* Edges */}

      <div
        className="absolute z-40 cursor-ns-resize"
        style={{ top: -EDGE_SIZE / 2, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_SIZE }}
        onMouseDown={start('n')}
      />

      <div
        className="absolute z-40 cursor-ew-resize"
        style={{ top: CORNER_SIZE, bottom: CORNER_SIZE, right: -EDGE_SIZE / 2, width: EDGE_SIZE }}
        onMouseDown={start('e')}
      />

      <div
        className="absolute z-40 cursor-ns-resize"
        style={{ bottom: -EDGE_SIZE / 2, left: CORNER_SIZE, right: CORNER_SIZE, height: EDGE_SIZE }}
        onMouseDown={start('s')}
      />

      <div
        className="absolute z-40 cursor-ew-resize"
        style={{ top: CORNER_SIZE, bottom: CORNER_SIZE, left: -EDGE_SIZE / 2, width: EDGE_SIZE }}
        onMouseDown={start('w')}
      />

      {/* Corners */}

      <ResizeCorner
        top={-CORNER_SIZE / 2}
        left={-CORNER_SIZE / 2}
        cursor="nwse-resize"
        onMouseDown={start('nw')}
      />

      <ResizeCorner
        top={-CORNER_SIZE / 2}
        right={-CORNER_SIZE / 2}
        cursor="nesw-resize"
        onMouseDown={start('ne')}
      />

      <ResizeCorner
        bottom={-CORNER_SIZE / 2}
        right={-CORNER_SIZE / 2}
        cursor="nwse-resize"
        onMouseDown={start('se')}
      />

      <ResizeCorner
        bottom={-CORNER_SIZE / 2}
        left={-CORNER_SIZE / 2}
        cursor="nesw-resize"
        onMouseDown={start('sw')}
      />
    </>
  );
}

interface ResizeCornerProps {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  cursor: string;
  onMouseDown: (event: React.MouseEvent) => void;
}

function ResizeCorner({
  top,
  right,
  bottom,
  left,
  cursor,
  onMouseDown,
}: ResizeCornerProps) {
  return (
    <div
      className="absolute z-50 flex items-center justify-center"
      style={{ top, right, bottom, left, width: CORNER_SIZE, height: CORNER_SIZE, cursor }}
      onMouseDown={onMouseDown}
    >
      <div
        className="rounded-full"
        style={{
          width: 7,
          height: 7,
          backgroundColor: 'var(--color-accent)',
          boxShadow: '0 0 0 2px var(--color-surface)',
        }}
      />
    </div>
  );
}