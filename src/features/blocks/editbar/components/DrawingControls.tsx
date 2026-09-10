import ColorSwatch from './ColorSwatch';
import { LINE_COLORS } from '../constants';
import CustomColorInput from './CustomColorInput';
import type { BoardItem, DrawingItem } from '@/entities/board/types';

export default function DrawingControls({ items, onUpdate }: {
  items: DrawingItem[];
  onUpdate: (id: string, updater: (item: BoardItem) => BoardItem) => void;
}) {
  const first = items[0];
  if (!first) return null;
  const mixedColor = items.some(item => item.color !== first.color);
  const mixedWidth = items.some(item => item.strokeWidth !== first.strokeWidth);
  const update = (patch: Partial<Pick<DrawingItem, 'color' | 'strokeWidth'>>) => items.forEach(item => onUpdate(item.id, current => current.type === 'drawing' ? { ...current, ...patch } : current));
  return <>
    <span className="text-xs whitespace-nowrap">{items.length > 1 ? `${items.length} drawings` : 'Ink'}</span>
    {LINE_COLORS.map(color => <ColorSwatch key={color} color={color} active={!mixedColor && first.color === color} onClick={() => update({ color })} />)}
    <CustomColorInput title="Drawing color" value={first.color} onChange={color => update({ color })} />
    {mixedColor && <span className="text-xs">Mixed colors</span>}
    <label className="flex items-center gap-2 text-xs">Width <input aria-label="Drawing stroke width" type="range" min="1" max="12" value={first.strokeWidth} onChange={event => update({ strokeWidth: Number(event.target.value) })} />{mixedWidth ? 'Mixed' : first.strokeWidth}</label>
  </>;
}
