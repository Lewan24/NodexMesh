import type { FontFamily } from '@/entities/board/types';
export const paletteKeys = ['default', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5'] as const;
export type PaletteKey = typeof paletteKeys[number];
export interface PaletteGradient { from: string; to: string; kind: 'linear' | 'radial'; angle: number }
export type Palette = Record<PaletteKey | 'primary' | 'secondary' | 'canvas', string> & {
  gradients?: Partial<Record<PaletteKey | 'canvas', PaletteGradient>>;
};
export function gradientBackground(gradient: PaletteGradient): string {
  return gradient.kind === 'radial' ? `radial-gradient(circle at center, ${gradient.from}, ${gradient.to})`
    : `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`;
}
export function paletteBackground(palette: Palette, key: PaletteKey | 'canvas'): string {
  const gradient = palette.gradients?.[key];
  return gradient ? gradientBackground({ ...gradient, from: paletteKeys.includes(gradient.from as PaletteKey) ? palette[gradient.from as PaletteKey] : gradient.from, to: paletteKeys.includes(gradient.to as PaletteKey) ? palette[gradient.to as PaletteKey] : gradient.to }) : palette[key];
}
export interface Appearance {
  light: Palette; dark: Palette; font: FontFamily; mode?: 'light' | 'dark';
}
export interface AppearancePreferences {
  defaults: Appearance; projects: Record<string, Appearance>; uiFont: FontFamily; uiPrimary: string; uiSecondary: string; inheritanceVersion?: number; paletteVersion?: number;
}
export const defaultAppearance: Appearance = {
  font: 'short-stack',
  light: { primary: '#5500cc', secondary: '#ff00f7', canvas: '#f4f1f9', default: '#ffffff', accent1: '#ede4fa', accent2: '#dceff2', accent3: '#e3f1e4', accent4: '#fff0d5', accent5: '#f8e2eb', gradients: { default: { from: 'accent1', to: 'accent5', angle: 120, kind: 'linear' } } },
  dark: { primary: '#5500cc', secondary: '#ff00f7', canvas: '#14101d', default: '#241b30', accent1: '#39264f', accent2: '#163b43', accent3: '#243e2d', accent4: '#463722', accent5: '#482839', gradients: { default: { from: 'accent1', to: 'accent5', angle: 120, kind: 'linear' } } },
};
export const preferenceKey = (userId: string) => 'nodexmesh_appearance_' + userId;
export function newPreferences(): AppearancePreferences { return { defaults: structuredClone(defaultAppearance), projects: {}, uiFont: 'sans', uiPrimary: '#5500cc', uiSecondary: '#ff00f7', inheritanceVersion: 1, paletteVersion: 2 }; }
export function activeAppearance(preferences: AppearancePreferences, projectId: string): Appearance {
  return preferences.projects[projectId] ?? preferences.defaults;
}
export function readPreferences(userId: string): AppearancePreferences {
  try {
    const raw = JSON.parse(localStorage.getItem(preferenceKey(userId)) ?? 'null');
    if (raw?.defaults?.light && raw?.defaults?.dark && raw?.projects) return upgradeDefaultPalette(raw.inheritanceVersion === 1 ? { ...newPreferences(), ...raw, paletteVersion: raw.paletteVersion } : migratePreferences({ ...newPreferences(), ...raw, paletteVersion: raw.paletteVersion }));
  } catch { /* Use defaults for unavailable/corrupt browser storage. */ }
  return newPreferences();
}

/** Switching mode must never create a new project palette override. */
export function withAppearanceMode(preferences: AppearancePreferences, projectId: string, mode: 'light' | 'dark'): AppearancePreferences {
  const custom = preferences.projects[projectId];
  return custom
    ? { ...preferences, projects: { ...preferences.projects, [projectId]: { ...custom, mode } } }
    : { ...preferences, defaults: { ...preferences.defaults, mode } };
}

/** Older mode toggles copied the whole default palette into project settings. */
export function migratePreferences(preferences: AppearancePreferences): AppearancePreferences {
  const projects = { ...preferences.projects };
  const sameStyle = (a: Appearance, b: Appearance) => a.font === b.font && JSON.stringify(a.light.gradients) === JSON.stringify(b.light.gradients) && JSON.stringify(a.dark.gradients) === JSON.stringify(b.dark.gradients) &&
    (['light', 'dark'] as const).every(mode => Object.keys(b[mode]).filter(key => key !== 'gradients').every(key => a[mode]?.[key as keyof Palette] === b[mode][key as keyof Palette]));
  for (const [id, value] of Object.entries(projects)) {
    if (sameStyle(value, preferences.defaults) || sameStyle(value, defaultAppearance)) delete projects[id];
  }
  return { ...preferences, projects, inheritanceVersion: 1 };
}

export function upgradeDefaultPalette(preferences: AppearancePreferences): AppearancePreferences {
  if (preferences.paletteVersion === 2) return preferences;
  const next = structuredClone(preferences);
  for (const mode of ['light', 'dark'] as const) {
    const palette = next.defaults[mode];
    if (['#6023b4', '#ab80e5'].includes(palette.primary)) palette.primary = '#5500cc';
    if (['#176f86', '#57bdc8'].includes(palette.secondary)) palette.secondary = '#ff00f7';
    if (!palette.gradients?.default && palette.default === (mode === 'light' ? '#ffffff' : '#241b30'))
      palette.gradients = { ...palette.gradients, default: { from: 'accent1', to: 'accent5', angle: 120, kind: 'linear' } };
  }
  if (next.uiPrimary === '#6023b4') next.uiPrimary = '#5500cc';
  if (next.uiSecondary === '#176f86') next.uiSecondary = '#ff00f7';
  next.paletteVersion = 2;
  return next;
}
