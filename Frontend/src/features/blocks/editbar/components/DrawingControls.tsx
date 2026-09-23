import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { drawingStrokes, smoothDrawingItem } from '@/features/blocks/drawing/drawingUtils';
import ColorSwatch from './ColorSwatch';
import { LINE_COLORS } from '../constants';
import CustomColorInput from './CustomColorInput';
import type { BoardItem, DrawingItem } from '@/entities/board/types';

export default function DrawingControls({
  items,
  onUpdate,
}: {
  items: DrawingItem[];
  onUpdate: (id: string, updater: (item: BoardItem) => BoardItem) => void;
}) {
  useTranslation();
  const first = items[0];
  if (!first) return null;
  const mixedColor = items.some((item) => drawingStrokes(item).some((stroke) => stroke.color !== first.color));
  const mixedWidth = items.some((item) =>
    drawingStrokes(item).some((stroke) => stroke.strokeWidth !== first.strokeWidth),
  );
  const update = (patch: Partial<Pick<DrawingItem, 'color' | 'strokeWidth'>>) =>
    items.forEach((item) =>
      onUpdate(item.id, (current) =>
        current.type === 'drawing'
          ? { ...current, ...patch, strokes: current.strokes?.map((stroke) => ({ ...stroke, ...patch })) }
          : current,
      ),
    );
  return (
    <>
      <span className="text-xs whitespace-nowrap">
        {items.length > 1 ? translate('{{value1}} drawings', { value1: items.length }) : translate('Ink')}
      </span>
      <button
        className="px-2 py-1 rounded hover:bg-violet-500/10 text-xs whitespace-nowrap disabled:opacity-40"
        title={translate('Smooth mouse jitter and reduce points in selected drawings')}
        disabled={items.every((item) => item.locked)}
        onClick={() =>
          items
            .filter((item) => !item.locked)
            .forEach((item) =>
              onUpdate(item.id, (current) => (current.type === 'drawing' ? smoothDrawingItem(current) : current)),
            )
        }
      >
        {translate('SmoothIt')}
      </button>
      {LINE_COLORS.map((color) => (
        <ColorSwatch
          key={color}
          color={color}
          active={!mixedColor && first.color === color}
          onClick={() => update({ color })}
        />
      ))}
      <CustomColorInput
        title={translate('Drawing color')}
        value={first.color}
        onChange={(color) => update({ color })}
      />
      {mixedColor && <span className="text-xs">{translate('Mixed colors')}</span>}
      <label className="flex items-center gap-2 text-xs">
        {translate('Width')}{' '}
        <input
          aria-label={translate('Drawing stroke width')}
          type="range"
          min="1"
          max="12"
          value={first.strokeWidth}
          onChange={(event) => update({ strokeWidth: Number(event.target.value) })}
        />
        {mixedWidth ? translate('Mixed') : first.strokeWidth}
      </label>
    </>
  );
}
