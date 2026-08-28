import type { BoardItem } from '@/entities/board/types';
import ColorSwatch from './ColorSwatch';
import { EditBarDivider } from './EditBarButton';
import {
  BACKGROUND_ITEM_TYPES,
  DARK_BACKGROUNDS,
  LIGHT_BACKGROUNDS,
  STRIP_COLORS,
} from '../constants';

interface ColorPanelProps {
  item: BoardItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

function getBackgroundColor(item: BoardItem): string | undefined {
  switch (item.type) {
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
  const backgroundColor = getBackgroundColor(item);
  const stripColor = item.topColor;
  const showBackground = BACKGROUND_ITEM_TYPES.has(item.type);
  const canClearBackground = item.type === 'text';

  const setBackgroundColor = (color: string | undefined) => {
    onUpdate(current => updateBackgroundColor(current, color));
  };

  const setStripColor = (color: string | undefined) => {
    onUpdate(current => ({ ...current, topColor: color }));
  };

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
                  backgroundImage: 'linear-gradient(to top right, transparent 46%, #FF6B8A 48%, #FF6B8A 52%, transparent 54%)',
                }}
              />
            )}

            {LIGHT_BACKGROUNDS.map(color => (
              <ColorSwatch
                key={color}
                color={color}
                active={backgroundColor === color}
                onClick={() => setBackgroundColor(color)}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 px-0.5">
            {DARK_BACKGROUNDS.map(color => (
              <ColorSwatch
                key={color}
                color={color}
                active={backgroundColor === color}
                onClick={() => setBackgroundColor(color)}
              />
            ))}
          </div>

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

        {STRIP_COLORS.map(color => (
          <ColorSwatch
            key={color}
            color={color}
            size={11}
            active={stripColor === color}
            onClick={() => setStripColor(stripColor === color ? undefined : color)}
          />
        ))}

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