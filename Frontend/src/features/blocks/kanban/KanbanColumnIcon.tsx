import { Columns3 } from 'lucide-react';
import type { KanbanColumnIcon as ColumnIcon } from '@/entities/board/types';
import { getPresetIcon } from '../icon/iconPresets';

export default function KanbanColumnIcon({ icon, size = 18 }: { icon?: ColumnIcon; size?: number }) {
  if (icon?.mode === 'emoji')
    return (
      <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1 }}>
        {icon.source}
      </span>
    );
  const Icon = icon?.mode === 'preset' ? getPresetIcon(icon.source) : Columns3;
  return <Icon size={size} aria-hidden="true" />;
}
