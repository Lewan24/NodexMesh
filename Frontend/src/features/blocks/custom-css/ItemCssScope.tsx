import { useTranslation } from 'react-i18next';
import { useId, useMemo, useLayoutEffect, useRef, type ReactNode } from 'react';
import type { BaseItem } from '@/entities/board/types';
import { useStatusDefinitions } from '@/features/statuses/ProjectStatusesContext';
import { validateStatusCss } from '@/features/statuses/statusModel';
import { itemBorderRule } from '../border/itemBorder';
import { customCssRule } from './customCss';

export default function ItemCssScope({ item, children }: { item: BaseItem; children: ReactNode }) {
  useTranslation();
  const elementRef = useRef<HTMLDivElement>(null);
  const heightLocked = !!(item.locked && item.height && Number.isFinite(item.height) && item.height > 0);
  useLayoutEffect(() => {
    const scope = elementRef.current;
    if (!scope || !heightLocked) return;
    const added = new Set<HTMLElement>();
    const markScrollRoots = () => {
      for (const child of scope.children) {
        if (child instanceof HTMLElement && child.tagName !== 'STYLE' && !child.hasAttribute('data-wheel-scroll')) {
          child.setAttribute('data-wheel-scroll', 'true');
          added.add(child);
        }
      }
    };
    markScrollRoots();
    const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(markScrollRoots);
    observer?.observe(scope, { childList: true });
    return () => {
      observer?.disconnect();
      for (const child of added) child.removeAttribute('data-wheel-scroll');
    };
  }, [heightLocked]);
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
    <div ref={elementRef} data-item-css-scope={scope} style={{ display: 'contents' }}>
      {heightLocked && (
        <style data-item-height-lock>{`
        [data-item-css-scope="${scope}"] > :not(style) {
          height: ${item.height}px !important;
          min-height: 0 !important;
          max-height: ${item.height}px !important;
          overflow: auto !important;
          overscroll-behavior: contain;
        }
      `}</style>
      )}
      {borderRule && <style data-item-border>{borderRule}</style>}
      {rule && <style>{rule}</style>}
      {statusRule && <style data-status-css>{statusRule}</style>}
      {children}
    </div>
  );
}
