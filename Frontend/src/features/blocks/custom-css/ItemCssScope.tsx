import { useTranslation } from 'react-i18next';
import { useId, useMemo, type ReactNode } from 'react';
import type { BaseItem } from '@/entities/board/types';
import { useStatusDefinitions } from '@/features/statuses/ProjectStatusesContext';
import { validateStatusCss } from '@/features/statuses/statusModel';
import { itemBorderRule } from '../border/itemBorder';
import { customCssRule } from './customCss';

export default function ItemCssScope({ item, children }: { item: BaseItem; children: ReactNode }) {
  useTranslation();
  const scope = useId().replace(/[^\w-]/g, '_');
  const statuses = useStatusDefinitions();
  const statusCss = statuses.find((status) => status.id === item.statusId)?.customCss;
  const statusRule = useMemo(() => {
    if (!statusCss?.enabled) return '';
    try {
      validateStatusCss(statusCss.source);
      return customCssRule(statusCss, scope, 'status');
    } catch {
      return '';
    }
  }, [statusCss, scope]);
  const borderRule = useMemo(() => itemBorderRule(item.border, scope), [item.border, scope]);
  const rule = useMemo(() => customCssRule(item.customCss, scope), [item.customCss, scope]);
  return (
    <div data-item-css-scope={scope} style={{ display: 'contents' }}>
      {borderRule && <style data-item-border>{borderRule}</style>}
      {rule && <style>{rule}</style>}
      {statusRule && <style data-status-css>{statusRule}</style>}
      {children}
    </div>
  );
}
