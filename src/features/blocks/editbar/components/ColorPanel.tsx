import { useTheme } from '@/app/providers/ThemeProvider';
import { paletteBackground, paletteKeys } from '@/features/appearance/appearanceModel';
import { isDefaultCardColor, resolvePaletteColor } from '../../shared/cardAppearance';
import type { BoardItem } from '@/entities/board/types';
import ColorSwatch from './ColorSwatch';
import { EditBarDivider } from './EditBarButton';
import { BACKGROUND_ITEM_TYPES, STRIP_COLORS, FRAME_COLORS } from '../constants';
import CustomColorInput from './CustomColorInput';

interface ColorPanelProps {
  item: BoardItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

function getBackgroundColor(item: BoardItem): string | undefined {
  switch (item.type) {
    case 'section-title':
    case 'dispenser':
    case 'code':
    case 'document':
    case 'embed':
    case 'timeline':
    case 'database':
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

    case 'section-title':
    case 'dispenser':
    case 'code':
    case 'document':
    case 'embed':
    case 'timeline':
    case 'database':
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

export default function ColorPanel({ item, onUpdate }: ColorPanelProps) {
  const { appearance, theme } = useTheme();
  const palette = appearance[theme];
  const backgroundColor = getBackgroundColor(item) ?? (item.type === 'text' ? undefined : '#ffffff');
  const stripColor = item.topColor;
  const showBackground = BACKGROUND_ITEM_TYPES.has(item.type);
  const canClearBackground = item.type === 'text';

  const setBackgroundColor = (color: string | undefined) => {
    onUpdate((current) => ({ ...updateBackgroundColor(current, color), colorRole: undefined, gradient: undefined }));
  };

  const setStripColor = (color: string | undefined) => {
    onUpdate((current) => ({ ...current, topColor: color }));
  };

  if (item.type === 'section-title')
    return (
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs">Label color</span>
        {FRAME_COLORS.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            active={item.color === color}
            size={14}
            onClick={() => setBackgroundColor(color)}
          />
        ))}
        <CustomColorInput
          value={item.colorRole ? palette[item.colorRole] : (item.color ?? '#7C3AED')}
          onChange={setBackgroundColor}
          title="Section label color"
        />
      </div>
    );

  return (
    <>
      {showBackground && (
        <>
          <div className="flex items-center gap-1 px-1">
            {canClearBackground && (
              <button
                onClick={() => setBackgroundColor(undefined)}
                title="No background"
                className="rounded-full flex-shrink-0 transition-all hover:scale-125"
                style={{
                  width: !backgroundColor ? 15 : 12,
                  height: !backgroundColor ? 15 : 12,
                  border: `1.5px solid ${!backgroundColor ? '#7C3AED' : 'rgba(0,0,0,0.2)'}`,
                  boxShadow: !backgroundColor ? '0 0 0 2px rgba(124, 58, 237,0.4)' : 'none',
                  backgroundImage:
                    'linear-gradient(to top right, transparent 46%, #FF6B8A 48%, #FF6B8A 52%, transparent 54%)',
                }}
              />
            )}

            {paletteKeys.map((role, index) => (
              <button
                key={role}
                title={index === 0 ? 'Default' : 'Accent ' + index}
                aria-label={index === 0 ? 'Default card color' : 'Accent ' + index}
                onClick={() => onUpdate((current) => ({ ...current, colorRole: role, gradient: undefined }))}
                className="w-5 h-5 rounded-full border-2"
                style={{
                  background: paletteBackground(palette, role),
                  borderColor: item.colorRole === role ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              />
            ))}
          </div>
          <CustomColorInput
            value={item.colorRole ? palette[item.colorRole] : backgroundColor}
            onChange={setBackgroundColor}
            title="Custom fixed background"
          />
          <label className="flex items-center gap-1 text-xs">
            Fill
            <select
              aria-label="Card fill"
              className="h-8 bg-transparent"
              value={item.gradient ? item.gradient.kind : 'solid'}
              onChange={(event) =>
                onUpdate((current) => ({
                  ...current,
                  gradient:
                    event.target.value === 'solid'
                      ? undefined
                      : {
                          from: current.colorRole ?? (isDefaultCardColor(current.color) ? 'default' : current.color!),
                          to: 'accent1',
                          angle: 135,
                          ...current.gradient,
                          kind: event.target.value as 'linear' | 'radial',
                        },
                }))
              }
            >
              <option value="solid">Solid</option>
              <option value="linear">Linear gradient</option>
              <option value="radial">Radial gradient</option>
            </select>
          </label>
          {item.gradient && (
            <>
              {(['from', 'to'] as const).map((key) => (
                <div key={key} className="flex gap-1 items-center">
                  <select
                    aria-label={'Gradient ' + key}
                    className="h-8 bg-transparent text-xs"
                    value={paletteKeys.some((role) => role === item.gradient![key]) ? item.gradient![key] : 'custom'}
                    onChange={(event) => {
                      const value = event.target.value;
                      onUpdate((current) => ({
                        ...current,
                        gradient: {
                          ...item.gradient!,
                          [key]: value === 'custom' ? resolvePaletteColor(item.gradient![key], palette) : value,
                        },
                      }));
                    }}
                  >
                    {paletteKeys.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                  <input
                    type="color"
                    aria-label={'Custom gradient ' + key}
                    className="w-7 h-7"
                    value={resolvePaletteColor(item.gradient![key], palette)}
                    onChange={(event) => {
                      const value = event.target.value;
                      onUpdate((current) => ({ ...current, gradient: { ...item.gradient!, [key]: value } }));
                    }}
                  />
                </div>
              ))}
              {item.gradient.kind === 'linear' && (
                <label className="text-xs flex items-center gap-1">
                  Angle
                  <input
                    aria-label="Gradient angle"
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    className="w-20"
                    value={item.gradient.angle}
                    onChange={(event) => {
                      const angle = Number(event.target.value);
                      onUpdate((current) => ({ ...current, gradient: { ...item.gradient!, angle } }));
                    }}
                  />
                  {item.gradient.angle}°
                </label>
              )}
            </>
          )}
          <EditBarDivider />
        </>
      )}

      <div className="flex items-center gap-1 px-1" title="Top accent strip">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 mr-0.5"
          style={{ color: '#9ca3af' }}
        >
          <rect x="3" y="3" width="18" height="5" rx="1.5" fill="currentColor" />
        </svg>

        {STRIP_COLORS.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            size={11}
            active={stripColor === color}
            onClick={() => setStripColor(stripColor === color ? undefined : color)}
          />
        ))}

        <CustomColorInput value={stripColor} onChange={setStripColor} title="Custom accent color" />

        {stripColor && (
          <button
            onClick={() => setStripColor(undefined)}
            className="ml-0.5 text-xs rounded px-1 py-0.5 flex-shrink-0"
            style={{ color: '#9ca3af', backgroundColor: 'rgba(0,0,0,0.05)' }}
            title="Remove strip"
          >
            ✕
          </button>
        )}
      </div>
    </>
  );
}
