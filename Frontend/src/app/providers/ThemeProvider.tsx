import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { registerSaveGuard } from '@/shared/api/pendingChanges';
import { httpClient } from '@/app/services';
import { createHttpAppearance } from '@/features/appearance/httpAppearance';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/errors';
import { readableText, contrastRatio } from '@/features/blocks/typography/textContrast';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
const appearanceApi = httpClient ? createHttpAppearance(httpClient) : null;
const ThemeContext = createContext<ThemeContextValue | null>(null);

function surfaceAltColor(surface: string) {
  return readableText(surface) === '#000000'
    ? `color-mix(in srgb, ${surface} 96%, #64748b)`
    : `color-mix(in srgb, ${surface} 82%, #050507)`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useTranslation();
  const [globalTheme, setGlobalTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem('nodexmesh_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  });
  const [scope, setScopeState] = useState({ userId: '', projectId: '' });
  const [preferences, setPreferences] = useState(newPreferences);
  const preferencesRef = useRef(preferences);
  const saveQueue = useRef(Promise.resolve());
  const loadedUser = useRef('');
  const saveFailed = useRef(false);
  const confirmedPreferences = useRef(preferences);
  useEffect(
    () =>
      registerSaveGuard(async () => {
        await saveQueue.current;
        return !saveFailed.current;
      }),
    [],
  );
  useEffect(() => {
    if (!appearanceApi || !scope.userId) return;
    let active = true;
    loadedUser.current = '';
    let request = 0;
    const reload = async () => {
      const generation = ++request;
      await saveQueue.current;
      if (!active || saveFailed.current) return;
      const before = preferencesRef.current;
      try {
        const value = await appearanceApi.load();
        if (!active || generation !== request || preferencesRef.current !== before) return;
        confirmedPreferences.current = value;
        saveFailed.current = false;
        preferencesRef.current = value;
        setPreferences(value);
        loadedUser.current = scope.userId;
      } catch (error) {
        if (active) toast.error(errorMessage(error));
      }
    };
    const reset = (event: Event) => {
      if ((event as CustomEvent<{ userId: string }>).detail.userId === scope.userId) void reload();
    };
    const focus = () => {
      void reload();
    };
    void reload();
    window.addEventListener('focus', focus);
    window.addEventListener('nodexmesh-appearance-reset', reset);
    return () => {
      active = false;
      window.removeEventListener('focus', focus);
      window.removeEventListener('nodexmesh-appearance-reset', reset);
    };
  }, [scope.userId]);
  useEffect(() => {
    if (appearanceApi) return;
    const reset = (event: Event) => {
      if ((event as CustomEvent<{ userId: string }>).detail.userId !== scope.userId) return;
      const value = readPreferences(scope.userId);
      preferencesRef.current = value;
      setPreferences(value);
    };
    window.addEventListener('nodexmesh-appearance-reset', reset);
    return () => window.removeEventListener('nodexmesh-appearance-reset', reset);
  }, [scope.userId]);
  const setScope = useCallback((userId: string, projectId: string) => {
    setScopeState((current) => {
      if (current.userId === userId && current.projectId === projectId) return current;
      return { userId, projectId };
    });
    if (!appearanceApi) {
      const value = readPreferences(userId);
      preferencesRef.current = value;
      setPreferences(value);
    }
  }, []);
  const appearance = activeAppearance(preferences, scope.projectId);
  const theme = appearance.mode ?? globalTheme;
  const change = useCallback(
    (fn: (current: AppearancePreferences) => AppearancePreferences) => {
      if (appearanceApi && loadedUser.current !== scope.userId) {
        toast.error(translate('Wait for appearance settings to load.'));
        return;
      }
      const current = preferencesRef.current;
      const next = fn(current);
      preferencesRef.current = next;
      setPreferences(next);
      if (appearanceApi) {
        saveQueue.current = saveQueue.current
          .then(async () => {
            await appearanceApi.save(confirmedPreferences.current, next);
            confirmedPreferences.current = next;
            saveFailed.current = false;
          })
          .catch((error) => {
            saveFailed.current = true;
            toast.error(errorMessage(error));
          });
      } else if (scope.userId) localStorage.setItem(preferenceKey(scope.userId), JSON.stringify(next));
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
    const text = readableText(palette.default);
    const mutedCandidate = text === '#000000' ? '#4b4654' : '#cfc8da';
    const muted = contrastRatio(mutedCandidate, palette.default) >= 4.5 ? mutedCandidate : text;
    const vars: Record<string, string> = {
      '--color-accent': palette.primary,
      '--color-on-accent': readableText(palette.primary),
      '--ui-on-accent': readableText(preferences.uiPrimary),
      '--color-accent-hover': palette.primary,
      '--color-accent-soft': `color-mix(in srgb, ${palette.primary} 14%, transparent)`,
      '--color-accent-soft-strong': `color-mix(in srgb, ${palette.primary} 24%, transparent)`,
      '--color-text-primary': text,
      '--color-text-secondary': muted,
      '--color-text-muted': muted,
      '--color-text-faint': muted,
      '--canvas-background': paletteBackground(palette, 'canvas'),
      '--color-secondary': palette.secondary,
      '--color-app-bg': palette.canvas,
      '--color-surface': palette.default,
      '--color-surface-alt': surfaceAltColor(palette.default),
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

export function PublicAppearanceProvider({
  appearance: shared,
  children,
}: {
  appearance: import('@/entities/project/shareTypes').PublicAppearance | null;
  children: React.ReactNode;
}) {
  useTranslation();
  const parent = useTheme();
  const appearance: Appearance = {
    ...parent.appearance,
    font: (shared?.font as FontFamily) || parent.appearance.font,
    light: { ...parent.appearance.light, ...shared?.light },
    dark: { ...parent.appearance.dark, ...shared?.dark },
  };
  const palette = appearance[parent.theme];
  return (
    <ThemeContext.Provider value={{ ...parent, appearance }}>
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={
          {
            '--canvas-background': paletteBackground(palette, 'canvas'),
            '--color-surface': palette.default,
            '--color-text-primary': readableText(palette.default),
            '--color-text-secondary': readableText(palette.default),
            '--color-text-muted': readableText(palette.default),
            '--color-text-faint': readableText(palette.default),
            '--color-on-accent': readableText(palette.primary),
            '--color-surface-alt': surfaceAltColor(palette.default),
            '--color-accent': palette.primary,
            '--project-font': getFontFamilyCss(appearance.font),
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
