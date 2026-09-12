import { isLightColor } from '@/features/blocks/kanban/utils/kanbanUtils';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  paletteBackground,
  withAppearanceMode,
  activeAppearance,
  newPreferences,
  preferenceKey,
  readPreferences,
} from '@/features/appearance/appearanceModel';
import type { Appearance, AppearancePreferences } from '@/features/appearance/appearanceModel';
import { getFontFamilyCss } from '@/features/blocks/typography/typographyUtils';
import type { FontFamily } from '@/entities/board/types';
export type Theme = 'light' | 'dark';
interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  appearance: Appearance;
  preferences: AppearancePreferences;
  projectId: string;
  setScope: (userId: string, projectId: string) => void;
  saveAppearance: (appearance: Appearance, project: boolean) => void;
  savePreferences: (preferences: AppearancePreferences) => void;
  resetProject: () => void;
  setUiFont: (font: FontFamily) => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [globalTheme, setGlobalTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem('nodexmesh_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [scope, setScopeState] = useState({ userId: '', projectId: '' });
  const [preferences, setPreferences] = useState(newPreferences);
  const setScope = useCallback((userId: string, projectId: string) => {
    setScopeState((current) => {
      if (current.userId === userId && current.projectId === projectId) return current;
      return { userId, projectId };
    });
    setPreferences(readPreferences(userId));
  }, []);
  const appearance = activeAppearance(preferences, scope.projectId);
  const theme = appearance.mode ?? globalTheme;
  const change = useCallback(
    (fn: (current: AppearancePreferences) => AppearancePreferences) => {
      setPreferences((current) => {
        const next = fn(current);
        if (scope.userId) localStorage.setItem(preferenceKey(scope.userId), JSON.stringify(next));
        return next;
      });
    },
    [scope.userId],
  );
  const savePreferences = useCallback((next: AppearancePreferences) => change(() => next), [change]);
  const saveAppearance = useCallback(
    (value: Appearance, project: boolean) =>
      change((current) =>
        project && scope.projectId
          ? { ...current, projects: { ...current.projects, [scope.projectId]: value } }
          : { ...current, defaults: value },
      ),
    [change, scope.projectId],
  );
  const resetProject = useCallback(
    () =>
      change((current) => {
        const projects = { ...current.projects };
        delete projects[scope.projectId];
        return { ...current, projects };
      }),
    [change, scope.projectId],
  );
  const setUiFont = useCallback((font: FontFamily) => change((current) => ({ ...current, uiFont: font })), [change]);
  const setTheme = useCallback(
    (next: Theme) => {
      if (scope.userId) change((current) => withAppearanceMode(current, scope.projectId, next));
      else {
        setGlobalTheme(next);
        localStorage.setItem('nodexmesh_theme', next);
      }
    },
    [scope, change],
  );
  const toggleTheme = useCallback(() => setTheme(theme === 'light' ? 'dark' : 'light'), [setTheme, theme]);
  useEffect(() => {
    const root = document.documentElement,
      palette = appearance[theme];
    root.dataset.theme = theme;
    const vars: Record<string, string> = {
      '--color-accent': palette.primary,
      '--color-accent-hover': palette.primary,
      '--color-accent-soft': `color-mix(in srgb, ${palette.primary} 14%, transparent)`,
      '--color-accent-soft-strong': `color-mix(in srgb, ${palette.primary} 24%, transparent)`,
      '--color-text-primary': isLightColor(palette.default) ? '#1c1330' : '#f5f0fc',
      '--color-text-secondary': isLightColor(palette.default) ? '#514360' : '#d2c4e4',
      '--color-text-muted': isLightColor(palette.default) ? '#685777' : '#b6a5ca',
      '--color-text-faint': isLightColor(palette.default) ? '#746581' : '#a695ba',
      '--canvas-background': paletteBackground(palette, 'canvas'),
      '--color-secondary': palette.secondary,
      '--color-app-bg': palette.canvas,
      '--color-surface': palette.default,
      '--color-surface-alt': palette.accent1,
      '--color-surface-translucent': `color-mix(in srgb, ${palette.default} 94%, transparent)`,
      '--chrome-gradient': `linear-gradient(135deg, color-mix(in srgb, ${preferences.uiPrimary} 35%, #10071d), color-mix(in srgb, ${preferences.uiSecondary} 15%, #130921))`,
      '--ui-accent': preferences.uiPrimary,
      '--ui-secondary': preferences.uiSecondary,
      '--project-font': getFontFamilyCss(appearance.font),
      '--ui-font': getFontFamilyCss(preferences.uiFont),
    };
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    return () => Object.keys(vars).forEach((key) => root.style.removeProperty(key));
  }, [appearance, theme, preferences.uiFont, preferences.uiPrimary, preferences.uiSecondary]);
  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      appearance,
      preferences,
      projectId: scope.projectId,
      setScope,
      saveAppearance,
      savePreferences,
      resetProject,
      setUiFont,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      appearance,
      preferences,
      scope.projectId,
      setScope,
      saveAppearance,
      savePreferences,
      resetProject,
      setUiFont,
    ],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is required');
  return context;
}
