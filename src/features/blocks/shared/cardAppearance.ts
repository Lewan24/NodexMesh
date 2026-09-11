import { useTheme } from '@/app/providers/ThemeProvider';
import { isLightColor } from '../kanban/utils/kanbanUtils';

export function isDefaultCardColor(color?: string): boolean {
  return !color || ['#fff', '#ffffff', 'white'].includes(color.trim().toLowerCase());
}
export function resolveCardColor(color: string | undefined, theme: 'light' | 'dark'): string {
  return isDefaultCardColor(color) ? (theme === 'dark' ? '#1f1233' : '#ffffff') : color!;
}
export function useCardAppearance(color?: string) {
  const { theme } = useTheme();
  const background = resolveCardColor(color, theme);
  const light = isLightColor(background);
  return { background, light, textColor: light ? '#1e293b' : '#f1f5f9', mutedColor: light ? '#64748b' : '#b9aec9' };
}
