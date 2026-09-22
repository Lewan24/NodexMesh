import type { HttpClient } from '@/shared/api/httpClient';
import { newPreferences, type AppearancePreferences } from './appearanceModel';
import { fail } from '@/shared/api/errors';

export function createHttpAppearance(client: HttpClient) {
  return {
    async load(): Promise<AppearancePreferences> {
      const value = await client.request('/appearance');
      if (!value || typeof value !== 'object' || !('defaults' in value) || !('projects' in value))
        fail(422, 'invalid_appearance', 'Invalid appearance response.');
      const preferences = value as AppearancePreferences;
      const projects = Object.fromEntries(
        Object.entries(preferences.projects).map(([id, appearance]) => [
          id,
          {
            ...(appearance.mode == null ? {} : { mode: appearance.mode }),
            ...(appearance.font == null ? {} : { font: appearance.font }),
            ...(appearance.light == null ? {} : { light: appearance.light }),
            ...(appearance.dark == null ? {} : { dark: appearance.dark }),
          },
        ]),
      );
      return preferences.defaults == null ? { ...newPreferences(), projects } : { ...preferences, projects };
    },
    async save(previous: AppearancePreferences, next: AppearancePreferences) {
      if (JSON.stringify({ ...previous, projects: {} }) !== JSON.stringify({ ...next, projects: {} })) {
        await client.request('/appearance', {
          method: 'PUT',
          body: {
            font: next.defaults.font,
            mode: next.defaults.mode ?? null,
            light: next.defaults.light,
            dark: next.defaults.dark,
            uiFont: next.uiFont,
            uiPrimary: next.uiPrimary,
            uiSecondary: next.uiSecondary,
            inheritanceVersion: next.inheritanceVersion ?? 1,
            paletteVersion: next.paletteVersion ?? 2,
          },
        });
      }
      for (const id of new Set([...Object.keys(previous.projects), ...Object.keys(next.projects)])) {
        if (JSON.stringify(previous.projects[id]) === JSON.stringify(next.projects[id])) continue;
        const appearance = next.projects[id];
        await client.request(`/projects/${encodeURIComponent(id)}/appearance`, {
          method: 'PUT',
          body: {
            font: appearance?.font ?? null,
            mode: appearance?.mode ?? null,
            light: appearance?.light ?? null,
            dark: appearance?.dark ?? null,
          },
        });
      }
    },
  };
}
