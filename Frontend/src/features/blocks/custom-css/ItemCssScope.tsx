import { useId, useMemo, type ReactNode } from 'react';
import type { BaseItem } from '@/entities/board/types';
import { customCssRule } from './customCss';

export default function ItemCssScope({ item, children }: { item: BaseItem; children: ReactNode }) {
  const scope = useId().replace(/[^\w-]/g, '_');
  const rule = useMemo(() => customCssRule(item.customCss, scope), [item.customCss, scope]);
  return (
    <div data-item-css-scope={scope} style={{ display: 'contents' }}>
      {rule && <style>{rule}</style>}
      {children}
    </div>
  );
}
