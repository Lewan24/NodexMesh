import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const openDialogs = new Set<HTMLDialogElement>();
let bodyOverflow = '';

/** Native modal stacking keeps confirmations usable above mobile tool panels. */
export default function Modal({
  children,
  onClose,
  centered = false,
  label = translate('Dialog'),
  boardHistory = false,
  closeOnBackdrop = false,
  readOnlyAction = false,
}: {
  children: ReactNode;
  onClose: () => void;
  centered?: boolean;
  label?: string;
  boardHistory?: boolean;
  closeOnBackdrop?: boolean;
  readOnlyAction?: boolean;
}) {
  useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement;
    if (!dialog.open) dialog.showModal();
    if (!openDialogs.size) bodyOverflow = document.body.style.overflow;
    openDialogs.add(dialog);
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      openDialogs.delete(dialog);
      if (!openDialogs.size) document.body.style.overflow = bodyOverflow;
      const top = [...openDialogs].at(-1);
      if (previous instanceof HTMLElement && previous.isConnected && (!top || top.contains(previous)))
        previous.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`app-modal${centered ? ' app-modal-centered' : ''}`}
      aria-label={label}
      data-board-history={boardHistory || undefined}
      data-read-only-action={readOnlyAction || undefined}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (!closeOnBackdrop || event.target !== event.currentTarget) return;
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </dialog>,
    document.body,
  );
}
