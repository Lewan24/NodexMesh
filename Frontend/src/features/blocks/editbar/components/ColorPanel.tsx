import { Palette, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/app/providers/ThemeProvider';
import type { BoardItem } from '@/entities/board/types';
import { paletteBackground, paletteKeys } from '@/features/appearance/appearanceModel';
import { translate } from '@/shared/i18n';

import { isDefaultCardColor, resolvePaletteColor } from '../../shared/cardAppearance';
import { BACKGROUND_ITEM_TYPES, FRAME_COLORS, STRIP_COLORS } from '../constants';
import ColorSwatch from './ColorSwatch';
import CustomColorInput from './CustomColorInput';

interface ColorPanelProps {
  item: BoardItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

type FillMode = 'solid' | 'linear' | 'radial';
type StripGradient = { kind: Exclude<FillMode, 'solid'>; from: string; to: string; angle: number };

const DEFAULT_STRIP_GRADIENT: StripGradient = { kind: 'linear', from: '#7C3AED', to: '#FFBD65', angle: 90 };

function getBackgroundColor(item: BoardItem): string | undefined {
  switch (item.type) {
    case 'board':
    case 'section-title':
    case 'dispenser':
    case 'code':
    case 'document':
    case 'embed':
    case 'timeline':
    case 'database':
    case 'mindmap':
    case 'diagram':
    case 'note':
    case 'checklist':
    case 'link':
    case 'image':
    case 'kanban':
    case 'column':
    case 'text':
      return item.color;
    default:
      return undefined;
  }
}

function updateBackgroundColor(item: BoardItem, color: string | undefined): BoardItem {
  switch (item.type) {
    case 'text':
      return { ...item, color };
    case 'board':
    case 'section-title':
    case 'dispenser':
    case 'code':
    case 'document':
    case 'embed':
    case 'timeline':
    case 'database':
    case 'mindmap':
    case 'diagram':
    case 'note':
    case 'checklist':
    case 'link':
    case 'image':
    case 'kanban':
    case 'column':
      return color ? { ...item, color } : item;
    default:
      return item;
  }
}

function stripGradientCss(gradient: StripGradient): string {
  return gradient.kind === 'radial'
    ? `radial-gradient(circle at center, ${gradient.from}, ${gradient.to})`
    : `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`;
}

function parseStripGradient(value?: string): StripGradient {
  if (!value) return DEFAULT_STRIP_GRADIENT;

  const linear = value.match(
    /^linear-gradient\(\s*(?:(\d+(?:\.\d+)?)deg|to right)\s*,\s*(#[\da-fA-F]{6})\s*,\s*(#[\da-fA-F]{6})\s*\)$/,
  );
  if (linear) {
    return { kind: 'linear', angle: linear[1] ? Number(linear[1]) : 90, from: linear[2]!, to: linear[3]! };
  }

  const radial = value.match(
    /^radial-gradient\(\s*circle at center\s*,\s*(#[\da-fA-F]{6})\s*,\s*(#[\da-fA-F]{6})\s*\)$/,
  );
  if (radial) return { kind: 'radial', angle: 90, from: radial[1]!, to: radial[2]! };

  return { ...DEFAULT_STRIP_GRADIENT, from: /^#[\da-fA-F]{6}$/.test(value) ? value : DEFAULT_STRIP_GRADIENT.from };
}

function ModePicker({
  value,
  onChange,
  label,
}: {
  value: FillMode;
  onChange: (mode: FillMode) => void;
  label: string;
}) {
  const modes: { mode: FillMode; title: string; preview: string }[] = [
    { mode: 'solid', title: translate('Solid'), preview: '#7C3AED' },
    { mode: 'linear', title: translate('Linear gradient'), preview: 'linear-gradient(135deg, #7C3AED, #FFBD65)' },
    {
      mode: 'radial',
      title: translate('Radial gradient'),
      preview: 'radial-gradient(circle at 35% 35%, #FFBD65, #7C3AED)',
    },
  ];

  return (
    <div
      className="flex items-center gap-1 rounded-xl p-1"
      style={{ background: 'color-mix(in srgb, var(--color-border) 28%, transparent)' }}
      aria-label={label}
    >
      {modes.map(({ mode, title, preview }) => (
        <button
          key={mode}
          type="button"
          aria-label={title}
          aria-pressed={value === mode}
          title={title}
          onClick={() => onChange(mode)}
          className="flex h-7 w-8 items-center justify-center rounded-lg transition-all hover:-translate-y-px"
          style={{
            background: value === mode ? 'var(--edit-bar-card)' : 'transparent',
            boxShadow: value === mode ? '0 2px 8px rgba(30, 20, 50, 0.14)' : 'none',
          }}
        >
          <span className="h-4 w-4 rounded-[5px] border border-white/60" style={{ background: preview }} />
        </button>
      ))}
    </div>
  );
}

function GradientStops({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (key: 'from' | 'to', color: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border px-2 py-1.5"
      style={{ borderColor: 'var(--color-border-soft)' }}
    >
      {(['from', 'to'] as const).map((key) => (
        <label key={key} className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-lg shadow-sm">
          <span className="absolute inset-0" style={{ background: key === 'from' ? from : to }} />
          <input
            type="color"
            value={key === 'from' ? from : to}
            aria-label={translate('Gradient') + ' ' + key}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => onChange(key, event.target.value.toUpperCase())}
          />
        </label>
      ))}
      <span className="h-px w-5" style={{ background: `linear-gradient(to right, ${from}, ${to})` }} />
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
        {translate('Stops')}
      </span>
    </div>
  );
}

function PanelTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ color: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
      >
        {icon}
      </span>
      <span
        className="text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {children}
      </span>
    </div>
  );
}

export default function ColorPanel({ item, onUpdate }: ColorPanelProps) {
  useTranslation();
  const { appearance, theme } = useTheme();
  const palette = appearance[theme];
  const backgroundColor = getBackgroundColor(item) ?? (item.type === 'text' ? undefined : '#ffffff');
  const showBackground = BACKGROUND_ITEM_TYPES.has(item.type);
  const canClearBackground = item.type === 'text';
  const backgroundMode: FillMode = item.gradient?.kind ?? 'solid';
  const stripMode: FillMode = item.topColor?.startsWith('linear-gradient')
    ? 'linear'
    : item.topColor?.startsWith('radial-gradient')
      ? 'radial'
      : 'solid';
  const stripGradient = parseStripGradient(item.topColor);

  const setBackgroundColor = (color: string | undefined) => {
    onUpdate((current) => ({ ...updateBackgroundColor(current, color), colorRole: undefined, gradient: undefined }));
  };

  const setBackgroundMode = (mode: FillMode) => {
    onUpdate((current) => ({
      ...current,
      gradient:
        mode === 'solid'
          ? undefined
          : {
              from:
                current.gradient?.from ??
                current.colorRole ??
                (isDefaultCardColor(current.color) ? 'default' : current.color!),
              to: current.gradient?.to ?? 'accent1',
              angle: current.gradient?.angle ?? 135,
              kind: mode,
            },
    }));
  };

  const setStripColor = (color: string | undefined) => {
    onUpdate((current) => ({ ...current, topColor: color }));
  };

  const setStripMode = (mode: FillMode) => {
    if (mode === 'solid') {
      setStripColor(stripGradient.from);
      return;
    }
    setStripColor(stripGradientCss({ ...stripGradient, kind: mode }));
  };

  const updateStripGradient = (change: Partial<StripGradient>) => {
    setStripColor(
      stripGradientCss({ ...stripGradient, ...change, kind: stripMode === 'radial' ? 'radial' : 'linear' }),
    );
  };

  if (item.type === 'section-title') {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border px-3 py-2"
        style={{ borderColor: 'var(--color-border-soft)' }}
      >
        <PanelTitle icon={<Palette size={15} />}>{translate('Label color')}</PanelTitle>
        <div className="flex items-center gap-1.5">
          {FRAME_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              active={item.color === color}
              size={16}
              onClick={() => setBackgroundColor(color)}
            />
          ))}
        </div>
        <CustomColorInput
          value={item.colorRole ? palette[item.colorRole] : (item.color ?? '#7C3AED')}
          onChange={setBackgroundColor}
          title={translate('Section label color')}
        />
      </div>
    );
  }

  return (
    <div className="edit-bar-color-panel flex items-stretch gap-2 p-0.5">
      {showBackground && (
        <section
          className="edit-bar-color-card flex min-w-[300px] flex-col gap-2 rounded-2xl border p-2.5"
          style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <PanelTitle icon={<Palette size={15} />}>{translate('Card fill')}</PanelTitle>
            <ModePicker value={backgroundMode} onChange={setBackgroundMode} label={translate('Card fill')} />
          </div>

          <div className="flex items-center gap-1.5">
            {canClearBackground && (
              <button
                type="button"
                onClick={() => setBackgroundColor(undefined)}
                title={translate('No background')}
                className="relative h-5 w-5 overflow-hidden rounded-full border"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-rose-400" />
              </button>
            )}
            {paletteKeys.map((role) => (
              <ColorSwatch
                key={role}
                color={paletteBackground(palette, role)}
                active={item.colorRole === role}
                size={17}
                onClick={() => onUpdate((current) => ({ ...current, colorRole: role, gradient: undefined }))}
              />
            ))}
            <div className="ml-auto">
              <CustomColorInput
                value={item.colorRole ? palette[item.colorRole] : backgroundColor}
                onChange={setBackgroundColor}
                title={translate('Custom fixed background')}
              />
            </div>
          </div>

          {item.gradient && (
            <div className="flex items-center gap-2">
              <GradientStops
                from={resolvePaletteColor(item.gradient.from, palette)}
                to={resolvePaletteColor(item.gradient.to, palette)}
                onChange={(key, color) =>
                  onUpdate((current) => ({
                    ...current,
                    gradient: current.gradient ? { ...current.gradient, [key]: color } : current.gradient,
                  }))
                }
              />
              {item.gradient.kind === 'linear' && (
                <label className="flex min-w-0 flex-1 items-center gap-2" title={translate('Gradient angle')}>
                  <input
                    aria-label={translate('Gradient angle')}
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    className="min-w-16 flex-1 accent-violet-600"
                    value={item.gradient.angle}
                    onChange={(event) => {
                      const angle = Number(event.target.value);
                      onUpdate((current) => ({
                        ...current,
                        gradient: current.gradient ? { ...current.gradient, angle } : current.gradient,
                      }));
                    }}
                  />
                  <span
                    className="w-8 text-right text-[10px] tabular-nums"
                    style={{ color: 'var(--color-text-faint)' }}
                  >
                    {item.gradient.angle}°
                  </span>
                </label>
              )}
            </div>
          )}
        </section>
      )}

      <section
        className="edit-bar-color-card flex min-w-[300px] flex-col gap-2 rounded-2xl border p-2.5"
        style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <PanelTitle icon={<Sparkles size={15} />}>{translate('Top accent strip')}</PanelTitle>
          <div className="flex items-center gap-1">
            <ModePicker value={stripMode} onChange={setStripMode} label={translate('Top accent strip')} />
            {item.topColor && (
              <button
                type="button"
                onClick={() => setStripColor(undefined)}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-rose-500/10"
                style={{ color: 'var(--color-text-faint)' }}
                title={translate('Remove strip')}
                aria-label={translate('Remove strip')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {STRIP_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              size={17}
              active={item.topColor === color}
              onClick={() => setStripColor(item.topColor === color ? undefined : color)}
            />
          ))}
          {stripMode === 'solid' && (
            <div className="ml-auto">
              <CustomColorInput
                value={item.topColor?.startsWith('#') ? item.topColor : stripGradient.from}
                onChange={setStripColor}
                title={translate('Custom accent color')}
              />
            </div>
          )}
        </div>

        {stripMode !== 'solid' && (
          <div className="flex items-center gap-2">
            <GradientStops
              from={stripGradient.from}
              to={stripGradient.to}
              onChange={(key, color) => updateStripGradient({ [key]: color })}
            />
            {stripMode === 'linear' && (
              <label className="flex min-w-0 flex-1 items-center gap-2" title={translate('Gradient angle')}>
                <input
                  aria-label={translate('Gradient angle')}
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  className="min-w-16 flex-1 accent-violet-600"
                  value={stripGradient.angle}
                  onChange={(event) => updateStripGradient({ angle: Number(event.target.value) })}
                />
                <span className="w-8 text-right text-[10px] tabular-nums" style={{ color: 'var(--color-text-faint)' }}>
                  {stripGradient.angle}°
                </span>
              </label>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
