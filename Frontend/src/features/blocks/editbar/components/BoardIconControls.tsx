import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import type { BoardBlockItem, BoardItem, IconItem } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import { getBoardIcon } from '../../board/boardIcon';

const IconDialog = lazy(() => import('../../icon/IconDialog'));

export default function BoardIconControls({
  item,
  onUpdate,
}: {
  item: BoardBlockItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}) {
  useTranslation();
  const [editing, setEditing] = useState(false);
  const icon = getBoardIcon(item);
  const defaultIcon: IconItem = {
    ...item,
    type: 'icon',
    iconMode: 'preset',
    source: 'folder',
    label: translate('Board'),
    color: '#7C3AED',
  };

  return (
    <div
      className="edit-bar-control-card flex shrink-0 flex-col gap-2 rounded-xl border p-3"
      style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
    >
      <label className="flex min-h-8 items-center gap-2 text-xs font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={!!icon}
          style={{ accentColor: 'var(--color-accent)' }}
          onChange={(event) => {
            const enabled = event.target.checked;
            onUpdate((current) =>
              current.type === 'board'
                ? {
                    ...current,
                    icon: '',
                    boardIcon: enabled
                      ? { iconMode: 'preset', source: 'folder', label: translate('Board'), color: '#7C3AED' }
                      : undefined,
                  }
                : current,
            );
          }}
        />
        {translate('Show board icon')}
      </label>
      <button
        type="button"
        disabled={!icon}
        className="btn-accent inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={() => setEditing(true)}
      >
        <Pencil size={13} aria-hidden="true" />
        {translate('Choose board icon')}
      </button>
      {editing && (
        <Suspense fallback={null}>
          <IconDialog
            item={icon ?? defaultIcon}
            onClose={() => setEditing(false)}
            onSave={(patch) => {
              onUpdate((current) => (current.type === 'board' ? { ...current, icon: '', boardIcon: patch } : current));
              setEditing(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
