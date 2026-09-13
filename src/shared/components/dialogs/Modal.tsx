import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Native modal stacking keeps confirmations usable above mobile tool panels. */
export default function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="app-modal"
      aria-label="Dialog"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </dialog>,
    document.body,
  );
}
