import { translate } from '@/shared/i18n';
import type { ToolType } from '@/entities/board/toolTypes';
import { CheckSquare, File, FileText, Link, StickyNote, Type } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface QuickConnectMenuState {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  lineId: string;
  endpoint: 1 | 2;
}

const items: Array<{ type: ToolType; label: string; icon: typeof StickyNote }> = [
  { type: 'note', label: 'Note', icon: StickyNote },
  { type: 'checklist', label: 'Checklist', icon: CheckSquare },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'document', label: 'Document', icon: FileText },
  { type: 'file', label: 'File', icon: File },
  { type: 'link', label: 'Link', icon: Link },
];

export default function QuickConnectMenu({
  menu,
  onCreate,
  onClose,
}: {
  menu: QuickConnectMenuState;
  onCreate: (type: ToolType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: menu.x, y: menu.y });

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        x: Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8)),
        y: Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8)),
      });
    }
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [menu.x, menu.y]);

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
      aria-label={translate('Create connected item')}
      className="canvas-context-menu quick-connect-menu"
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
          const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
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
      <div className="px-3 py-2">
        <div className="text-xs font-semibold">{translate('Create connected item')}</div>
        <div className="mt-0.5 text-[10px] text-theme-muted">{translate('Or click outside to keep the arrow')}</div>
      </div>
      {items.map(({ type, label, icon: Icon }) => (
        <button key={type} role="menuitem" onClick={() => onCreate(type)}>
          <Icon size={15} />
          <span className="flex-1 text-left">{translate(label)}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
