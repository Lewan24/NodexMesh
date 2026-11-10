import KanbanColumnIcon from './KanbanColumnIcon';
import { ICON_PRESETS, EMOJI_PRESETS } from '../icon/iconPresets';
import { translate, displayLabel } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import Modal from '@/shared/components/dialogs/Modal';
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
  onSave: (patch: Pick<KanbanColumn, 'title' | 'color' | 'icon'> & { share: number }) => void;
  onClose: () => void;
}) {
  useTranslation();
  const [title, setTitle] = useState(column.title);
  const [color, setColor] = useState(column.color);
  const [icon, setIcon] = useState(column.icon);
  const [width, setWidth] = useState(share * 100);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector('input')?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <Modal onClose={onClose}>
      <div
        className="fixed inset-0 bg-black/45 flex items-center justify-center p-4"
        style={{ zIndex: 200000 }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (event.target === event.currentTarget) {
            if (title.trim())
              onSave({ title: title.trim(), color, icon: icon?.source.trim() ? icon : undefined, share: width / 100 });
            else onClose();
          }
        }}
      >
        <form
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={translate('Edit Kanban column')}
          className="w-full max-w-md max-h-[85dvh] overflow-y-auto p-5 space-y-4 shadow-2xl rounded-xl"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim())
              onSave({ title: title.trim(), color, icon: icon?.source.trim() ? icon : undefined, share: width / 100 });
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            }
            if (event.key === 'Tab') {
              const fields = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled),button:not(:disabled)'),
              );
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
          <fieldset className="kanban-icon-picker">
            <legend>{translate('Column icon')}</legend>
            <div className="flex items-center gap-2 py-2">
              <KanbanColumnIcon icon={icon} size={24} />
              <button type="button" onClick={() => setIcon(undefined)} className="kanban-column-action">
                {translate('Reset icon')}
              </button>
            </div>
            <div className="kanban-icon-options" role="group" aria-label={translate('Column icons')}>
              {Object.entries(ICON_PRESETS).map(([name, Icon]) => (
                <button
                  key={name}
                  type="button"
                  aria-label={displayLabel(name)}
                  title={displayLabel(name)}
                  aria-pressed={icon?.mode === 'preset' && icon.source === name}
                  onClick={() => setIcon({ mode: 'preset', source: name })}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="kanban-icon-options" role="group" aria-label={translate('Column emoji')}>
              {EMOJI_PRESETS.slice(0, 16).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={emoji}
                  aria-pressed={icon?.mode === 'emoji' && icon.source === emoji}
                  onClick={() => setIcon({ mode: 'emoji', source: emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <label className="block mt-2 text-sm">
              {translate('Custom emoji')}
              <input
                value={icon?.mode === 'emoji' ? icon.source : ''}
                maxLength={64}
                onChange={(event) => setIcon({ mode: 'emoji', source: event.target.value })}
                className="block w-full mt-1 p-2 bg-transparent border rounded-lg"
              />
            </label>
          </fieldset>
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
            <button disabled={!title.trim()} className="px-3 py-2 btn-accent rounded-sm">
              {translate('Save column')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
