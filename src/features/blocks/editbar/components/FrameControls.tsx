import type { BoardItem, FrameItem } from '@/entities/board/types';
import ColorSwatch from './ColorSwatch';
import { EditBarDivider } from './EditBarButton';
import { FRAME_COLORS } from '../constants';

interface FrameControlsProps {
  item: FrameItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onFitFrame: () => void;
}

export default function FrameControls({ item, onUpdate, onFitFrame }: FrameControlsProps) {
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
      </div>

      <EditBarDivider />

      <button
        onClick={onFitFrame}
        className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        style={{ color: '#4a6070' }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Fit frame to contents"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
        Fit
      </button>
    </>
  );
}