import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import type { BoardItem, ColumnItem, ColumnLayout } from '@/entities/board/types';
import EditBarButton, { EditBarDivider } from './EditBarButton';

interface ColumnLayoutControlsProps {
  item: ColumnItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

const LAYOUTS: { value: ColumnLayout; label: string; title: string }[] = [
  {
    value: 'vertical',
    label: '↕',
    get title() {
      return translate('Vertical layout');
    },
  },
  {
    value: 'horizontal',
    label: '↔',
    get title() {
      return translate('Horizontal layout');
    },
  },
  {
    value: 'grid',
    label: '▦',
    get title() {
      return translate('Grid layout');
    },
  },
];

export default function ColumnLayoutControls({ item, onUpdate }: ColumnLayoutControlsProps) {
  useTranslation();
  const layout = item.layout ?? 'vertical';

  const update = (patch: Partial<ColumnItem>) => {
    onUpdate((current) => (current.type === 'column' ? { ...current, ...patch } : current));
  };

  return (
    <>
      <EditBarDivider />

      {LAYOUTS.map((option) => (
        <EditBarButton
          key={option.value}
          active={layout === option.value}
          onClick={() => update({ layout: option.value })}
          title={option.title}
        >
          {option.label}
        </EditBarButton>
      ))}

      {layout === 'grid' && (
        <>
          <EditBarDivider />

          {[2, 3, 4].map((columns) => (
            <EditBarButton
              key={columns}
              active={(item.gridColumns ?? 2) === columns}
              onClick={() => update({ gridColumns: columns })}
              title={translate('{{value1}} columns', { value1: columns })}
            >
              {columns}
            </EditBarButton>
          ))}
        </>
      )}
    </>
  );
}
