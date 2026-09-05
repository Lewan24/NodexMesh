import type { BoardItem, FrameItem } from '@/entities/board/types';

import ColorSwatch from './ColorSwatch';
import { EditBarDivider } from './EditBarButton';
import { FRAME_COLORS } from '../constants';
import CustomColorInput from './CustomColorInput';

interface FrameControlsProps {
  item: FrameItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

export default function FrameControls({ item, onUpdate }: FrameControlsProps) {
  const opacity = item.opacity ?? 0.2;

  const update = (patch: Partial<FrameItem>) => {
    onUpdate(current => current.type === 'frame' ? { ...current, ...patch } : current);
  };

  return (
    <>
      <div className="flex items-center gap-1 px-1">
        {FRAME_COLORS.map(color => (
          <ColorSwatch
            key={color}
            color={color}
            active={item.color === color}
            onClick={() => update({ color })}
          />
        ))}

        <CustomColorInput
          value={item.color}
          onChange={color => update({ color })}
          title="Custom frame color"
        />
      </div>

      <EditBarDivider />

      <div className="flex items-center gap-2 px-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0"
          style={{ color: 'var(--color-text-faint)' }}
        >
          Opacity
        </span>

        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={opacity}
          onChange={event => update({ opacity: Number(event.target.value) })}
          className="w-24 cursor-pointer"
          title={`Opacity ${Math.round(opacity * 100)}%`}
        />

        <span
          className="w-9 text-[10px] font-mono text-right flex-shrink-0"
          style={{ color: 'var(--color-text-faint)' }}
        >
          {Math.round(opacity * 100)}%
        </span>
      </div>
    </>
  );
}