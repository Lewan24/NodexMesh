import {
  accentPresentation,
  defaultAppearance,
  validatedUiBackground,
  type AppearancePreferences,
} from './appearanceModel';
import { accentInk } from './appearanceTokens';
import { contrastRatio } from '@/features/blocks/typography/textContrast';

export function uiChromeTokens(
  preferences: Pick<AppearancePreferences, 'uiBackground' | 'uiPrimary' | 'uiSecondary'>,
  legacyBackground: string,
): Record<string, string> {
  const background = validatedUiBackground(preferences.uiBackground);
  const presentation = background
    ? accentPresentation(
        { ...defaultAppearance.light, primary: background.color, gradients: { primary: background.gradient } },
        'primary',
      )
    : { background: legacyBackground, foreground: '#ffffff' };
  const light = presentation.foreground === '#000000';
  const surface = light ? '#f4f5f6' : '#151c22';
  const foreground = presentation.foreground;
  const stops = background?.gradient
    ? [background.gradient.from, background.gradient.to]
    : [background?.color ?? '#151c22'];
  const ink = (color: string) => {
    const candidate = accentInk(color, surface);
    return stops.every((stop) => contrastRatio(candidate, stop) >= 4.5) ? candidate : presentation.foreground;
  };
  return {
    '--chrome-gradient': presentation.background,
    '--ui-accent-ink': ink(preferences.uiPrimary),
    '--ui-secondary-ink': ink(preferences.uiSecondary),
    '--color-chrome-bg': surface,
    '--color-chrome-bg-alt': light ? '#e6ebef' : '#11181e',
    '--color-chrome-panel': surface,
    '--color-chrome-hover': light ? '#dce3e8' : '#25313a',
    '--color-chrome-border': light ? '#c9d2da' : '#3b4853',
    '--color-chrome-border-soft': light ? '#17212b1a' : '#ffffff1a',
    '--color-chrome-text': foreground,
    '--color-chrome-text-strong': presentation.foreground,
    '--color-chrome-text-dim': foreground,
    '--color-chrome-text-faint': foreground,
  };
}
