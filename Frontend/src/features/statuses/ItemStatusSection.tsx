import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import type { BoardItem } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import { useProjectStatuses } from './ProjectStatusesContext';
import StatusManager from './StatusManager';
import './statuses.css';

export default function ItemStatusSection({
  items,
  readOnly,
  onUpdateAll,
}: {
  items: BoardItem[];
  readOnly: boolean;
  onUpdateAll: (updater: (item: BoardItem) => BoardItem) => void | Promise<void>;
}) {
  useTranslation();
  const context = useProjectStatuses();
  const [open, setOpen] = useState(false);
  const mixed = items.some((item) => item.statusId !== items[0]?.statusId);
  const selected = context.statuses.find((status) => status.id === items[0]?.statusId);
  const disabled = readOnly || context.readOnly || !context.ready;
  return (
    <section className="item-status-section p-4" style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wide">{translate('Status')}</h3>
        {!disabled && (
          <button
            type="button"
            className="status-manage"
            onClick={() => setOpen(true)}
            aria-label={translate('Manage project statuses')}
            title={translate('Manage project statuses')}
          >
            <Settings2 size={15} />
          </button>
        )}
      </div>
      <select
        aria-label={translate('Item status')}
        disabled={disabled}
        value={mixed ? '__mixed' : (selected?.id ?? '')}
        onChange={(event) => {
          const statusId = event.target.value || undefined;
          void onUpdateAll((item) => ({ ...item, statusId }));
        }}
      >
        {mixed && (
          <option value="__mixed" disabled>
            {translate('Mixed')}
          </option>
        )}
        <option value="">{translate('No status')}</option>
        {context.statuses.map((status) => (
          <option key={status.id} value={status.id}>
            {status.title}
          </option>
        ))}
      </select>
      {!mixed && selected?.description && (
        <p className="text-xs opacity-65 mt-2 whitespace-pre-wrap">{selected.description}</p>
      )}
      {!context.ready && <p className="text-xs mt-2">{translate('Loading…')}</p>}
      {context.error && (
        <div role="alert" className="text-xs mt-2">
          <p>{context.error}</p>
          <button type="button" onClick={() => void context.reload()}>
            {translate('Retry')}
          </button>
        </div>
      )}
      {open && <StatusManager onClose={() => setOpen(false)} />}
    </section>
  );
}
