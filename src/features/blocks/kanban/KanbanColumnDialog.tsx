import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KanbanColumn } from '@/entities/board/types';
import { MIN_KANBAN_COLUMN_WIDTH, MAX_KANBAN_COLUMN_WIDTH, DEFAULT_KANBAN_COLUMN_WIDTH } from './utils/kanbanUtils';

export default function KanbanColumnDialog({ column, onSave, onClose }: {
  column: KanbanColumn; onSave: (patch: Pick<KanbanColumn, 'title' | 'color' | 'width'>) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(column.title);
  const [color, setColor] = useState(column.color);
  const [width, setWidth] = useState(column.width ?? DEFAULT_KANBAN_COLUMN_WIDTH);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector('input')?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4" style={{ zIndex: 200000 }} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    <form ref={ref} role="dialog" aria-modal="true" aria-label="Edit Kanban column" className="w-full max-w-md p-6 space-y-4 shadow-2xl rounded-sm" style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
      onSubmit={event => { event.preventDefault(); if (title.trim()) onSave({ title: title.trim(), color, width }); }}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key === 'Tab') {
          const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button:not(:disabled)'));
          const first = fields[0], last = fields[fields.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <h2 className="text-lg font-semibold">Edit column</h2>
      <label className="block">Column name<input required value={title} onChange={event => setTitle(event.target.value)} className="block w-full mt-1 p-2 bg-transparent border rounded-sm" /></label>
      <label className="flex items-center justify-between">Title color<input type="color" value={color} onChange={event => setColor(event.target.value)} /></label>
      <label className="block">Width (px)<input type="number" required min={MIN_KANBAN_COLUMN_WIDTH} max={MAX_KANBAN_COLUMN_WIDTH} value={width} onChange={event => setWidth(Number(event.target.value))} className="block w-full mt-1 p-2 bg-transparent border rounded-sm" /></label>
      <div className="flex justify-end gap-2"><button type="button" className="px-3 py-2" onClick={onClose}>Cancel</button><button disabled={!title.trim()} className="px-3 py-2 bg-violet-600 text-white rounded-sm">Save column</button></div>
    </form>
  </div>, document.body);
}
