import type {
  BoardItem,
  FontFamily,
  TextAlign,
} from '@/entities/board/types';

import {
  FONT_FAMILIES,
  FONT_SIZE_PRESETS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  updateTypography,
} from '@/features/blocks/typography/typographyUtils';

import EditBarButton, {
  EditBarDivider,
} from './EditBarButton';

interface TypographyControlsProps {
  item: BoardItem;
  onUpdate: (
    updater: (item: BoardItem) => BoardItem,
  ) => void;
}

const ALIGNMENTS: TextAlign[] = [
  'left',
  'center',
  'right',
];

export default function TypographyControls({
  item,
  onUpdate,
}: TypographyControlsProps) {
  const typography = item.typography;

  const currentSize =
    typography?.fontSize ??
    getDefaultFontSize(item);

  const update = (
    patch: Partial<
      NonNullable<BoardItem['typography']>
    >,
  ) => {
    onUpdate(current =>
      updateTypography(current, patch),
    );
  };

  const handleSizeChange = (
    value: number,
  ) => {
    if (!Number.isFinite(value)) return;

    const next = Math.max(
      MIN_FONT_SIZE,
      Math.min(MAX_FONT_SIZE, value),
    );

    update({
      fontSize: next,
    });
  };

  return (
    <>
      <EditBarDivider />

      {/* Font family */}

      <select
        value={
          typography?.fontFamily ??
          'sans'
        }
        onChange={event =>
          update({
            fontFamily:
              event.target.value as FontFamily,
          })
        }
        onMouseDown={event =>
          event.stopPropagation()
        }
        className="h-8 px-2 rounded-lg text-xs outline-none border flex-shrink-0"
        style={{
          minWidth: 92,
          color: 'var(--color-text-primary)',
          backgroundColor:
            'var(--color-surface)',
          borderColor:
            'var(--color-border)',
        }}
        title="Font family"
      >
        {FONT_FAMILIES.map(font => (
          <option
            key={font.value}
            value={font.value}
            style={{
              fontFamily: font.css,
            }}
          >
            {font.label}
          </option>
        ))}
      </select>

      <EditBarDivider />

      {/* Presets */}

      {FONT_SIZE_PRESETS.map(size => (
        <EditBarButton
          key={size}
          active={currentSize === size}
          onClick={() =>
            handleSizeChange(size)
          }
          title={`${size}px`}
        >
          <span className="text-[10px] font-semibold">
            {size}
          </span>
        </EditBarButton>
      ))}

      {/* Custom pixels */}

      <div
        className="h-8 flex items-center rounded-lg border overflow-hidden flex-shrink-0"
        style={{
          backgroundColor:
            'var(--color-surface)',
          borderColor:
            'var(--color-border)',
        }}
        onMouseDown={event =>
          event.stopPropagation()
        }
      >
        <input
          type="number"
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          value={currentSize}
          onChange={event =>
            handleSizeChange(
              Number(event.target.value),
            )
          }
          className="w-11 h-full px-1.5 text-xs text-right bg-transparent outline-none"
          style={{
            color:
              'var(--color-text-primary)',
          }}
          title="Custom font size"
        />

        <span
          className="text-[9px] pr-2 select-none"
          style={{
            color:
              'var(--color-text-faint)',
          }}
        >
          px
        </span>
      </div>

      <EditBarDivider />

      {/* Bold */}

      <EditBarButton
        active={!!typography?.bold}
        onClick={() =>
          update({
            bold: !typography?.bold,
          })
        }
        title="Bold"
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          B
        </span>
      </EditBarButton>

      {/* Italic */}

      <EditBarButton
        active={!!typography?.italic}
        onClick={() =>
          update({
            italic:
              !typography?.italic,
          })
        }
        title="Italic"
      >
        <span
          style={{
            fontStyle: 'italic',
            fontFamily:
              'Georgia, serif',
            fontSize: 13,
          }}
        >
          I
        </span>
      </EditBarButton>

      <EditBarDivider />

      {/* Alignment */}

      {ALIGNMENTS.map(alignment => (
        <EditBarButton
          key={alignment}
          active={
            (
              typography?.textAlign ??
              'left'
            ) === alignment
          }
          onClick={() =>
            update({
              textAlign: alignment,
            })
          }
          title={`Align ${alignment}`}
        >
          {alignment === 'left' && (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="M3 6h18M3 12h12M3 18h15"
                strokeLinecap="round"
              />
            </svg>
          )}

          {alignment === 'center' && (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="M3 6h18M6 12h12M4 18h16"
                strokeLinecap="round"
              />
            </svg>
          )}

          {alignment === 'right' && (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="M3 6h18M9 12h12M6 18h15"
                strokeLinecap="round"
              />
            </svg>
          )}
        </EditBarButton>
      ))}
    </>
  );
}

function getDefaultFontSize(
  item: BoardItem,
): number {
  switch (item.type) {
    case 'text':
      switch (item.size) {
        case 'sm':
          return 14;
        case 'md':
          return 16;
        case 'lg':
          return 24;
        case 'xl':
          return 36;
      }

    case 'note':
      switch (item.fontSize) {
        case 'sm':
          return 12;
        case 'lg':
          return 18;
        default:
          return 14;
      }

    case 'frame':
      return 14;

    case 'column':
      return 16;

    case 'kanban':
      return 14;

    case 'link':
      return 14;

    case 'checklist':
      return 14;

    case 'image':
      return 13;

    default:
      return 14;
  }
}