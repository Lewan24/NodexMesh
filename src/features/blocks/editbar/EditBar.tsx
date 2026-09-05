import type { BoardItem } from '@/entities/board/types';
import ColorPanel from './components/ColorPanel';
import FrameControls from './components/FrameControls';
import LineControls from './components/LineControls';
import { EditBarDivider } from './components/EditBarButton';
import { ITEM_TYPE_LABELS } from './constants';
import TypographyControls from './components/TypographyControls';
import ColumnLayoutControls from './components/ColumnLayoutControls';
import LayerControls from './components/LayerControls';

interface EditBarProps {
  selectedItems: BoardItem[];
  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;
  onDeleteItems: (ids: string[]) => void;
  onGroupItems: () => void;
  onFitFrame: (id: string) => void;
  onClose: () => void;
  columnItem?: BoardItem;
  onUpdateColumnItem?: (updater: (item: BoardItem) => BoardItem) => void;
  onDeleteColumnItem?: () => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

export default function EditBar({
  selectedItems,
  onUpdateItem,
  onDeleteItems,
  onGroupItems,
  onFitFrame,
  onClose,
  columnItem,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onUpdateColumnItem,
  onDeleteColumnItem,
}: EditBarProps) {
  const isColumnMode = !!columnItem;
  const isMulti = !isColumnMode && selectedItems.length > 1;
  const single = columnItem ?? (selectedItems.length === 1 ? selectedItems[0] : null);

  if (!columnItem && selectedItems.length === 0) return null;

  const ids = selectedItems.map(item => item.id);

  const handleUpdate = (updater: (item: BoardItem) => BoardItem) => {
    if (isColumnMode && onUpdateColumnItem) {
      onUpdateColumnItem(updater);
      return;
    }

    if (single) onUpdateItem(single.id, updater);
  };

  const handleDelete = () => {
    if (isColumnMode && onDeleteColumnItem) {
      onDeleteColumnItem();
    } else {
      onDeleteItems(ids);
    }

    onClose();
  };

  const typeLabel = isColumnMode
    ? single ? ITEM_TYPE_LABELS[single.type] ?? single.type : ''
    : isMulti
      ? `${selectedItems.length} items`
      : single
        ? ITEM_TYPE_LABELS[single.type] ?? single.type
        : '';

  const hasStyleControls = !!single && !isMulti;

  return (
    <div
      data-edit-bar="true"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col rounded-2xl shadow-lg select-none overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface-translucent)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
        backdropFilter: 'blur(10px)',
        maxWidth: 'calc(100vw - 120px)',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Main actions */}
      <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto">
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          style={{ color: 'var(--color-text-faint)' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-faint)';
          }}
          title="Deselect (Esc)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <span
          className="text-[11px] font-bold uppercase tracking-widest px-1 flex-shrink-0"
          style={{ color: 'var(--color-text-faint)' }}
        >
          {typeLabel}
        </span>

        {(isMulti || single?.type === 'frame') && <EditBarDivider />}

        {single && !isColumnMode && (
          <>
            <LayerControls
              onSendToBack={() => onSendToBack(single.id)}
              onSendBackward={() => onSendBackward(single.id)}
              onBringForward={() => onBringForward(single.id)}
              onBringToFront={() => onBringToFront(single.id)}
            />
          </>
        )}

        {isMulti && (
          <button
            onClick={onGroupItems}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 cursor-pointer"
            style={{ color: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.1)' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.1)';
            }}
            title="Wrap in a frame"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
            </svg>
            Group
          </button>
        )}

        {!isMulti && !isColumnMode && single?.type === 'frame' && (
          <button
            onClick={() => onFitFrame(single.id)}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Fit frame to contents"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            Fit
          </button>
        )}

        <div className="flex-1 min-w-2" />

        <EditBarDivider />

        <button
          onClick={handleDelete}
          className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0 cursor-pointer"
          style={{ color: 'var(--color-text-faint)' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255,107,138,0.1)';
            e.currentTarget.style.color = 'var(--color-danger-strong)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-faint)';
          }}
          title="Delete"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path
              d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {isMulti ? `Delete ${selectedItems.length}` : 'Delete'}
        </button>
      </div>

      {/* Style controls */}
      {hasStyleControls && (
        <div
          className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto"
          style={{ borderTop: '1px solid var(--color-border-soft)' }}
        >
          {single.type !== 'line' && single.type !== 'frame' && (
            <ColorPanel item={single} onUpdate={handleUpdate} />
          )}
          
          {single.type === 'column' && (
            <ColumnLayoutControls
              item={single}
              onUpdate={handleUpdate}
            />
          )}

          {single.type !== 'line' && (
            <TypographyControls item={single} onUpdate={handleUpdate} />
          )}

          {!isColumnMode && single.type === 'line' && (
            <LineControls item={single} onUpdate={handleUpdate} />
          )}

          {!isColumnMode && single.type === 'frame' && (
            <FrameControls item={single} onUpdate={handleUpdate} />
          )}
        </div>
      )}
    </div>
  );
}