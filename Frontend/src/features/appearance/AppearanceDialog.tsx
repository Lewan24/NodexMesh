import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import PaletteEditor from './PaletteEditor';
import '@/features/blocks/shared/planning.css';
import { useState } from 'react';
import { Palette, PanelsTopLeft, SlidersHorizontal, X } from 'lucide-react';
import Modal from '@/shared/components/dialogs/Modal';
import '@/shared/components/dialogs/settingsDialog.css';
import { useTheme } from '@/app/providers/ThemeProvider';
import FontPicker from './FontPicker';
import type { Project } from '@/entities/project/types';
import type { Appearance } from './appearanceModel';
import {
  activeAppearance,
  defaultAppearance,
  normalizeSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
} from './appearanceModel';

export default function AppearanceDialog({ onClose, projects }: { onClose: () => void; projects: Project[] }) {
  useTranslation();
  const { preferences, savePreferences } = useTheme();
  const [settings, setSettings] = useState(() => structuredClone(preferences));
  const [tab, setTab] = useState<'ui' | 'canvas'>('ui');
  const [scope, setScope] = useState('');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const customEnabled = !!settings.projects[scope];
  const draft = activeAppearance(settings, scope);
  const updateDraft = (next: Appearance) =>
    setSettings((current) =>
      scope && !current.projects[scope]
        ? current
        : scope
          ? { ...current, projects: { ...current.projects, [scope]: next } }
          : { ...current, defaults: next },
    );
  return (
    <Modal onClose={onClose} centered label={translate('Appearance settings')}>
      <form
        className="settings-dialog appearance-dialog"
        data-wheel-scroll="true"
        onSubmit={(event) => {
          event.preventDefault();
          savePreferences(settings);
          onClose();
        }}
      >
        <header className="settings-dialog-header">
          <div className="settings-dialog-icon">
            <Palette size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="settings-eyebrow">NodexMesh</p>
            <h2>{translate('Appearance')}</h2>
            <p className="settings-description">{translate('Make your workspace feel like yours.')}</p>
          </div>
          <button type="button" className="settings-close" onClick={onClose} aria-label={translate('Close')}>
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="settings-dialog-body">
          <div
            role="tablist"
            aria-label={translate('Appearance sections')}
            className="settings-tabs"
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === 'Home' ? 'ui' : event.key === 'End' ? 'canvas' : tab === 'ui' ? 'canvas' : 'ui';
              setTab(next);
              event.currentTarget.querySelector<HTMLButtonElement>(`#appearance-tab-${next}`)?.focus();
            }}
          >
            <button
              type="button"
              role="tab"
              id="appearance-tab-ui"
              aria-controls="appearance-panel-ui"
              tabIndex={tab === 'ui' ? 0 : -1}
              aria-selected={tab === 'ui'}
              className="settings-tab"
              onClick={() => setTab('ui')}
            >
              <PanelsTopLeft size={16} aria-hidden="true" />
              {translate('UI - all projects')}
            </button>
            <button
              type="button"
              role="tab"
              id="appearance-tab-canvas"
              aria-controls="appearance-panel-canvas"
              tabIndex={tab === 'canvas' ? 0 : -1}
              aria-selected={tab === 'canvas'}
              className="settings-tab"
              onClick={() => setTab('canvas')}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              {translate('Canvas - defaults & projects')}
            </button>
          </div>
          {tab === 'ui' ? (
            <section
              id="appearance-panel-ui"
              aria-labelledby="appearance-tab-ui"
              role="tabpanel"
              className="appearance-section space-y-4"
            >
              <p className="text-sm opacity-75">
                {translate(
                  'Your app bar and tool sidebar keep the same appearance across all projects, in both light and dark modes.',
                )}
              </p>
              <label className="appearance-color-setting">
                {translate('UI primary color')}
                <input
                  aria-label={translate('UI primary color')}
                  type="color"
                  value={settings.uiPrimary}
                  onChange={(event) => setSettings({ ...settings, uiPrimary: event.target.value })}
                />
              </label>
              <label className="appearance-color-setting">
                {translate('UI secondary color')}
                <input
                  aria-label={translate('UI secondary color')}
                  type="color"
                  value={settings.uiSecondary}
                  onChange={(event) => setSettings({ ...settings, uiSecondary: event.target.value })}
                />
              </label>
              <label className="block">
                {translate('Sidebar width')}
                <input
                  type="range"
                  aria-label={translate('Sidebar width')}
                  min={MIN_SIDEBAR_WIDTH}
                  max={MAX_SIDEBAR_WIDTH}
                  value={normalizeSidebarWidth(settings.sidebarWidth)}
                  onChange={(event) => setSettings({ ...settings, sidebarWidth: Number(event.target.value) })}
                  className="w-full"
                />
                <span>{normalizeSidebarWidth(settings.sidebarWidth)} px</span>
                <button
                  type="button"
                  className="planning-button"
                  onClick={() => setSettings({ ...settings, sidebarWidth: DEFAULT_SIDEBAR_WIDTH })}
                >
                  {translate('Reset sidebar width')}
                </button>
              </label>
              <FontPicker
                label={translate('Interface font')}
                value={settings.uiFont}
                onChange={(font) => setSettings({ ...settings, uiFont: font })}
              />
            </section>
          ) : (
            <section
              id="appearance-panel-canvas"
              aria-labelledby="appearance-tab-canvas"
              role="tabpanel"
              className="appearance-section space-y-4"
            >
              <p className="text-sm opacity-75">
                {translate(
                  'Defaults apply to new projects and projects without custom settings. Choose a project to override its canvas, cards and dialogs for your account.',
                )}
              </p>
              <label className="block">
                {translate('Canvas settings for')}
                <select
                  className="planning-input w-full"
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                >
                  <option value="">{translate('Defaults - new and uncustomized projects')}</option>
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
                    {translate('Use custom project theme')}
                  </label>
                  <p className="text-sm opacity-75" role="status">
                    {customEnabled
                      ? translate('Custom settings are enabled for this project.')
                      : translate('Using general defaults. Enable the checkbox to edit this project’s theme.')}
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
                      {value === 'light' ? translate('Light palette') : translate('Dark palette')}
                    </button>
                  ))}
                </div>
                <PaletteEditor
                  palette={draft[mode]}
                  mode={mode}
                  onChange={(palette) => updateDraft({ ...draft, [mode]: palette })}
                />
                <label className="block">
                  {translate('Preferred mode')}
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
                    <option value="">{translate('Use general mode')}</option>
                    <option value="light">{translate('Light')}</option>
                    <option value="dark">{translate('Dark')}</option>
                  </select>
                </label>
                <FontPicker
                  label={translate('Default font for board items')}
                  value={draft.font}
                  onChange={(font) => updateDraft({ ...draft, font })}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className="planning-button"
                    type="button"
                    onClick={() => updateDraft(structuredClone(defaultAppearance))}
                  >
                    {translate('Reset palette')}
                  </button>
                </div>
              </fieldset>
            </section>
          )}
        </div>
        <footer className="settings-dialog-footer">
          <button className="settings-secondary" type="button" onClick={onClose}>
            {translate('Cancel')}
          </button>
          <button className="settings-primary">{translate('Save appearance')}</button>
        </footer>
      </form>
    </Modal>
  );
}
