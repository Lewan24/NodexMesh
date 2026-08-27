import type {
  ToolType,
} from '@/entities/board/toolTypes';

interface CanvasHintsProps {
  selectedTool: ToolType;
  hasSelection: boolean;
}

export default function CanvasHints({
  selectedTool,
  hasSelection,
}: CanvasHintsProps) {
  return (
    <>
      {selectedTool !==
        'select' && (
        <div
          className="
            absolute
            left-1/2
            -translate-x-1/2
            pointer-events-none
            hint-pulse
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
              px-5
              py-2.5
              rounded-full
              text-sm
              shadow-lg
            "
            style={{
              backgroundColor:
                'var(--color-surface-translucent)',

              border:
                '1px solid rgba(124, 58, 237,0.3)',

              color:
                'var(--color-accent)',

              backdropFilter:
                'blur(8px)',
            }}
          >
            {selectedTool ===
            'frame'
              ? 'Drag to draw a frame — items inside will move with it'
              : `Click to place ${selectedTool}`}

            <span
              className="text-xs"
              style={{
                color:
                  'var(--color-text-muted)',
              }}
            >
              ESC to cancel
            </span>
          </div>
        </div>
      )}

      {selectedTool ===
        'select' &&
        !hasSelection && (
          <div
            className="
              absolute
              left-1/2
              -translate-x-1/2
              pointer-events-none
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                text-xs
                shadow-sm
                opacity-40
              "
              style={{
                backgroundColor:
                  'var(--color-surface-translucent)',

                color:
                  'var(--color-text-secondary)',

                backdropFilter:
                  'blur(4px)',
              }}
            >
              Middle-click drag to pan · Scroll to zoom
            </div>
          </div>
        )}
    </>
  );
}