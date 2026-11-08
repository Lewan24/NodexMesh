import { Library, Palette } from 'lucide-react';
import { translate } from '@/shared/i18n';
import type { CanvasMenuAction } from '../components/CanvasActionMenu';

export interface WorkspaceMenuCallbacks {
  onOpenAppearance?: () => void;
  onOpenLibrary?: () => void;
}

export function workspaceMenuActions({ onOpenAppearance, onOpenLibrary }: WorkspaceMenuCallbacks): CanvasMenuAction[] {
  if (!onOpenAppearance && !onOpenLibrary) return [];
  return [
    ...(onOpenAppearance
      ? [
          {
            name: translate('Change application appearance'),
            icon: Palette,
            run: onOpenAppearance,
            separatorBefore: true,
          },
        ]
      : []),
    { name: translate('Open library'), icon: Library, disabled: !onOpenLibrary, run: () => onOpenLibrary?.() },
  ];
}
