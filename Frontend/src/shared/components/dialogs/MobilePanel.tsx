import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const mobileQuery = '(max-width: 900px), (pointer: coarse) and (max-width: 1200px)';
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};

export function useMobileLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  );
}

/** Keeps the desktop panel intact and gives small screens a focus-managed modal. */
export default function MobilePanel({
  children,
  title,
  slot,
}: {
  children: ReactNode;
  title: string;
  slot: 'edit' | 'details' | 'tools';
}) {
  useTranslation();
  const mobile = useMobileLayout();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (mobile && open && dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, [mobile, open]);

  useEffect(() => {
    if (!mobile) setOpen(false);
  }, [mobile]);

  if (!mobile) return children;

  return (
    <>
      <button
        type="button"
        className={`mobile-panel-trigger mobile-panel-trigger-${slot}`}
        data-canvas-ui="true"
        aria-haspopup="dialog"
        aria-expanded={open}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => setOpen(true)}
      >
        {title}
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialogRef}
            className="mobile-panel"
            role="dialog"
            aria-labelledby={headingId}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onCancel={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientY < rect.top || event.clientX < rect.left || event.clientX > rect.right) {
                  setOpen(false);
                }
              }
              if (slot === 'tools' && (event.target as Element).closest('.tool-tile, .tool-select')) setOpen(false);
            }}
          >
            <div className="mobile-panel-heading">
              <strong id={headingId}>{title}</strong>
              <button
                className="mobile-panel-done"
                type="button"
                aria-label={translate('Close {{value1}}', { value1: title })}
                onClick={() => setOpen(false)}
              >
                {translate('Done')}
              </button>
            </div>
            <div className="mobile-panel-body">{children}</div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
