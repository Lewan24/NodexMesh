import { Columns3, Grid3X3, Rows3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { BoardItem, ColumnItem, ColumnLayout } from '@/entities/board/types';
import { translate } from '@/shared/i18n';

interface ColumnLayoutControlsProps {
  item: ColumnItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

const LAYOUTS = [
  { value: 'vertical', icon: Rows3, title: 'Vertical layout' },
  { value: 'horizontal', icon: Columns3, title: 'Horizontal layout' },
  { value: 'grid', icon: Grid3X3, title: 'Grid layout' },
] satisfies { value: ColumnLayout; icon: typeof Rows3; title: string }[];

export default function ColumnLayoutControls({ item, onUpdate }: ColumnLayoutControlsProps) {
  useTranslation();
  const layout = item.layout ?? 'vertical';
  const update = (patch: Partial<ColumnItem>) => {
    onUpdate((current) => (current.type === 'column' ? { ...current, ...patch } : current));
  };

  return (
    <div
      className="edit-bar-control-card flex items-center gap-2 rounded-xl border p-2"
      style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
    >
      <span
        className="px-1 text-[9px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--color-text-faint)' }}
      >
        {translate('Layout')}
      </span>
      <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--edit-bar-control)' }}>
        {LAYOUTS.map(({ value, icon: Icon, title }) => (
          <button
            key={value}
            type="button"
            aria-pressed={layout === value}
            aria-label={translate(title)}
            title={translate(title)}
            onClick={() => update({ layout: value })}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{
              color: layout === value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              background: layout === value ? 'var(--edit-bar-card)' : 'transparent',
              boxShadow: layout === value ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
      {layout === 'grid' && (
        <div className="flex items-center gap-1">
          {[2, 3, 4].map((columns) => (
            <button
              key={columns}
              type="button"
              aria-pressed={(item.gridColumns ?? 2) === columns}
              onClick={() => update({ gridColumns: columns })}
              title={translate('{{value1}} columns', { value1: columns })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
              style={{
                color: (item.gridColumns ?? 2) === columns ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                background:
                  (item.gridColumns ?? 2) === columns ? 'var(--color-accent-soft)' : 'var(--edit-bar-control)',
              }}
            >
              {columns}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
