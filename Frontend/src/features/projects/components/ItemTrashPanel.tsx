import { displayLabel, translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { GripVertical, RotateCcw, Trash2, X } from 'lucide-react';
import type { TrashedItemRecord } from '@/entities/board/records';

export const TRASH_ITEM_MIME = 'application/x-nodexmesh-trash-item';

interface ItemTrashPanelProps {
  items: TrashedItemRecord[];
  loading: boolean;
  onClose: () => void;
  onRestore: (item: TrashedItemRecord) => void;
  onPurge: (item: TrashedItemRecord) => void;
  onEmpty: () => void;
}

function itemLabel(entry: TrashedItemRecord) {
  const data = entry.item.data as Record<string, unknown>;
  const value = data.title ?? data.content ?? data.label ?? data.caption ?? data.url;
  if (typeof value !== 'string' || !value.trim()) return entry.item.type.replace('-', ' ');
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72);
}

export default function ItemTrashPanel({ items, loading, onClose, onRestore, onPurge, onEmpty }: ItemTrashPanelProps) {
  useTranslation();
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label={translate('Project item trash')}
      data-canvas-ui="true"
      className="absolute bottom-16 right-3 top-3 z-[70] flex w-[min(340px,calc(100%-24px))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-primary)',
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <header
        className="flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold">{translate('Item trash')}</h2>
          <p className="text-[11px] text-theme-muted">
            {translate('Restore here, or drag an item back onto the canvas.')}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={onClose}
          aria-label={translate('Close item trash')}
        >
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="p-4 text-center text-xs text-theme-muted" role="status">
            {translate('Loading trash…')}
          </p>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-xs text-theme-muted">{translate('This project’s item trash is empty.')}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((entry) => (
              <li
                key={entry.item.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData(TRASH_ITEM_MIME, entry.item.id);
                  event.dataTransfer.setData('text/plain', entry.item.id);
                }}
                className="group flex cursor-grab items-center gap-2 rounded-xl border p-2 active:cursor-grabbing"
                style={{ background: 'var(--color-surface-alt)', borderColor: 'var(--color-border-soft)' }}
                title={translate('Drag onto the canvas to restore at a new position')}
              >
                <GripVertical size={16} className="shrink-0 text-theme-muted" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{itemLabel(entry)}</div>
                  <div className="truncate text-[10px] text-theme-muted">
                    {entry.boardName} · {displayLabel(entry.item.type)}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 hover:bg-emerald-500/10 hover:text-emerald-600"
                  onClick={() => onRestore(entry)}
                  aria-label={translate('Restore {{value1}}', { value1: itemLabel(entry) })}
                  title={translate('Restore to its original board and position')}
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 hover:bg-rose-500/10 hover:text-rose-600"
                  onClick={() => onPurge(entry)}
                  aria-label={translate('Permanently delete {{value1}}', { value1: itemLabel(entry) })}
                  title={translate('Delete permanently')}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && !loading && (
        <footer className="border-t p-3" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-500/10"
            onClick={onEmpty}
          >
            {translate('Empty item trash')}
          </button>
        </footer>
      )}
    </section>
  );
}
