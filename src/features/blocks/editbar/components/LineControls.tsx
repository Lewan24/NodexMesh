import type { BoardItem, LineItem } from '@/entities/board/types';
import ColorSwatch from './ColorSwatch';
import EditBarButton, { EditBarDivider } from './EditBarButton';
import { LINE_COLORS } from '../constants';
import CustomColorInput from './CustomColorInput';

interface LineControlsProps {
  item: LineItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

export default function LineControls({ item, onUpdate }: LineControlsProps) {
  const update = (patch: Partial<LineItem>) => {
    onUpdate(current => current.type === 'line' ? { ...current, ...patch } : current);
  };

  return (
    <>
      <div className="flex items-center gap-1 px-1">
        {LINE_COLORS.map(color => (
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
          title="Custom line color"
        />
      </div>

      <EditBarDivider />

      {[1, 2, 3, 4, 5, 6].map(thickness => (
        <EditBarButton
          key={thickness}
          active={item.strokeWidth === thickness}
          onClick={() => update({ strokeWidth: thickness })}
          title={`Thickness ${thickness}`}
        >
          <div className="w-5 flex items-center justify-center">
            <div className="w-4 rounded-full" style={{ height: thickness, backgroundColor: 'currentColor' }} />
          </div>
        </EditBarButton>
      ))}

      <EditBarDivider />

      <EditBarButton
        active={!!item.arrowStart}
        onClick={() => update({ arrowStart: !item.arrowStart })}
        title="Arrow at start"
      >
        ← S
      </EditBarButton>

      <EditBarButton
        active={!!item.arrowEnd}
        onClick={() => update({ arrowEnd: !item.arrowEnd })}
        title="Arrow at end"
      >
        E →
      </EditBarButton>
    </>
  );
}