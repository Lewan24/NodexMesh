import { RotateCcw } from 'lucide-react';
import { resetItemAppearance } from '../resetAppearance';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BoardItem } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import { BACKGROUND_ITEM_TYPES } from '../constants';
import ColorPanel from './ColorPanel';
import BorderPanel from './BorderPanel';
import BoardIconControls from './BoardIconControls';
import DrawingControls from './DrawingControls';
import FrameControls from './FrameControls';
import LineControls from './LineControls';

type Section = 'fill' | 'strip' | 'border' | 'icon' | 'stroke';

export default function AppearanceControls({
  items,
  onUpdate,
  onUpdateItem,
  isColumnMode,
}: {
  items: BoardItem[];
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;
  isColumnMode: boolean;
}) {
  useTranslation();
  const single = items.length === 1 ? items[0] : undefined;
  const drawings = items.filter((item) => item.type === 'drawing');
  const sections: { id: Section; label: string }[] = [];
  if (single && (BACKGROUND_ITEM_TYPES.has(single.type) || single.type === 'frame')) {
    sections.push({ id: 'fill', label: translate('Card fill') });
  }
  if (drawings.length || (single?.type === 'line' && !isColumnMode)) {
    sections.push({ id: 'stroke', label: translate('Line') });
  }
  if (single && BACKGROUND_ITEM_TYPES.has(single.type) && single.type !== 'section-title') {
    sections.push({ id: 'strip', label: translate('Top accent strip') });
  }
  sections.push({ id: 'border', label: translate('Border') });
  if (single?.type === 'board') sections.push({ id: 'icon', label: translate('Board icon') });
  const [section, setSection] = useState<Section>(sections[0]!.id);
  const active = sections.some(({ id }) => id === section) ? section : sections[0]!.id;

  return (
    <div className="edit-bar-appearance-controls">
      <div className="edit-bar-sections" role="group" aria-label={translate('Appearance options')}>
        {sections.length > 1 &&
          sections.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={active === id} onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        <button type="button" className="edit-bar-reset" onClick={() => onUpdate(resetItemAppearance)}>
          <RotateCcw size={14} aria-hidden="true" />
          {translate('Reset appearance')}
        </button>
      </div>
      <div className="edit-bar-section-body">
        {active === 'fill' &&
          single &&
          (single.type === 'frame' ? (
            <FrameControls item={single} onUpdate={onUpdate} />
          ) : (
            <ColorPanel item={single} onUpdate={onUpdate} section="fill" />
          ))}
        {active === 'strip' && single && <ColorPanel item={single} onUpdate={onUpdate} section="strip" />}
        {active === 'border' && <BorderPanel items={items} onUpdate={onUpdate} />}
        {active === 'icon' && single?.type === 'board' && <BoardIconControls item={single} onUpdate={onUpdate} />}
        {active === 'stroke' && single?.type === 'line' && (
          <LineControls item={single} onUpdate={onUpdate} section="stroke" />
        )}
        {active === 'stroke' && drawings.length > 0 && <DrawingControls items={drawings} onUpdate={onUpdateItem} />}
      </div>
    </div>
  );
}
