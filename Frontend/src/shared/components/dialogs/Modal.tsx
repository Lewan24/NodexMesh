import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Native modal stacking keeps confirmations usable above mobile tool panels. */
export default function Modal({
  children,
  onClose,
  centered = false,
  label = translate('Dialog'),
  boardHistory = false,
}: {
  children: ReactNode;
  onClose: () => void;
  centered?: boolean;
  label?: string;
  boardHistory?: boolean;
}) {
  useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`app-modal${centered ? ' app-modal-centered' : ''}`}
      aria-label={label}
      data-board-history={boardHistory || undefined}
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
