import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { allStyleParts } from '../utils/itemStyle';
import type { StyleParts } from '../utils/itemStyle';

export default function PasteStyleDialog({
  onClose,
  onPaste,
}: {
  onClose: () => void;
  onPaste: (parts: StyleParts) => void;
}) {
  useTranslation();
  const [parts, setParts] = useState({ ...allStyleParts });
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
      style={{ zIndex: 250000 }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <form
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={translate('Paste style')}
        className="w-full max-w-sm shadow-2xl p-6 space-y-4"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        onSubmit={(event) => {
          event.preventDefault();
          if (Object.values(parts).some(Boolean)) onPaste(parts);
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
        <h2 className="text-lg font-semibold">{translate('Paste style')}</h2>
        <p className="text-sm">{translate('Choose which styles to apply to the selected items.')}</p>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={Object.values(parts).every(Boolean)}
            onChange={(event) =>
              setParts({ fill: event.target.checked, strip: event.target.checked, typography: event.target.checked })
            }
          />
          {translate('All styles')}
        </label>
        {(
          [
            ['fill', translate('Card color and gradient')],
            ['strip', translate('Top strip color')],
            ['typography', translate('Typography and alignment')],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex gap-2">
            <input
              type="checkbox"
              checked={parts[key]}
              onChange={(event) => setParts({ ...parts, [key]: event.target.checked })}
            />
            {label}
          </label>
        ))}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose}>
            {translate('Cancel')}
          </button>
          <button
            type="submit"
            disabled={!Object.values(parts).some(Boolean)}
            className="px-3 py-1 bg-violet-600 text-white disabled:opacity-40"
          >
            {translate('Paste style')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
