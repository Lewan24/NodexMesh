import { readableText, contrastRatio } from '@/features/blocks/typography/textContrast';
import type { FontFamily } from '@/entities/board/types';
export const paletteKeys = ['default', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5'] as const;
export type PaletteKey = (typeof paletteKeys)[number];
export type AccentRole = 'primary' | 'secondary';
export type PaletteColorKey = PaletteKey | AccentRole | 'canvas';
export const DEFAULT_UI_PRIMARY = '#334c5c';
export const DEFAULT_UI_SECONDARY = '#b64a25';
export interface PaletteGradient {
  from: string;
  to: string;
  kind: 'linear' | 'radial';
  angle: number;
}
export type Palette = Record<PaletteKey | 'primary' | 'secondary' | 'canvas', string> & {
  gradients?: Partial<Record<PaletteColorKey, PaletteGradient>>;
  overrides?: Partial<Record<AccentRole, boolean>>;
};
export function gradientBackground(gradient: PaletteGradient): string {
  return gradient.kind === 'radial'
    ? `radial-gradient(circle at center, ${gradient.from}, ${gradient.to})`
    : `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`;
}
const validHex = (value: unknown): value is string =>
  typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
export function validatedGradient(palette: Palette, key: PaletteColorKey): PaletteGradient | undefined {
  const gradient = palette.gradients?.[key];
  if (
    !gradient ||
    !['linear', 'radial'].includes(gradient.kind) ||
    !Number.isFinite(gradient.angle) ||
    gradient.angle < 0 ||
    gradient.angle > 360
  )
    return;
  const resolve = (value: string) => (paletteKeys.includes(value as PaletteKey) ? palette[value as PaletteKey] : value);
  const from = resolve(gradient.from),
    to = resolve(gradient.to);
  return validHex(from) && validHex(to) ? { ...gradient, from, to } : undefined;
}
export function paletteBackground(palette: Palette, key: PaletteColorKey): string {
  const gradient = validatedGradient(palette, key);
  return gradient ? gradientBackground(gradient) : validHex(palette[key]) ? palette[key] : defaultAppearance.light[key];
}
export interface Appearance {
  light: Palette;
  dark: Palette;
  font: FontFamily;
  mode?: 'light' | 'dark';
}
export const DEFAULT_SIDEBAR_WIDTH = 235;
export const MIN_SIDEBAR_WIDTH = 160;
export const MAX_SIDEBAR_WIDTH = 400;
export function normalizeSidebarWidth(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, value)))
    : DEFAULT_SIDEBAR_WIDTH;
}
export interface UiBackground {
  color: string;
  gradient?: PaletteGradient;
}
export const DEFAULT_UI_BACKGROUND: UiBackground = { color: '#20262b' };
export interface AppearancePreferences {
  sidebarWidth?: number;
  defaults: Appearance;
  projects: Record<string, Partial<Appearance>>;
  uiFont: FontFamily;
  uiPrimary: string;
  uiSecondary: string;
  uiGradients?: Partial<Record<AccentRole, PaletteGradient>>;
  uiBackground?: UiBackground;
  inheritanceVersion?: number;
  paletteVersion?: number;
}
export const defaultAppearance: Appearance = {
  font: 'short-stack',
  light: {
    primary: DEFAULT_UI_PRIMARY,
    secondary: DEFAULT_UI_SECONDARY,
    canvas: '#f5f5f7',
    default: '#ffffff',
    accent1: '#6e5fa8',
    accent2: '#56718f',
    accent3: '#537f83',
    accent4: '#66836d',
    accent5: '#946a6a',
    gradients: {},
    overrides: { primary: false, secondary: false },
  },
  dark: {
    primary: DEFAULT_UI_PRIMARY,
    secondary: DEFAULT_UI_SECONDARY,
    canvas: '#1F1F22',
    default: '#25252A',
    accent1: '#8272ba',
    accent2: '#6984a1',
    accent3: '#669297',
    accent4: '#78967f',
    accent5: '#aa7d7d',
    gradients: {},
    overrides: { primary: false, secondary: false },
  },
};
export const preferenceKey = (userId: string) => 'nodexmesh_appearance_' + userId;
export function newPreferences(): AppearancePreferences {
  return {
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    defaults: structuredClone(defaultAppearance),
    projects: {},
    uiFont: 'sans',
    uiPrimary: DEFAULT_UI_PRIMARY,
    uiSecondary: DEFAULT_UI_SECONDARY,
    inheritanceVersion: 1,
    paletteVersion: 4,
    uiGradients: {},
    uiBackground: structuredClone(DEFAULT_UI_BACKGROUND),
  };
}
export function activeAppearance(preferences: AppearancePreferences, projectId: string): Appearance {
  const raw = preferences.projects[projectId]
    ? { ...preferences.defaults, ...preferences.projects[projectId] }
    : preferences.defaults;
  const light = inheritAccents(raw.light, preferences),
    dark = inheritAccents(raw.dark, preferences);
  return light === raw.light && dark === raw.dark ? raw : { ...raw, light, dark };
}
export function readPreferences(userId: string): AppearancePreferences {
  try {
    const raw = JSON.parse(localStorage.getItem(preferenceKey(userId)) ?? 'null');
    if (raw?.defaults?.light && raw?.defaults?.dark && raw?.projects)
      return upgradeDefaultPalette(
        raw.inheritanceVersion === 1
          ? { ...newPreferences(), ...raw, uiBackground: raw.uiBackground, paletteVersion: raw.paletteVersion }
          : migratePreferences({
              ...newPreferences(),
              ...raw,
              uiBackground: raw.uiBackground,
              paletteVersion: raw.paletteVersion,
            }),
      );
  } catch {
    /* Use defaults for unavailable/corrupt browser storage. */
  }
  return newPreferences();
}

/** Switching mode must never create a new project palette override. */
export function withAppearanceMode(
  preferences: AppearancePreferences,
  projectId: string,
  mode: 'light' | 'dark',
): AppearancePreferences {
  const custom = preferences.projects[projectId];
  return custom
    ? { ...preferences, projects: { ...preferences.projects, [projectId]: { ...custom, mode } } }
    : { ...preferences, defaults: { ...preferences.defaults, mode } };
}

/** Older mode toggles copied the whole default palette into project settings. */
export function migratePreferences(preferences: AppearancePreferences): AppearancePreferences {
  const projects = { ...preferences.projects };
  const sameStyle = (a: Partial<Appearance>, b: Appearance) =>
    a.font === b.font &&
    JSON.stringify(a.light?.gradients) === JSON.stringify(b.light.gradients) &&
    JSON.stringify(a.dark?.gradients) === JSON.stringify(b.dark.gradients) &&
    (['light', 'dark'] as const).every((mode) =>
      Object.keys(b[mode])
        .filter((key) => key !== 'gradients' && key !== 'overrides')
        .every((key) => a[mode]?.[key as keyof Palette] === b[mode][key as keyof Palette]),
    );
  for (const [id, value] of Object.entries(projects)) {
    if (sameStyle(value, preferences.defaults) || sameStyle(value, defaultAppearance)) delete projects[id];
  }
  return { ...preferences, projects, inheritanceVersion: 1 };
}

function upgradeOldPalette(preferences: AppearancePreferences): AppearancePreferences {
  if (preferences.paletteVersion === 3) return preferences;
  const next = structuredClone(preferences);
  if (preferences.paletteVersion !== 2) {
    for (const mode of ['light', 'dark'] as const) {
      const palette = next.defaults[mode];
      if (['#6023b4', '#ab80e5'].includes(palette.primary)) palette.primary = '#5500cc';
      if (['#176f86', '#57bdc8'].includes(palette.secondary)) palette.secondary = '#ff00f7';
      if (!palette.gradients?.default && palette.default === (mode === 'light' ? '#ffffff' : '#241b30'))
        palette.gradients = {
          ...palette.gradients,
          default: { from: 'accent1', to: 'accent5', angle: 120, kind: 'linear' },
        };
    }
    if (next.uiPrimary === '#6023b4') next.uiPrimary = '#5500cc';
    if (next.uiSecondary === '#176f86') next.uiSecondary = '#ff00f7';
  }
  for (const appearance of [next.defaults, ...Object.values(next.projects)]) {
    const palette = appearance.dark;
    if (!palette) continue;
    if (!palette.gradients?.canvas && palette.canvas?.toLowerCase() === '#0b0b0c') palette.canvas = '#1F1F22';
    if (!palette.gradients?.default && palette.default?.toLowerCase() === '#18181b') palette.default = '#25252A';
  }
  next.paletteVersion = 3;
  return next;
}

export function inheritAccents(
  palette: Palette,
  preferences: Pick<AppearancePreferences, 'uiPrimary' | 'uiSecondary' | 'uiGradients'>,
): Palette {
  const next = { ...palette, gradients: { ...palette.gradients } };
  for (const role of ['primary', 'secondary'] as const) {
    if (palette.overrides?.[role] !== false) continue;
    next[role] = role === 'primary' ? preferences.uiPrimary : preferences.uiSecondary;
    const gradient = preferences.uiGradients?.[role];
    if (gradient) next.gradients[role] = { ...gradient };
    else delete next.gradients[role];
  }
  return next.primary === palette.primary &&
    next.secondary === palette.secondary &&
    JSON.stringify(next.gradients) === JSON.stringify(palette.gradients ?? {})
    ? palette
    : next;
}

/** Upgrade only known former defaults; explicitly customized colors remain overrides. */
export function upgradeDefaultPalette(preferences: AppearancePreferences): AppearancePreferences {
  if (preferences.paletteVersion === 4) return preferences;
  const originalPrimary = preferences.uiPrimary,
    originalSecondary = preferences.uiSecondary;
  const next = structuredClone(upgradeOldPalette(preferences));
  if (['#8000ff', '#5500cc', '#6023b4'].includes(next.uiPrimary?.toLowerCase())) next.uiPrimary = DEFAULT_UI_PRIMARY;
  if (['#6a00eb', '#ff00f7', '#176f86'].includes(next.uiSecondary?.toLowerCase()))
    next.uiSecondary = DEFAULT_UI_SECONDARY;
  for (const appearance of [next.defaults, ...Object.values(next.projects)]) {
    for (const mode of ['light', 'dark'] as const) {
      const palette = appearance[mode];
      if (!palette) continue;
      palette.overrides = { ...palette.overrides };
      for (const role of ['primary', 'secondary'] as const) {
        if (typeof palette.overrides[role] === 'boolean') continue;
        const previousUi = role === 'primary' ? originalPrimary : originalSecondary;
        const formerDefaults =
          role === 'primary'
            ? ['#903df5', '#5500cc', '#6023b4', '#ab80e5']
            : ['#ff0000', '#ff00f7', '#176f86', '#57bdc8'];
        palette.overrides[role] =
          Boolean(palette.gradients?.[role]) ||
          !(palette[role] === previousUi || formerDefaults.includes(palette[role]?.toLowerCase()));
      }
    }
  }
  next.uiGradients ??= {};
  next.paletteVersion = 4;
  return next;
}

export interface UiColorPreset {
  name: string;
  primary: string;
  secondary: string;
  background: UiBackground;
  gradients?: AppearancePreferences['uiGradients'];
}
const background = (color: string, to?: string, kind: 'linear' | 'radial' = 'linear'): UiBackground => ({
  color,
  ...(to ? { gradient: { from: color, to, kind, angle: 135 } } : {}),
});
export const uiColorPresets: UiColorPreset[] = [
  { name: 'Lagoon', primary: '#087f8c', secondary: '#c6532e', background: background('#102c36', '#20333c') },
  { name: 'Chocolate', primary: '#87502e', secondary: '#167d78', background: background('#f3e8dc') },
  {
    name: 'Charcoal',
    primary: DEFAULT_UI_PRIMARY,
    secondary: DEFAULT_UI_SECONDARY,
    background: structuredClone(DEFAULT_UI_BACKGROUND),
  },
  {
    name: 'Cyberpunk',
    primary: '#006a88',
    secondary: '#c52277',
    background: background('#11172f', '#341b3e'),
    gradients: {
      primary: { from: '#006a88', to: '#00735e', kind: 'linear', angle: 120 },
      secondary: { from: '#ae246b', to: '#b84a26', kind: 'linear', angle: 120 },
    },
  },
  { name: 'Porcelain', primary: '#334155', secondary: '#2563eb', background: background('#f2f4f7') },
  { name: 'Sage', primary: '#39715a', secondary: '#b45d42', background: background('#e9f0e7', '#f6f2e6') },
  { name: 'Midnight', primary: '#2463c8', secondary: '#bd6a32', background: background('#121e35') },
  { name: 'Aurora', primary: '#147d81', secondary: '#8952b5', background: background('#102f35', '#2a2142', 'radial') },
  { name: 'Sunset', primary: '#bd4d2b', secondary: '#934675', background: background('#352024', '#492b39') },
  { name: 'Ocean', primary: '#1f62b5', secondary: '#087d83', background: background('#e7f2fa', '#ddf3ef') },
  { name: 'Rosewood', primary: '#9f3e54', secondary: '#9b702d', background: background('#f7e9e7') },
  { name: 'Mono', primary: '#333c45', secondary: '#56616c', background: background('#e9edf0') },
];

/** Unknown legacy JSON can never become an arbitrary CSS background. */
export function validatedUiBackground(value: UiBackground | undefined): UiBackground | undefined {
  if (!value || !validHex(value.color)) return;
  if (!value.gradient) return { color: value.color };
  const palette = { ...defaultAppearance.light, gradients: { primary: value.gradient } };
  const gradient = validatedGradient(palette, 'primary');
  if (!gradient || !validHex(value.gradient.from) || !validHex(value.gradient.to)) return;
  return { color: value.color, gradient };
}

export function accentPresentation(palette: Palette, role: AccentRole): { background: string; foreground: string } {
  const gradient = validatedGradient(palette, role);
  const stops = gradient ? [gradient.from, gradient.to] : [paletteBackground(palette, role)];
  const foreground = readableText(...stops);
  const background = paletteBackground(palette, role);
  // Extremely mixed light/dark stops cannot share one legible foreground.
  // A uniform scrim preserves the selected gradient while protecting button labels.
  return Math.min(...stops.map((color) => contrastRatio(foreground, color))) >= 4.5
    ? { background, foreground }
    : { background: `linear-gradient(rgb(0 0 0 / 55%), rgb(0 0 0 / 55%)), ${background}`, foreground: '#ffffff' };
}
