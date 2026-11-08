import { Library, Palette, Moon, Sun } from 'lucide-react';
import { translate } from '@/shared/i18n';
import type { CanvasMenuAction } from '../components/CanvasActionMenu';

export interface WorkspaceMenuCallbacks {
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenAppearance?: () => void;
  onOpenLibrary?: () => void;
}

export function workspaceMenuActions({
  onOpenAppearance,
  onOpenLibrary,
  onToggleTheme,
  theme,
}: WorkspaceMenuCallbacks): CanvasMenuAction[] {
  if (!onOpenAppearance && !onOpenLibrary && !onToggleTheme) return [];
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
    ...(onToggleTheme
      ? [
          {
            name: translate(theme === 'dark' ? 'Light theme' : 'Dark theme'),
            icon: theme === 'dark' ? Sun : Moon,
            run: onToggleTheme,
            separatorBefore: true,
          },
        ]
      : []),
  ];
}
