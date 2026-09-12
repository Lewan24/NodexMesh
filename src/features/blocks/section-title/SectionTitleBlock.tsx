import { useCardAppearance } from '../shared/cardAppearance';
import { useState } from 'react';
import type { SectionTitleItem } from '@/entities/board/types';
import type { BlockUpdateHandler } from '../types';
import { getTypographyStyle } from '../typography/typographyUtils';
export function sectionTitleScale(zoom: number): number { return zoom >= 1 ? 1 : Math.min(3.2, 1 / Math.max(0.1, zoom)); }
export default function SectionTitleBlock({ item, zoom, onUpdate }: { item: SectionTitleItem; zoom: number; onUpdate: BlockUpdateHandler }) {
  const [editing, setEditing] = useState(false);
  const { background, textColor } = useCardAppearance(item.color, item.gradient, item.colorRole ?? (!item.color ? 'accent1' : undefined));
  const scale = sectionTitleScale(zoom);
  return <div style={{ width: item.width ?? 320, minHeight: 48, position: 'relative' }}>
    <div style={{ ...getTypographyStyle(item), transform: `scale(${scale})`, transformOrigin: 'bottom left', width: '100%', fontSize: item.typography?.fontSize ?? 24, fontWeight: item.typography?.bold === false ? 400 : 700, color: textColor, background, padding: '8px 12px', borderRadius: 3, boxShadow: zoom < 0.3 ? '0 4px 14px rgba(0,0,0,0.22)' : '0 2px 8px rgba(0,0,0,0.12)', boxSizing: 'border-box', lineHeight: 1.25, overflowWrap: 'anywhere' }} onDoubleClick={() => { if (!item.locked) setEditing(true); }}>
      {editing ? <textarea autoFocus aria-label="Section title" value={item.content} rows={Math.max(1, item.content.split('\n').length)} style={{ width: '100%', background: 'transparent', color: 'inherit', font: 'inherit', resize: 'none', outline: 'none' }} onMouseDown={event => event.stopPropagation()} onChange={event => { const content = event.target.value; onUpdate(current => current.type === 'section-title' ? { ...current, content } : current); }} onBlur={() => setEditing(false)} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) { event.preventDefault(); setEditing(false); } }} /> : <div style={{ whiteSpace: 'pre-wrap', cursor: 'grab' }} title="Double-click to edit section title">{item.content || 'Section title'}</div>}
    </div>
  </div>;
}
