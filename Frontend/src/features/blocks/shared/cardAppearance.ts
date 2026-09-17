import type { BaseItem } from '@/entities/board/types';
import { paletteKeys } from '@/features/appearance/appearanceModel';
import type { Palette, PaletteKey } from '@/features/appearance/appearanceModel';
import { useTheme } from '@/app/providers/ThemeProvider';
import { isLightColor } from '../kanban/utils/kanbanUtils';

export function isDefaultCardColor(color?: string): boolean {
  return !color || ['#fff', '#ffffff', 'white'].includes(color.trim().toLowerCase());
}
export function resolveCardColor(color: string | undefined, theme: 'light' | 'dark'): string {
  return isDefaultCardColor(color) ? (theme === 'dark' ? '#1f1233' : '#ffffff') : color!;
}

export function resolvePaletteColor(color: string, palette: Palette): string {
  return paletteKeys.includes(color as PaletteKey) ? palette[color as PaletteKey] : color;
}
export function resolveAppearance(
  color: string | undefined,
  palette: Palette,
  gradient?: BaseItem['gradient'],
  role?: BaseItem['colorRole'],
) {
  const paletteRole = role ?? (isDefaultCardColor(color) ? 'default' : undefined);
  gradient = gradient ?? (paletteRole ? palette.gradients?.[paletteRole] : undefined);
  const solid = role ? palette[role] : isDefaultCardColor(color) ? palette.default : color!;
  const from = gradient ? resolvePaletteColor(gradient.from, palette) : solid;
  const to = gradient ? resolvePaletteColor(gradient.to, palette) : solid;
  const background = gradient
    ? gradient.kind === 'radial'
      ? `radial-gradient(circle at center, ${from}, ${to})`
      : `linear-gradient(${gradient.angle}deg, ${from}, ${to})`
    : solid;
  const light = isLightColor(from) && isLightColor(to);
  return {
    background,
    solid,
    light,
    textColor: light ? '#172033' : '#f8fafc',
    mutedColor: light ? '#475569' : '#c8bed5',
  };
}
export function useCardAppearance(color?: string, gradient?: BaseItem['gradient'], role?: BaseItem['colorRole']) {
  const { theme, appearance } = useTheme();
  return resolveAppearance(color, appearance[theme], gradient, role);
}
