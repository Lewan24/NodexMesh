import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { translate } from '@/shared/i18n';
import './contextMenu.css';

export interface CanvasMenuAction {
  name: string;
  icon: LucideIcon;
  run: () => void;
  keys?: string;
  disabled?: boolean;
  separatorBefore?: boolean;
  danger?: boolean;
  title?: string;
}

export default function CanvasActionMenu({
  x,
  y,
  title,
  actions,
  onClose,
}: {
  x: number;
  y: number;
  title: string;
  actions: CanvasMenuAction[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect)
      setPosition({
        x: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
        y: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
      });
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [x, y]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', outside);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={translate('Canvas actions')}
      className="canvas-context-menu"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape' || event.key === 'Tab') {
          event.preventDefault();
          onClose();
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }
      }}
    >
      <div className="px-3 py-2 text-xs text-theme-muted">{title}</div>
      {actions.map((action, index) => (
        <Fragment key={action.name}>
          {index > 0 && action.separatorBefore && <div role="separator" className="canvas-context-menu-separator" />}
          <button
            type="button"
            role="menuitem"
            disabled={action.disabled}
            title={action.title}
            className={action.danger ? 'text-rose-500' : ''}
            onClick={() => {
              onClose();
              action.run();
            }}
          >
            <action.icon size={15} aria-hidden="true" />
            <span className="flex-1 text-left">{action.name}</span>
            <kbd>{action.keys}</kbd>
          </button>
        </Fragment>
      ))}
    </div>,
    document.body,
  );
}
