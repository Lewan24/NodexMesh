import { ZOOM_MAX, ZOOM_MIN } from '@/features/canvas/constants';

interface CanvasControlsProps {
  zoom: number;
  snapEnabled: boolean;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onToggleSnap: () => void;
}

export default function CanvasControls({
  zoom,
  snapEnabled,
  onZoomChange,
  onPanChange,
  onToggleSnap,
}: CanvasControlsProps) {
  const zoomOut = () => {
    const nextZoom = Math.max(
      ZOOM_MIN,
      Number((zoom - 0.1).toFixed(2)),
    );

    onZoomChange(nextZoom);
  };

  const zoomIn = () => {
    const nextZoom = Math.min(
      ZOOM_MAX,
      Number((zoom + 0.1).toFixed(2)),
    );

    onZoomChange(nextZoom);
  };

  const resetView = () => {
    onZoomChange(1);
    onPanChange({ x: 0, y: 0 });
  };

  return (
    <div className="absolute right-6 pointer-events-auto flex items-center gap-2">
      <button
        onClick={onToggleSnap}
        className="w-9 h-9 flex items-center justify-center rounded-xl border shadow-md transition-colors"
        style={{
          backgroundColor: snapEnabled
            ? 'var(--color-accent)'
            : 'var(--color-surface-translucent)',
          borderColor: snapEnabled
            ? 'var(--color-accent)'
            : 'var(--color-border)',
          color: snapEnabled
            ? 'white'
            : 'var(--color-text-secondary)',
          backdropFilter: 'blur(8px)',
        }}
        title={snapEnabled ? 'Snap to grid: on' : 'Snap to grid: off'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M6 3v18M12 3v18M18 3v18M3 6h18M3 12h18M3 18h18"
            opacity="0.55"
          />

          <rect
            x="9"
            y="9"
            width="8"
            height="8"
            rx="1"
            fill="currentColor"
            opacity={snapEnabled ? 1 : 0.55}
          />
        </svg>
      </button>

      <div
        className="flex items-center rounded-xl overflow-hidden border shadow-md"
        style={{
          backgroundColor: 'var(--color-surface-translucent)',
          borderColor: 'var(--color-border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={event => {
            event.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={event => {
            event.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Zoom out"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14" />
          </svg>
        </button>

        <button
          onClick={resetView}
          className="px-2.5 h-8 text-[10px] font-bold font-mono transition-colors border-x"
          style={{
            color: '#4a6070',
            borderColor: 'var(--color-border-soft)',
            minWidth: 52,
          }}
          onMouseEnter={event => {
            event.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={event => {
            event.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={event => {
            event.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={event => {
            event.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Zoom in"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}