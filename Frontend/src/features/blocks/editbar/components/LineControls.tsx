import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import type { BoardItem, LineItem } from '@/entities/board/types';
import ColorSwatch from './ColorSwatch';
import EditBarButton, { EditBarDivider } from './EditBarButton';
import { LINE_COLORS } from '../constants';
import CustomColorInput from './CustomColorInput';
import { snapToGrid } from '@/features/canvas/utils/gridSnap';

interface LineControlsProps {
  item: LineItem;
  section?: 'stroke' | 'label';
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

export default function LineControls({ item, onUpdate, section = 'stroke' }: LineControlsProps) {
  useTranslation();
  const update = (patch: Partial<LineItem>) => {
    onUpdate((current) => (current.type === 'line' ? { ...current, ...patch } : current));
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {section === 'stroke' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <EditBarButton
              active={!!item.divider}
              title={translate('Divider: snap to grid, no connections')}
              onClick={() =>
                update(
                  item.divider
                    ? { divider: false }
                    : {
                        divider: true,
                        arrowStart: false,
                        arrowEnd: false,
                        startItemId: undefined,
                        startSide: undefined,
                        startOffset: undefined,
                        endItemId: undefined,
                        endSide: undefined,
                        endOffset: undefined,
                        x: snapToGrid(item.x),
                        y: snapToGrid(item.y),
                        x2: snapToGrid(item.x2),
                        y2: snapToGrid(item.y2),
                      },
                )
              }
            >
              {translate('Divider')}
            </EditBarButton>
            <EditBarButton
              active={!!item.staticAnchors}
              disabled={!!item.divider}
              title={translate('Keep endpoints at the chosen positions on item edges')}
              onClick={() =>
                update({
                  staticAnchors: !item.staticAnchors,
                  startOffset: item.startOffset ?? 0.5,
                  endOffset: item.endOffset ?? 0.5,
                })
              }
            >
              {translate('Static endpoints')}
            </EditBarButton>
            <div className="flex flex-wrap items-center gap-1 px-1">
              {LINE_COLORS.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  active={item.color === color}
                  onClick={() => update({ color })}
                />
              ))}

              <CustomColorInput
                value={item.color}
                onChange={(color) => update({ color })}
                title={translate('Custom line color')}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs whitespace-nowrap">
              {translate('Curve')}
              <input
                aria-label={translate('Line curvature')}
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={item.curve ?? 0}
                onChange={(event) => update({ curve: Number(event.target.value) })}
                className="w-24"
              />
            </label>
            <EditBarButton title={translate('Straight line')} onClick={() => update({ curve: 0 })}>
              {translate('Straight')}
            </EditBarButton>
            {!(item.arrowStart && item.arrowEnd) && (
              <select
                aria-label={translate('Line cap')}
                className="h-8 text-xs bg-transparent"
                value={item.lineCap ?? 'round'}
                onChange={(event) => update({ lineCap: event.target.value as LineItem['lineCap'] })}
              >
                <option value="round">{translate('Round ends')}</option>
                <option value="butt">{translate('Flat ends')}</option>
                <option value="square">{translate('Square ends')}</option>
              </select>
            )}
            <EditBarDivider />

            <label className="flex items-center gap-2 text-xs">
              {translate('Thickness')}
              <select
                aria-label={translate('Line thickness')}
                value={item.strokeWidth}
                onChange={(event) => update({ strokeWidth: Number(event.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6].map((width) => (
                  <option key={width} value={width}>
                    {width} px
                  </option>
                ))}
              </select>
            </label>

            <EditBarDivider />

            <EditBarButton
              active={!!item.arrowStart}
              disabled={!!item.divider}
              onClick={() => {
                if (!item.divider) update({ arrowStart: !item.arrowStart });
              }}
              title={translate('Arrow at start')}
            >
              ← {translate('Start')}
            </EditBarButton>

            <EditBarButton
              active={!!item.arrowEnd}
              disabled={!!item.divider}
              onClick={() => {
                if (!item.divider) update({ arrowEnd: !item.arrowEnd });
              }}
              title={translate('Arrow at end')}
            >
              {translate('End')} →
            </EditBarButton>
          </div>
        </>
      )}
      {section === 'label' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5" onMouseDown={(event) => event.stopPropagation()}>
            <input
              type="text"
              value={item.label ?? ''}
              onChange={(event) => update({ label: event.target.value })}
              placeholder={translate('Label...')}
              className="h-8 w-32 px-2 rounded-lg border bg-transparent outline-none text-xs"
              style={{
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
              title={translate('Line label')}
            />

            <EditBarButton
              active={(item.labelMode ?? 'horizontal') === 'horizontal'}
              onClick={() => update({ labelMode: 'horizontal' })}
              title={translate('Keep label horizontal')}
            >
              Aa
            </EditBarButton>

            <EditBarButton
              active={item.labelMode === 'follow-line'}
              onClick={() => update({ labelMode: 'follow-line' })}
              title={translate('Rotate label with line')}
            >
              ↗Aa
            </EditBarButton>
          </div>

          <div className="flex items-center gap-1.5 px-1" title={translate('Label distance from line')}>
            <input
              type="range"
              aria-label={translate('Label distance from line')}
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
        </div>
      )}
    </div>
  );
}
