import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
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
  const mobile = useMobileLayout();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (mobile && open && dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, [mobile, open]);

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
            aria-label={title}
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
              <strong>{title}</strong>
              <button type="button" aria-label={`Close ${title}`} onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
            <div className="mobile-panel-body">{children}</div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
