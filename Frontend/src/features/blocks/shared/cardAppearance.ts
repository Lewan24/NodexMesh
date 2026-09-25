import type { BaseItem } from '@/entities/board/types';
import { paletteKeys } from '@/features/appearance/appearanceModel';
import type { Palette, PaletteKey } from '@/features/appearance/appearanceModel';
import { useTheme } from '@/app/providers/ThemeProvider';
import { readableText, contrastRatio } from '../typography/textContrast';

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
  opacity = 100,
) {
  const paletteRole = role ?? (isDefaultCardColor(color) ? 'default' : undefined);
  gradient = gradient ?? (paletteRole ? palette.gradients?.[paletteRole] : undefined);
  const solid = role ? palette[role] : isDefaultCardColor(color) ? palette.default : color!;
  const from = gradient ? resolvePaletteColor(gradient.from, palette) : solid;
  const to = gradient ? resolvePaletteColor(gradient.to, palette) : solid;
  const background = gradient
    ? gradient.kind === 'radial'
      ? `radial-gradient(circle at center, ${withOpacity(from, opacity)}, ${withOpacity(to, opacity)})`
      : `linear-gradient(${gradient.angle}deg, ${withOpacity(from, opacity)}, ${withOpacity(to, opacity)})`
    : withOpacity(solid, opacity);
  const textColor = readableText(from, to);
  const light = textColor === '#000000';
  const muted = light ? '#374151' : '#e5e7eb';
  return {
    background,
    solid,
    light,
    textColor,
    mutedColor: Math.min(contrastRatio(muted, from), contrastRatio(muted, to)) >= 4.5 ? muted : textColor,
  };
}
function withOpacity(color: string, opacity: number): string {
  const bounded = Math.max(0, Math.min(100, opacity));
  return bounded === 100 ? color : `color-mix(in srgb, ${color} ${bounded}%, transparent)`;
}

export function useCardAppearance(
  color?: string,
  gradient?: BaseItem['gradient'],
  role?: BaseItem['colorRole'],
  opacity = 100,
) {
  const { theme, appearance } = useTheme();
  return resolveAppearance(color, appearance[theme], gradient, role, opacity);
}
