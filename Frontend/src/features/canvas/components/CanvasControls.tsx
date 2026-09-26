import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { ZOOM_MAX, ZOOM_MIN } from '@/features/canvas/constants';
import { MousePointerClick, Trash2 } from 'lucide-react';

interface CanvasControlsProps {
  zoom: number;
  snapEnabled: boolean;
  placeOnItems: boolean;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onToggleSnap: () => void;
  onTogglePlaceOnItems: () => void;
  onFitView: () => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onUndo: () => void;
  onOpenMenu: () => void;
  onOpenTrash: () => void;
}

export default function CanvasControls({
  zoom,
  snapEnabled,
  placeOnItems,
  onZoomChange,
  onPanChange,
  onToggleSnap,
  onTogglePlaceOnItems,
  onFitView,
  selectionMode,
  onToggleSelectionMode,
  onUndo,
  onOpenMenu,
  onOpenTrash,
}: CanvasControlsProps) {
  useTranslation();
  const zoomOut = () => {
    const nextZoom = Math.max(ZOOM_MIN, Number((zoom - 0.1).toFixed(2)));

    onZoomChange(nextZoom);
  };

  const zoomIn = () => {
    const nextZoom = Math.min(ZOOM_MAX, Number((zoom + 0.1).toFixed(2)));

    onZoomChange(nextZoom);
  };

  const resetView = () => {
    onZoomChange(1);
    onPanChange({ x: 0, y: 0 });
  };

  return (
    <div
      data-canvas-ui="true"
      className="canvas-controls absolute right-6 bottom-4 pointer-events-auto flex items-center gap-2"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="touch-selection-toggle"
        aria-pressed={selectionMode}
        aria-label={translate('Select multiple items')}
        title={translate('Toggle between panning empty space and selecting multiple items')}
        onClick={onToggleSelectionMode}
      >
        {selectionMode ? translate('Select +') : translate('Pan')}
      </button>
      <button
        type="button"
        className="touch-selection-toggle"
        onClick={onOpenMenu}
        aria-label={translate('Board and item actions')}
      >
        ⋯
      </button>
      <button type="button" className="touch-selection-toggle" onClick={onUndo} aria-label={translate('Undo')}>
        ↶
      </button>
      <button type="button" className="canvas-fit-button" onClick={onFitView} title={translate('Fit board to screen')}>
        {translate('Fit')}
      </button>
      <button
        type="button"
        className="canvas-fit-button flex items-center gap-1.5"
        onClick={onOpenTrash}
        title={translate('Open item trash')}
        aria-label={translate('Open item trash')}
      >
        <Trash2 size={14} />
        <span className="hidden sm:inline">{translate('Trash')}</span>
      </button>
      <button
        type="button"
        onClick={onTogglePlaceOnItems}
        className="w-9 h-9 flex items-center justify-center rounded-xl border shadow-md transition-colors"
        style={{
          backgroundColor: placeOnItems ? 'var(--color-accent)' : 'var(--color-surface-translucent)',
          borderColor: placeOnItems ? 'var(--color-accent)' : 'var(--color-border)',
          color: placeOnItems ? 'white' : 'var(--color-text-secondary)',
          backdropFilter: 'blur(8px)',
        }}
        aria-pressed={placeOnItems}
        aria-label={translate('Place tools on items')}
        title={placeOnItems ? translate('Place on items: on') : translate('Place on items: off')}
      >
        <MousePointerClick size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onToggleSnap}
        className="w-9 h-9 flex items-center justify-center rounded-xl border shadow-md transition-colors"
        style={{
          backgroundColor: snapEnabled ? 'var(--color-accent)' : 'var(--color-surface-translucent)',
          borderColor: snapEnabled ? 'var(--color-accent)' : 'var(--color-border)',
          color: snapEnabled ? 'white' : 'var(--color-text-secondary)',
          backdropFilter: 'blur(8px)',
        }}
        title={snapEnabled ? translate('Snap to grid: on') : translate('Snap to grid: off')}
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
          <path d="M6 3v18M12 3v18M18 3v18M3 6h18M3 12h18M3 18h18" opacity="0.55" />

          <rect x="9" y="9" width="8" height="8" rx="1" fill="currentColor" opacity={snapEnabled ? 1 : 0.55} />
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
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={translate('Zoom out')}
          aria-label={translate('Zoom out')}
          disabled={zoom <= ZOOM_MIN}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14" />
          </svg>
        </button>

        <button
          onClick={resetView}
          className="px-2.5 h-8 text-[10px] font-bold font-mono transition-colors border-x"
          style={{ color: '#4a6070', borderColor: 'var(--color-border-soft)', minWidth: 52 }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={translate('Reset zoom')}
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={translate('Zoom in')}
          aria-label={translate('Zoom in')}
          disabled={zoom >= ZOOM_MAX}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
