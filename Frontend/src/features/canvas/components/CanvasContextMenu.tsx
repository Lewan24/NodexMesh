import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import CanvasActionMenu from './CanvasActionMenu';
import { workspaceMenuActions, type WorkspaceMenuCallbacks } from '../utils/workspaceMenuActions';
import {
  Copy,
  CopyPlus,
  ClipboardPaste,
  Trash2,
  Layers,
  Lock,
  Unlock,
  Code,
  ArrowLeftRight,
  LayoutGrid,
} from 'lucide-react';

export interface CanvasMenuState {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  hasSelection: boolean;
}
export default function CanvasContextMenu({
  onOpenAppearance,
  onOpenLibrary,
  onCustomCss,
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
  grouped = false,
  allTodo = false,
  allDone = false,
  hasTodo = false,
  onToggleTodo,
  onToggleDone,
  onJoinDrawings,
  onSwapItems,
  onArrangeItems,
  layoutDisabledReason,
}: WorkspaceMenuCallbacks & {
  onCustomCss?: () => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  canPasteStyle: boolean;
  onJoinDrawings?: () => void;
  onSwapItems?: () => void;
  onArrangeItems?: () => void;
  layoutDisabledReason?: string;
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
  grouped?: boolean;
  allTodo?: boolean;
  allDone?: boolean;
  hasTodo?: boolean;
  onToggleTodo?: () => void;
  onToggleDone?: () => void;
}) {
  useTranslation();
  const actions = [
    ...(menu.hasSelection
      ? [
          ...(count === 1 && onCustomCss
            ? [{ name: translate('Custom CSS…'), keys: '', icon: Code, run: onCustomCss }]
            : []),
          ...(count === 1 ? [{ name: translate('Copy style'), keys: '', icon: Copy, run: onCopyStyle }] : []),
          {
            name: translate('Paste style'),
            keys: '',
            icon: ClipboardPaste,
            run: onPasteStyle,
            disabled: !canPasteStyle || allLocked,
          },
          { name: translate('Copy'), keys: 'Ctrl C', icon: Copy, run: onCopy },
          { name: translate('Duplicate'), keys: 'Ctrl D', icon: CopyPlus, run: onDuplicate },
        ]
      : []),
    { name: translate('Paste here'), keys: 'Ctrl V', icon: ClipboardPaste, run: onPaste, disabled: !canPaste },
    ...(menu.hasSelection
      ? [
          {
            name: allLocked ? translate('Unlock') : translate('Lock position'),
            keys: '',
            icon: allLocked ? Unlock : Lock,
            run: onLock,
          },
          ...(count === 2 && onSwapItems
            ? [
                {
                  name: translate('Swap positions'),
                  icon: ArrowLeftRight,
                  keys: '',
                  run: onSwapItems,
                  disabled: !!layoutDisabledReason,
                  title: layoutDisabledReason ? translate(layoutDisabledReason) : undefined,
                },
              ]
            : []),
          ...(count >= 2 && onArrangeItems
            ? [
                {
                  name: translate('Distribute evenly'),
                  icon: LayoutGrid,
                  keys: '',
                  run: onArrangeItems,
                  disabled: !!layoutDisabledReason,
                  title: layoutDisabledReason ? translate(layoutDisabledReason) : undefined,
                },
              ]
            : []),
          ...(count > 1 || grouped
            ? [{ name: translate(grouped ? 'Ungroup' : 'Group'), keys: '', icon: Layers, run: onGroup }]
            : []),
          ...(onToggleTodo
            ? [{ name: translate(allTodo ? 'Remove TODO' : 'TODO item'), keys: '', icon: Layers, run: onToggleTodo }]
            : []),
          ...(hasTodo && onToggleDone
            ? [
                {
                  name: translate(allDone ? 'Mark as not done' : 'Mark as done'),
                  keys: '',
                  icon: Layers,
                  run: onToggleDone,
                },
              ]
            : []),
          ...(onJoinDrawings
            ? [{ name: translate('Join drawings'), keys: '', icon: Layers, run: onJoinDrawings }]
            : []),
          { name: translate('Delete'), keys: 'Del', icon: Trash2, run: onDelete, danger: true },
        ]
      : []),
  ];
  return (
    <CanvasActionMenu
      x={menu.x}
      y={menu.y}
      title={menu.hasSelection ? translate('{{value1}} selected', { value1: count }) : translate('Canvas')}
      actions={[...actions, ...workspaceMenuActions({ onOpenAppearance, onOpenLibrary })]}
      onClose={onClose}
    />
  );
}
