import type { BoardItem, FrameItem } from '@/entities/board/types';
import ColorSwatch from './ColorSwatch';
import { FRAME_COLORS } from '../constants';
import CustomColorInput from './CustomColorInput';

interface FrameControlsProps {
  item: FrameItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

export default function FrameControls({ item, onUpdate }: FrameControlsProps) {
  const update = (patch: Partial<FrameItem>) => {
    onUpdate(current => current.type === 'frame' ? { ...current, ...patch } : current);
  };

  return (
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
  );
}