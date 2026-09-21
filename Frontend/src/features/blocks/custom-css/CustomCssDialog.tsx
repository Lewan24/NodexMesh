import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BoardItem } from '@/entities/board/types';
import { MAX_CUSTOM_CSS_LENGTH, parseCustomCss } from './customCss';

interface Props {
  item: BoardItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

export default function CustomCssDialog({ item, onUpdate, onClose }: Props & { onClose: () => void }) {
  const [source, setSource] = useState(item.customCss?.source ?? '');
  const [enabled, setEnabled] = useState(item.customCss?.enabled ?? false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const helpId = useId();
  const errorId = useId();

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  const save = () => {
    try {
      if (enabled) {
        const declarations = parseCustomCss(source);
        const unsupported = declarations.find(({ property, value }) => !CSS.supports(property, value));
        if (unsupported)
          throw new Error(`This browser does not support: ${unsupported.property}: ${unsupported.value}`);
      }
      onUpdate((current) => ({ ...current, customCss: { enabled, source } }));
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Check the CSS declarations.');
    }
  };

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="custom-css-dialog rounded-2xl border p-0 shadow-2xl backdrop:bg-black/50"
      style={{
        width: 580,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100dvh - 32px)',
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        borderColor: 'var(--color-border)',
        margin: 'auto',
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            Custom CSS
          </h2>
          <button type="button" onClick={onClose} aria-label="Close custom CSS" className="rounded-lg px-3 py-1">
            ×
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Enable custom CSS for this item
        </label>
        <p id={helpId} className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Add CSS declarations to the item root, without a selector or braces. These override matching root styles;
          other settings stay in place. Children inherit properties unless they have their own styles.
        </p>
        <label className="flex flex-col gap-2 text-sm">
          CSS declarations
          <textarea
            autoFocus
            rows={10}
            maxLength={MAX_CUSTOM_CSS_LENGTH}
            value={source}
            spellCheck={false}
            aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}
            aria-invalid={!!error}
            placeholder={'border-radius: 24px;\nbox-shadow: 0 12px 32px #00000030;\nletter-spacing: 0.03em;'}
            onChange={(event) => {
              setSource(event.target.value);
              setError('');
            }}
            className="w-full resize-y rounded-lg border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-violet-500"
            style={{
              background: 'var(--color-app-bg)',
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-border)',
            }}
          />
        </label>
        {error && (
          <p id={errorId} role="alert" className="text-sm">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Disabling keeps your CSS for later.
          </span>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
            >
              Apply
            </button>
          </div>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
