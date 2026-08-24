import { useState, useRef, useEffect } from 'react';
import type { NoteItem, BoardItem } from '../types';

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

type FontSize = 'sm' | 'base' | 'lg';
const FS_CLASS: Record<FontSize, string> = { sm: 'text-xs', base: 'text-sm', lg: 'text-base' };

interface Props {
  item: NoteItem;
  zoom?: number;
  isSelected: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onBlockResize: (e: React.MouseEvent, w: number, h: null) => void;
}

export default function NoteBlock({ item, isSelected, onUpdate, onDelete, onBlockResize }: Props) {
  const [editing, setEditing] = useState(!item.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const light = isLight(item.color);
  const textColor = light ? '#1e293b' : '#e8f4f4';
  const mutedColor = light ? 'rgba(30,41,59,0.4)' : 'rgba(232,244,244,0.4)';
  const fs: FontSize = (item.fontSize as FontSize) ?? 'base';

  useEffect(() => {
    if (isSelected) setEditing(true);
    else setEditing(false);
  }, [isSelected]);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => { if (editing) { resize(); textareaRef.current?.focus(); } }, [editing]);
  useEffect(() => { resize(); }, [item.content]);

  const update = (patch: Partial<NoteItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));

  return (
    <div className="group relative" style={{ width: item.width ?? 220 }}>
      <div
        className="rounded-2xl shadow-xl overflow-hidden transition-shadow duration-150 group-hover:shadow-2xl"
        style={{
          backgroundColor: item.color,
          outline: isSelected ? '2px solid #02A0A0' : 'none',
          outlineOffset: 3,
        }}
      >
        {/* Top accent strip */}
        {item.topColor && (
          <div style={{ height: 5, backgroundColor: item.topColor }} />
        )}

        {/* Header — just the delete button now; colors are in EditBar */}
        <div className="flex items-center justify-end px-3 pt-2.5 pb-0 cursor-grab active:cursor-grabbing">
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5 hover:bg-black/10"
            style={{ color: mutedColor }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-3 pb-3 pt-1">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={item.content}
              onChange={e => { update({ content: e.target.value }); resize(); }}
              onMouseDown={e => e.stopPropagation()}
              className={`w-full bg-transparent resize-none outline-none leading-relaxed overflow-hidden ${FS_CLASS[fs]}`}
              style={{
                color: textColor,
                minHeight: 52,
                textAlign: item.textAlign ?? 'left',
                fontWeight: item.bold ? 700 : 400,
                fontStyle: item.italic ? 'italic' : 'normal',
              }}
              placeholder="Type your note…"
              rows={1}
            />
          ) : (
            <div
              onClick={() => setEditing(true)}
              className={`leading-relaxed whitespace-pre-wrap cursor-text select-none ${FS_CLASS[fs]}`}
              style={{
                color: item.content ? textColor : mutedColor,
                minHeight: 52,
                textAlign: item.textAlign ?? 'left',
                fontWeight: item.bold ? 700 : 400,
                fontStyle: item.italic ? 'italic' : 'normal',
              }}
            >
              {item.content || 'Click to edit…'}
            </div>
          )}
        </div>
      </div>

      {/* Width resize handle */}
      <div
        className="absolute opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize"
        style={{ top: 0, bottom: 0, right: -6, width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseDown={e => { e.stopPropagation(); onBlockResize(e, item.width ?? 220, null); }}
      >
        <div className="w-1 rounded-full" style={{ height: 32, backgroundColor: light ? 'rgba(30,41,59,0.25)' : 'rgba(232,244,244,0.25)' }} />
      </div>
    </div>
  );
}
