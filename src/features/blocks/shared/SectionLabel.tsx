import { useState } from 'react';
import type { BoardItem } from '@/entities/board/types';
import { getTypographyStyle } from '../typography/typographyUtils';
export function sectionTitleScale(zoom: number): number { return zoom >= 1 ? 1 : Math.min(3.2, 1 / Math.max(0.1, zoom)); }
export default function SectionLabel({ item, title, color, zoom, onChange }: { item: BoardItem; title: string; color: string; zoom: number; onChange: (title: string) => void }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const labelMode = zoom >= 0.65 ? 'normal' : zoom >= 0.3 ? 'overview' : 'far';
  const typographyStyle = getTypographyStyle(item);
  return (
        <div
          className="flex items-center gap-2 rounded-xl"
          style={{
            padding: labelMode === 'far' ? '6px 11px' : '4px 9px',
            backgroundColor:
              labelMode === 'far'
                ? color
                : 'var(--color-surface-translucent)',
            border:
              labelMode === 'far'
                ? 'none'
                : `1px solid ${color}66`,
            boxShadow:
              labelMode === 'far'
                ? '0 4px 14px rgba(0,0,0,0.18)'
                : '0 2px 8px rgba(0,0,0,0.08)',
            backdropFilter:
              labelMode === 'far'
                ? undefined
                : 'blur(8px)',
            maxWidth: Math.max(160, Math.min((item.width ?? 320), 420)),
          }}
        >
          <div
            className="rounded-full flex-shrink-0"
            style={{
              width: labelMode === 'far' ? 7 : 6,
              height: labelMode === 'far' ? 7 : 6,
              backgroundColor:
                labelMode === 'far'
                  ? '#fff'
                  : color,
            }}
          />

          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={event => onChange(event.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === 'Escape') {
                  setEditingTitle(false);
                }
              }}
              onMouseDown={event => event.stopPropagation()}
              className="bg-transparent outline-none min-w-0"
              style={{
                color: labelMode === 'far' ? '#fff' : color,
                minWidth: 100,
                maxWidth: 300,
                ...typographyStyle,
                fontSize: item.typography?.fontSize
                  ? `${item.typography.fontSize}px`
                  : '14px',
                fontWeight: item.typography?.bold ? 700 : 650,
              }}
            />
          ) : (
            <span
              className="truncate cursor-text select-none whitespace-nowrap"
              style={{
                color: labelMode === 'far' ? '#fff' : color,
                ...typographyStyle,
                fontSize: item.typography?.fontSize
                  ? `${item.typography.fontSize}px`
                  : '14px',
                fontWeight: item.typography?.bold ? 700 : 650,
                textTransform: labelMode === 'far' ? 'uppercase' : undefined,
                letterSpacing: labelMode === 'far' ? '0.06em' : undefined,
              }}
              title={title}
              onDoubleClick={() => { if (!item.locked) setEditingTitle(true); }}
            >
              {title || 'Untitled section'}
            </span>
          )}
        </div>
  );
}
