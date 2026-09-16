import PaletteEditor from './PaletteEditor';
import '@/features/blocks/shared/planning.css';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/app/providers/ThemeProvider';
import { FONT_FAMILIES } from '@/features/blocks/typography/typographyUtils';
import type { FontFamily } from '@/entities/board/types';
import type { Project } from '@/entities/project/types';
import type { Appearance } from './appearanceModel';
import { defaultAppearance } from './appearanceModel';

export default function AppearanceDialog({ onClose, projects }: { onClose: () => void; projects: Project[] }) {
  const { preferences, savePreferences } = useTheme();
  const [settings, setSettings] = useState(() => structuredClone(preferences));
  const [tab, setTab] = useState<'ui' | 'canvas'>('ui');
  const [scope, setScope] = useState('');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const customEnabled = !!settings.projects[scope];
  const draft = settings.projects[scope] ?? settings.defaults;
  const updateDraft = (next: Appearance) =>
    setSettings((current) =>
      scope && !current.projects[scope]
        ? current
        : scope
          ? { ...current, projects: { ...current.projects, [scope]: next } }
          : { ...current, defaults: next },
    );
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 250000 }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <form
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Appearance settings"
        data-wheel-scroll="true"
        className="w-full max-w-2xl max-h-[90vh] overflow-auto p-6 space-y-4 rounded-sm shadow-2xl"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        onSubmit={(event) => {
          event.preventDefault();
          savePreferences(settings);
          onClose();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') onClose();
          if (event.key === 'Tab') {
            const fields = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled),select:not(:disabled)',
              ),
            );
            const first = fields[0],
              last = fields[fields.length - 1];
            if (
              event.shiftKey &&
              (document.activeElement === first || document.activeElement === event.currentTarget)
            ) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div role="tablist" aria-label="Appearance sections" className="flex gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ui'}
            className="planning-button"
            onClick={() => setTab('ui')}
          >
            UI - all projects
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'canvas'}
            className="planning-button"
            onClick={() => setTab('canvas')}
          >
            Canvas - defaults & projects
          </button>
        </div>
        {tab === 'ui' ? (
          <section role="tabpanel" className="space-y-4">
            <p className="text-sm opacity-75">
              Your app bar and tool sidebar keep the same appearance across all projects, in both light and dark modes.
            </p>
            <label className="flex justify-between">
              UI primary color
              <input
                aria-label="UI primary color"
                type="color"
                value={settings.uiPrimary}
                onChange={(event) => setSettings({ ...settings, uiPrimary: event.target.value })}
              />
            </label>
            <label className="flex justify-between">
              UI secondary color
              <input
                aria-label="UI secondary color"
                type="color"
                value={settings.uiSecondary}
                onChange={(event) => setSettings({ ...settings, uiSecondary: event.target.value })}
              />
            </label>
            <label className="block">
              Interface font
              <select
                className="planning-input w-full"
                value={settings.uiFont}
                onChange={(event) => setSettings({ ...settings, uiFont: event.target.value as FontFamily })}
              >
                {FONT_FAMILIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : (
          <section role="tabpanel" className="space-y-4">
            <p className="text-sm opacity-75">
              Defaults apply to new projects and projects without custom settings. Choose a project to override its
              canvas, cards and dialogs for your account.
            </p>
            <label className="block">
              Canvas settings for
              <select
                className="planning-input w-full"
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              >
                <option value="">Defaults - new and uncustomized projects</option>
                {projects
                  .filter((project) => !project.deletedAt)
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </label>
            {scope && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={customEnabled}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      setSettings((current) => {
                        const next = { ...current, projects: { ...current.projects } };
                        if (enabled) next.projects[scope] = structuredClone(current.defaults);
                        else delete next.projects[scope];
                        return next;
                      });
                    }}
                  />
                  Use custom project theme
                </label>
                <p className="text-sm opacity-75" role="status">
                  {customEnabled
                    ? 'Custom settings are enabled for this project.'
                    : 'Using general defaults. Enable the checkbox to edit this project’s theme.'}
                </p>
              </div>
            )}
            <fieldset disabled={!!scope && !customEnabled} className="space-y-4 disabled:opacity-50">
              <div className="flex gap-2">
                {(['light', 'dark'] as const).map((value) => (
                  <button
                    type="button"
                    className="planning-button"
                    aria-pressed={value === mode}
                    key={value}
                    onClick={() => setMode(value)}
                  >
                    {value === 'light' ? 'Light palette' : 'Dark palette'}
                  </button>
                ))}
              </div>
              <PaletteEditor
                palette={draft[mode]}
                mode={mode}
                onChange={(palette) => updateDraft({ ...draft, [mode]: palette })}
              />
              <label className="block">
                Preferred mode
                <select
                  className="planning-input w-full"
                  value={draft.mode ?? ''}
                  onChange={(event) =>
                    updateDraft({
                      ...draft,
                      mode: event.target.value ? (event.target.value as 'light' | 'dark') : undefined,
                    })
                  }
                >
                  <option value="">Use general mode</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label className="block">
                Default font for board items
                <select
                  className="planning-input w-full"
                  value={draft.font}
                  onChange={(event) => updateDraft({ ...draft, font: event.target.value as FontFamily })}
                >
                  {FONT_FAMILIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  className="planning-button"
                  type="button"
                  onClick={() => updateDraft(structuredClone(defaultAppearance))}
                >
                  Reset palette
                </button>
              </div>
            </fieldset>
          </section>
        )}
        <div className="flex gap-2 justify-end">
          <button className="planning-button ml-auto" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="planning-button" style={{ background: 'var(--color-accent)', color: 'white' }}>
            Save appearance
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
