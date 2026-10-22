import { useId } from 'react';
import { itemBorderRule } from '../../border/itemBorder';
import { Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BoardItem, ItemBorder } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import './borderPanel.css';

const initial: ItemBorder = { color: '#903df5', width: 2, style: 'solid', animation: 'none' };
export default function BorderPanel({
  items,
  onUpdate,
}: {
  items: BoardItem[];
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}) {
  useTranslation();
  const previewScope = useId().replace(/[^\w-]/g, '_');
  const border = items[0]?.border ?? initial;
  const mixed = items.some((item) => JSON.stringify(item.border) !== JSON.stringify(items[0]?.border));
  const patch = (value: Partial<ItemBorder>) =>
    onUpdate((item) => ({ ...item, border: { ...(item.border ?? initial), ...value } }));
  const enabled = items.some((item) => item.border && item.border.width > 0);
  return (
    <section className="border-panel" aria-label={translate('Item border')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span data-item-css-scope={previewScope} style={{ display: 'contents' }}>
            <style>{itemBorderRule({ ...border, width: Math.min(border.width, 3) }, previewScope)}</style>
            <span className="border-panel-icon" aria-label={translate('Border preview')}>
              <Square size={12} />
            </span>
          </span>
          <h3>{translate('Border')}</h3>
          {mixed && <span className="text-[10px] opacity-60">{translate('Mixed')}</span>}
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            aria-label={translate('Gradient border')}
            checked={!!border.gradient}
            onChange={(event) =>
              patch({
                style: 'solid',
                gradient: event.target.checked ? { from: border.color, to: '#ffbd65', angle: 90 } : undefined,
              })
            }
          />
          {translate('Gradient')}
        </label>
        <button
          type="button"
          className="border-panel-clear"
          aria-label={translate('Remove border')}
          disabled={!enabled}
          onClick={() => onUpdate((item) => ({ ...item, border: undefined }))}
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <label>
          {translate('Color')}
          <input type="color" value={border.color} onChange={(event) => patch({ color: event.target.value })} />
        </label>
        <label>
          {translate('Width')}
          <input
            type="number"
            min="0"
            max="20"
            step="1"
            value={border.width}
            onChange={(event) => {
              const width = event.target.valueAsNumber;
              if (Number.isFinite(width)) patch({ width: Math.min(20, Math.max(0, width)) });
            }}
          />
        </label>
        <label>
          {translate('Style')}
          <select
            value={border.style}
            onChange={(event) => patch({ style: event.target.value as ItemBorder['style'], gradient: undefined })}
          >
            {(['solid', 'dashed', 'dotted', 'double'] as const).map((style) => (
              <option key={style} value={style}>
                {translate({ solid: 'Solid', dashed: 'Dashed', dotted: 'Dotted', double: 'Double' }[style])}
              </option>
            ))}
          </select>
        </label>
        <label>
          {translate('Animation')}
          <select
            value={border.animation ?? 'none'}
            onChange={(event) => patch({ animation: event.target.value as ItemBorder['animation'] })}
          >
            <option value="none">{translate('None')}</option>
            <option value="pulse">{translate('Pulse')}</option>
          </select>
        </label>
      </div>
      {border.gradient && (
        <div className="grid grid-cols-3 gap-2">
          <label>
            {translate('From')}
            <input
              type="color"
              value={border.gradient.from}
              onChange={(event) => patch({ gradient: { ...border.gradient!, from: event.target.value } })}
            />
          </label>
          <label>
            {translate('To')}
            <input
              type="color"
              value={border.gradient.to}
              onChange={(event) => patch({ gradient: { ...border.gradient!, to: event.target.value } })}
            />
          </label>
          <label>
            {translate('Angle')}
            <input
              type="number"
              min="0"
              max="360"
              value={border.gradient.angle}
              onChange={(event) => {
                const angle = event.target.valueAsNumber;
                if (Number.isFinite(angle))
                  patch({ gradient: { ...border.gradient!, angle: Math.min(360, Math.max(0, angle)) } });
              }}
            />
          </label>
        </div>
      )}
      {!enabled && (
        <button
          type="button"
          className="border-panel-add"
          onClick={() => onUpdate((item) => ({ ...item, border: { ...initial } }))}
        >
          {translate('Add border')}
        </button>
      )}
    </section>
  );
}
