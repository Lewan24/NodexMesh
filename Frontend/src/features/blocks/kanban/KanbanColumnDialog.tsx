import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KanbanColumn } from '@/entities/board/types';

export default function KanbanColumnDialog({
  column,
  share,
  singleColumn,
  onSave,
  onClose,
}: {
  column: KanbanColumn;
  share: number;
  singleColumn: boolean;
  onSave: (patch: Pick<KanbanColumn, 'title' | 'color'> & { share: number }) => void;
  onClose: () => void;
}) {
  useTranslation();
  const [title, setTitle] = useState(column.title);
  const [color, setColor] = useState(column.color);
  const [width, setWidth] = useState(share * 100);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector('input')?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center p-4"
      style={{ zIndex: 200000 }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <form
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={translate('Edit Kanban column')}
        className="w-full max-w-md p-6 space-y-4 shadow-2xl rounded-sm"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) onSave({ title: title.trim(), color, share: width / 100 });
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
          if (event.key === 'Tab') {
            const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button:not(:disabled)'));
            const first = fields[0],
              last = fields[fields.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2 className="text-lg font-semibold">{translate('Edit column')}</h2>
        <label className="block">
          {translate('Column name')}
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="block w-full mt-1 p-2 bg-transparent border rounded-sm"
          />
        </label>
        <label className="flex items-center justify-between">
          {translate('Title color')}
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <label className="block">
          {translate('Width (%)')}
          <input
            type="number"
            required
            min={1}
            max={singleColumn ? 100 : 99}
            step="any"
            disabled={singleColumn}
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
            className="block w-full mt-1 p-2 bg-transparent border rounded-sm"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-3 py-2" onClick={onClose}>
            {translate('Cancel')}
          </button>
          <button disabled={!title.trim()} className="px-3 py-2 bg-violet-600 text-white rounded-sm">
            {translate('Save column')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
