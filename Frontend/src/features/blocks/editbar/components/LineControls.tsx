import type { BoardItem, LineItem } from '@/entities/board/types';
import ColorSwatch from './ColorSwatch';
import EditBarButton, { EditBarDivider } from './EditBarButton';
import { LINE_COLORS } from '../constants';
import CustomColorInput from './CustomColorInput';
import { snapToGrid } from '@/features/canvas/utils/gridSnap';

interface LineControlsProps {
  item: LineItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

export default function LineControls({ item, onUpdate }: LineControlsProps) {
  const update = (patch: Partial<LineItem>) => {
    onUpdate((current) => (current.type === 'line' ? { ...current, ...patch } : current));
  };

  return (
    <>
      <EditBarButton
        active={!!item.divider}
        title="Divider: snap to grid, no connections"
        onClick={() =>
          update(
            item.divider
              ? { divider: false }
              : {
                  divider: true,
                  arrowStart: false,
                  arrowEnd: false,
                  startItemId: undefined,
                  endItemId: undefined,
                  x: snapToGrid(item.x),
                  y: snapToGrid(item.y),
                  x2: snapToGrid(item.x2),
                  y2: snapToGrid(item.y2),
                },
          )
        }
      >
        Divider
      </EditBarButton>
      <div className="flex items-center gap-1 px-1">
        {LINE_COLORS.map((color) => (
          <ColorSwatch key={color} color={color} active={item.color === color} onClick={() => update({ color })} />
        ))}

        <CustomColorInput value={item.color} onChange={(color) => update({ color })} title="Custom line color" />
      </div>

      <label className="flex items-center gap-2 text-xs whitespace-nowrap">
        Curve
        <input
          aria-label="Line curvature"
          type="range"
          min="-1"
          max="1"
          step="0.05"
          value={item.curve ?? 0}
          onChange={(event) => update({ curve: Number(event.target.value) })}
          className="w-24"
        />
      </label>
      <EditBarButton title="Straight line" onClick={() => update({ curve: 0 })}>
        Straight
      </EditBarButton>
      <select
        aria-label="Line cap"
        className="h-8 text-xs bg-transparent"
        value={item.lineCap ?? 'round'}
        onChange={(event) => update({ lineCap: event.target.value as LineItem['lineCap'] })}
      >
        <option value="round">Round ends</option>
        <option value="butt">Flat ends</option>
        <option value="square">Square ends</option>
      </select>
      <EditBarDivider />

      {[1, 2, 3, 4, 5, 6].map((thickness) => (
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
        disabled={!!item.divider}
        onClick={() => {
          if (!item.divider) update({ arrowStart: !item.arrowStart });
        }}
        title="Arrow at start"
      >
        ← S
      </EditBarButton>

      <EditBarButton
        active={!!item.arrowEnd}
        disabled={!!item.divider}
        onClick={() => {
          if (!item.divider) update({ arrowEnd: !item.arrowEnd });
        }}
        title="Arrow at end"
      >
        E →
      </EditBarButton>

      <EditBarDivider />

      <div className="flex items-center gap-1.5" onMouseDown={(event) => event.stopPropagation()}>
        <input
          type="text"
          value={item.label ?? ''}
          onChange={(event) => update({ label: event.target.value })}
          placeholder="Label..."
          className="h-8 w-32 px-2 rounded-lg border bg-transparent outline-none text-xs"
          style={{
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
          title="Line label"
        />

        <EditBarButton
          active={(item.labelMode ?? 'horizontal') === 'horizontal'}
          onClick={() => update({ labelMode: 'horizontal' })}
          title="Keep label horizontal"
        >
          Aa
        </EditBarButton>

        <EditBarButton
          active={item.labelMode === 'follow-line'}
          onClick={() => update({ labelMode: 'follow-line' })}
          title="Rotate label with line"
        >
          ↗Aa
        </EditBarButton>
      </div>

      <div className="flex items-center gap-1.5 px-1" title="Label distance from line">
        <input
          type="range"
          min="0"
          max="40"
          step="1"
          value={item.labelOffset ?? 14}
          onChange={(event) => update({ labelOffset: Number(event.target.value) })}
          className="w-20"
        />

        <span className="text-[9px] w-6" style={{ color: 'var(--color-text-faint)' }}>
          {item.labelOffset ?? 14}
        </span>
      </div>

      <div
        className="h-8 flex items-center rounded-lg border overflow-hidden flex-shrink-0"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          type="number"
          min={8}
          max={48}
          value={item.typography?.fontSize ?? item.labelFontSize ?? 11}
          onChange={(event) => {
            const value = Number(event.target.value);

            if (!Number.isFinite(value)) return;

            update({
              typography: { ...item.typography, fontSize: Math.max(8, Math.min(48, value)) },
              labelFontSize: Math.max(8, Math.min(48, value)),
            });
          }}
          className="w-11 h-full px-1.5 text-xs text-right bg-transparent outline-none"
          style={{ color: 'var(--color-text-primary)' }}
          title="Label font size"
        />

        <span className="text-[9px] pr-2" style={{ color: 'var(--color-text-faint)' }}>
          px
        </span>
      </div>
    </>
  );
}
