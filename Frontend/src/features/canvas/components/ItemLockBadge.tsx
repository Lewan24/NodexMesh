import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { LockKeyhole } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './itemLockBadge.css';

export default function ItemLockBadge({ inherited = false }: { inherited?: boolean }) {
  useTranslation();
  const label = inherited ? translate('Movement locked: contains a locked item') : translate('Item locked');
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useLayoutEffect(() => {
    if (!open) return;
    const rect = trigger.current?.getBoundingClientRect();
    if (rect)
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)),
        top: rect.bottom + 132 < window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - 132),
      });
    const close = (event: Event) => {
      if (!(event.target instanceof Node) || !trigger.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        data-read-only-action="true"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        className="item-lock-badge absolute -top-2 -left-2 z-50 w-6 h-6 rounded-sm border shadow-sm flex items-center justify-center"
        style={{ background: '#facc15', borderColor: '#ca8a04', color: '#422006' }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={(event) => {
          if (document.activeElement !== event.currentTarget) setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.matches(':hover')) setOpen(false);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
        }}
      >
        <LockKeyhole size={13} strokeWidth={2.5} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div id={id} role="tooltip" className="item-lock-tooltip" style={position}>
            <strong>{label}</strong>
            {inherited ? (
              <p>{translate('This frame cannot move while it contains a locked item.')}</p>
            ) : (
              <>
                <p>{translate('Moving and manual resizing are blocked. The current height stays fixed.')}</p>
                <p>{translate('Content can still be edited. Extra content scrolls inside the item.')}</p>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
