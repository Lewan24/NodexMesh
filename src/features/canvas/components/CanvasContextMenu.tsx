import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, CopyPlus, ClipboardPaste, Trash2, Layers, Lock, Unlock } from 'lucide-react';

export interface CanvasMenuState {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  hasSelection: boolean;
}
export default function CanvasContextMenu({
  onCopyStyle,
  onPasteStyle,
  canPasteStyle,
  menu,
  count,
  canPaste,
  allLocked,
  onClose,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onLock,
  onGroup,
  onJoinDrawings,
}: {
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  canPasteStyle: boolean;
  onJoinDrawings?: () => void;
  menu: CanvasMenuState;
  count: number;
  canPaste: boolean;
  allLocked: boolean;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLock: () => void;
  onGroup: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: menu.x, y: menu.y });
  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect)
      setPosition({
        x: Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8)),
        y: Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8)),
      });
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
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
  const run = (action: () => void) => {
    action();
    onClose();
  };
  const actions = [
    ...(menu.hasSelection
      ? [
          ...(count === 1 ? [{ name: 'Copy style', keys: '', icon: Copy, run: onCopyStyle }] : []),
          {
            name: 'Paste style',
            keys: '',
            icon: ClipboardPaste,
            run: onPasteStyle,
            disabled: !canPasteStyle || allLocked,
          },
          { name: 'Copy', keys: 'Ctrl C', icon: Copy, run: onCopy },
          { name: 'Duplicate', keys: 'Ctrl D', icon: CopyPlus, run: onDuplicate },
        ]
      : []),
    { name: 'Paste here', keys: 'Ctrl V', icon: ClipboardPaste, run: onPaste, disabled: !canPaste },
    ...(menu.hasSelection
      ? [
          { name: allLocked ? 'Unlock' : 'Lock position', keys: '', icon: allLocked ? Unlock : Lock, run: onLock },
          ...(count > 1 ? [{ name: 'Group in frame', keys: '', icon: Layers, run: onGroup }] : []),
          ...(onJoinDrawings ? [{ name: 'Join drawings', keys: '', icon: Layers, run: onJoinDrawings }] : []),
          { name: 'Delete', keys: 'Del', icon: Trash2, run: onDelete },
        ]
      : []),
  ];
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Canvas actions"
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
          const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
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
      <div className="px-3 py-2 text-xs text-theme-muted">{menu.hasSelection ? `${count} selected` : 'Canvas'}</div>
      {actions.map((action) => (
        <button
          key={action.name}
          role="menuitem"
          disabled={action.disabled}
          onClick={() => run(action.run)}
          className={action.name === 'Delete' ? 'text-rose-500' : ''}
        >
          <action.icon size={15} />
          <span className="flex-1 text-left">{action.name}</span>
          <kbd>{action.keys}</kbd>
        </button>
      ))}
    </div>,
    document.body,
  );
}
