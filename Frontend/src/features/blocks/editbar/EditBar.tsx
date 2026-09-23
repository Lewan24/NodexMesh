import { LayoutGrid, Palette, SlidersHorizontal, Type, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { BoardItem } from '@/entities/board/types';
import { translate } from '@/shared/i18n';

import { ITEM_TEXT_SECTIONS } from '../typography/sectionTypography';
import ColorPanel from './components/ColorPanel';
import ColumnLayoutControls from './components/ColumnLayoutControls';
import DrawingControls from './components/DrawingControls';
import FrameControls from './components/FrameControls';
import LayerControls from './components/LayerControls';
import LineControls from './components/LineControls';
import SectionTypographyControls from './components/SectionTypographyControls';
import TypographyControls from './components/TypographyControls';
import { ITEM_TYPE_LABELS } from './constants';

interface EditBarProps {
  selectedItems: BoardItem[];
  frameControls?: ReactNode;
  onJoinDrawings?: () => void;
  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;
  onDeleteItems: (ids: string[]) => void;
  onGroupItems: () => void;
  onFitFrame: (id: string) => void;
  onClose: () => void;
  columnItem?: BoardItem;
  onUpdateColumnItem?: (updater: (item: BoardItem) => BoardItem) => void;
  onDeleteColumnItem?: () => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

type EditTab = 'appearance' | 'text' | 'layout';

function TabButton({
  id,
  active,
  title,
  icon,
  onClick,
}: {
  id: EditTab;
  active: boolean;
  title: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`edit-bar-panel-${id}`}
      title={title}
      onClick={onClick}
      className="edit-bar-tab flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-all"
      style={{
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        background: active ? 'var(--color-accent-soft)' : 'transparent',
      }}
    >
      {icon}
      <span>{title}</span>
    </button>
  );
}

export default function EditBar({
  selectedItems,
  frameControls,
  onJoinDrawings,
  onUpdateItem,
  onDeleteItems,
  onGroupItems,
  onFitFrame,
  onClose,
  columnItem,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onUpdateColumnItem,
  onDeleteColumnItem,
}: EditBarProps) {
  useTranslation();
  const isColumnMode = !!columnItem;
  const isMulti = !isColumnMode && selectedItems.length > 1;
  const single = columnItem ?? (selectedItems.length === 1 ? selectedItems[0] : null);
  const [activeTab, setActiveTab] = useState<EditTab | null>(null);

  useEffect(() => setActiveTab(null), [single?.id, isMulti]);

  if (!columnItem && selectedItems.length === 0) return null;

  const ids = selectedItems.map((item) => item.id);
  const handleUpdate = (updater: (item: BoardItem) => BoardItem) => {
    if (isColumnMode && onUpdateColumnItem) onUpdateColumnItem(updater);
    else if (single) onUpdateItem(single.id, updater);
  };
  const handleDelete = () => {
    if (isColumnMode && onDeleteColumnItem) onDeleteColumnItem();
    else onDeleteItems(ids);
    onClose();
  };
  const typeLabel = isColumnMode
    ? single
      ? translate(ITEM_TYPE_LABELS[single.type] ?? single.type)
      : ''
    : isMulti
      ? translate('{{value1}} items', { value1: selectedItems.length })
      : single
        ? translate(ITEM_TYPE_LABELS[single.type] ?? single.type)
        : '';

  const hasAppearance = !!single && single.type !== 'icon';
  const hasText = !!single && single.type !== 'drawing' && ITEM_TEXT_SECTIONS[single.type].length > 0;
  const hasLayout = !!single;
  const toggleTab = (tab: EditTab) => setActiveTab((current) => (current === tab ? null : tab));

  return (
    <div
      data-edit-bar="true"
      className="edit-bar absolute left-1/2 z-50 flex -translate-x-1/2 select-none flex-col overflow-hidden rounded-2xl border shadow-xl"
      style={{
        top: 'var(--canvas-editbar-top, 12px)',
        background: 'var(--edit-bar-bg)',
        borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
        boxShadow: '0 12px 38px rgba(24, 12, 40, 0.18), 0 2px 8px rgba(24, 12, 40, 0.08)',
        backdropFilter: 'blur(18px) saturate(1.2)',
        width: 'max-content',
        maxWidth: 'calc(100% - 24px)',
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="h-0.5 w-full shrink-0 bg-gradient-to-r from-violet-600 via-fuchsia-400 to-amber-300" />

      <div className="edit-bar-row edit-bar-actions flex min-h-11 items-center gap-1 overflow-x-auto px-2 py-1.5">
        <button
          type="button"
          onClick={onClose}
          className="edit-bar-close flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
          style={{ color: 'var(--color-text-faint)' }}
          title={translate('Deselect (Esc)')}
          aria-label={translate('Deselect (Esc)')}
        >
          <X size={15} />
        </button>

        <span
          className="edit-bar-type shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-text-secondary)', background: 'var(--edit-bar-control)' }}
        >
          {typeLabel}
        </span>

        {single && (
          <div className="edit-bar-tabs flex items-center gap-0.5" role="tablist" aria-label={translate('Item style')}>
            {hasAppearance && (
              <TabButton
                id="appearance"
                active={activeTab === 'appearance'}
                title={translate('Appearance')}
                icon={<Palette size={14} />}
                onClick={() => toggleTab('appearance')}
              />
            )}
            {hasText && (
              <TabButton
                id="text"
                active={activeTab === 'text'}
                title={translate('Text')}
                icon={<Type size={14} />}
                onClick={() => toggleTab('text')}
              />
            )}
            {hasLayout && (
              <TabButton
                id="layout"
                active={activeTab === 'layout'}
                title={translate('Layout')}
                icon={<LayoutGrid size={14} />}
                onClick={() => toggleTab('layout')}
              />
            )}
          </div>
        )}

        {isMulti && onJoinDrawings && (
          <button
            type="button"
            onClick={onJoinDrawings}
            className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-semibold hover:bg-violet-500/15"
          >
            {translate('Join drawings')}
          </button>
        )}
        {isMulti && (
          <button
            type="button"
            onClick={onGroupItems}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
            style={{ color: 'var(--color-accent)', background: 'var(--color-accent-soft)' }}
            title={translate('Wrap in a frame')}
          >
            <SlidersHorizontal size={14} />
            {translate('Group')}
          </button>
        )}

        <span className="min-w-1 flex-1" />
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-rose-500/10"
          style={{ color: 'var(--color-danger-strong)' }}
          title={isMulti ? translate('Delete {{value1}}', { value1: selectedItems.length }) : translate('Delete')}
          aria-label={isMulti ? translate('Delete {{value1}}', { value1: selectedItems.length }) : translate('Delete')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
        </button>
      </div>

      {isMulti && selectedItems.some((item) => item.type === 'drawing') && (
        <div
          className="edit-bar-row flex items-center gap-2 border-t px-3 py-2"
          style={{ borderColor: 'var(--color-border-soft)' }}
        >
          <DrawingControls items={selectedItems.filter((item) => item.type === 'drawing')} onUpdate={onUpdateItem} />
        </div>
      )}

      {single && activeTab === 'appearance' && hasAppearance && (
        <div
          id="edit-bar-panel-appearance"
          role="tabpanel"
          className="edit-bar-tab-content edit-bar-appearance-panel flex items-start gap-2 overflow-x-auto border-t p-2"
          style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-panel)' }}
        >
          {single.type === 'line' && !isColumnMode ? (
            <LineControls item={single} onUpdate={handleUpdate} />
          ) : single.type === 'drawing' ? (
            <DrawingControls items={[single]} onUpdate={(_, updater) => handleUpdate(updater)} />
          ) : single.type === 'frame' ? (
            <FrameControls item={single} onUpdate={handleUpdate} />
          ) : (
            <ColorPanel item={single} onUpdate={handleUpdate} />
          )}
        </div>
      )}

      {single && activeTab === 'text' && hasText && (
        <div
          id="edit-bar-panel-text"
          role="tabpanel"
          className="edit-bar-tab-content edit-bar-text-panel flex flex-col border-t"
          style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-panel)' }}
        >
          <div className="flex items-center gap-2 px-2 pt-2">
            <TypographyControls item={single} onUpdate={handleUpdate} />
          </div>
          <SectionTypographyControls key={single.id} item={single} onUpdate={handleUpdate} />
        </div>
      )}

      {single && activeTab === 'layout' && hasLayout && (
        <div
          id="edit-bar-panel-layout"
          role="tabpanel"
          className="edit-bar-tab-content edit-bar-layout-panel flex items-center gap-2 overflow-x-auto border-t p-2"
          style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-panel)' }}
        >
          {!isColumnMode && single.type !== 'frame' && (
            <div
              className="edit-bar-control-card flex shrink-0 items-center gap-2 rounded-xl border p-2"
              style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
            >
              <span
                className="px-1 text-[9px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--color-text-faint)' }}
              >
                {translate('Layer order')}
              </span>
              <LayerControls
                onSendToBack={() => onSendToBack(single.id)}
                onSendBackward={() => onSendBackward(single.id)}
                onBringForward={() => onBringForward(single.id)}
                onBringToFront={() => onBringToFront(single.id)}
              />
            </div>
          )}
          {frameControls && (
            <div
              className="edit-bar-control-card flex shrink-0 items-center gap-2 rounded-xl border p-2"
              style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
            >
              {frameControls}
            </div>
          )}
          {single.type === 'column' && <ColumnLayoutControls item={single} onUpdate={handleUpdate} />}
          {!isColumnMode && single.type === 'frame' && (
            <div
              className="edit-bar-control-card flex shrink-0 items-center gap-2 rounded-xl border p-2"
              style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
            >
              <span
                className="px-1 text-[9px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--color-text-faint)' }}
              >
                {translate('Frame size')}
              </span>
              <button
                type="button"
                onClick={() => onFitFrame(single.id)}
                className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-semibold"
                style={{ color: 'var(--color-accent)', background: 'var(--color-accent-soft)' }}
              >
                {translate('Fit contents')}
              </button>
            </div>
          )}
          {single.type === 'document' && (
            <div
              className="edit-bar-control-card flex shrink-0 items-center gap-2 rounded-xl border p-2"
              style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
            >
              <button
                type="button"
                className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-semibold"
                style={{ color: 'var(--color-accent)', background: 'var(--color-accent-soft)' }}
                onClick={() =>
                  handleUpdate((current) =>
                    current.type === 'document' ? { ...current, autoHeight: true, height: undefined } : current,
                  )
                }
              >
                {translate('Auto-fit height')}
              </button>
            </div>
          )}
          {single.type === 'embed' && (
            <label
              className="edit-bar-control-card flex shrink-0 items-center gap-2 rounded-xl border p-2 text-xs font-semibold"
              style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
            >
              <input
                type="checkbox"
                checked={single.showLabel}
                className="accent-violet-600"
                onChange={(event) =>
                  handleUpdate((current) =>
                    current.type === 'embed' ? { ...current, showLabel: event.target.checked } : current,
                  )
                }
              />
              {translate('Show label')}
            </label>
          )}
          {single.type === 'timeline' && (
            <label
              className="edit-bar-control-card flex shrink-0 items-center gap-2 rounded-xl border p-2"
              style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
            >
              <span
                className="px-1 text-[9px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--color-text-faint)' }}
              >
                {translate('Timeline view')}
              </span>
              <select
                aria-label={translate('Timeline view')}
                value={single.mode}
                className="h-8 shrink-0 rounded-lg border px-2 text-xs font-semibold"
                style={{ borderColor: 'var(--color-border)', background: 'var(--edit-bar-control)' }}
                onChange={(event) =>
                  handleUpdate((current) =>
                    current.type === 'timeline'
                      ? { ...current, mode: event.target.value as 'simple' | 'schedule' }
                      : current,
                  )
                }
              >
                <option value="simple">{translate('Milestones')}</option>
                <option value="schedule">{translate('Schedule')}</option>
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
