import { useState, useRef, useEffect } from 'react';
import type { NoteItem, BoardItem } from '../../data/types';

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

type FontSize = 'sm' | 'base' | 'lg';
const FS_CLASS: Record<FontSize, string> = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' };
const MIN_MANUAL_HEIGHT = 60;

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
  const contentRef = useRef<HTMLDivElement>(null);
  const light = isLight(item.color);
  const textColor = light ? '#1e293b' : '#e8f4f4';
  const mutedColor = light ? 'rgba(30,41,59,0.4)' : 'rgba(232,244,244,0.4)';
  const fs: FontSize = (item.fontSize as FontSize) ?? 'base';
  const manualHeight = item.height;

  useEffect(() => {
    if (isSelected) setEditing(true);
    else setEditing(false);
  }, [isSelected]);

  // Auto-grow only applies while the user hasn't manually set a height.
  const resize = () => {
    if (manualHeight) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => { if (editing) { resize(); textareaRef.current?.focus(); } }, [editing]);
  useEffect(() => { resize(); }, [item.content, manualHeight]);

  const update = (patch: Partial<NoteItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));

  // Dragging from the bottom edge sets (or adjusts) a fixed height. Once set,
  // the note stops growing with its content and scrolls internally instead.
  const startHeightDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = manualHeight ?? contentRef.current?.offsetHeight ?? 120;
    const handleMove = (ev: MouseEvent) => {
      const next = Math.max(MIN_MANUAL_HEIGHT, startHeight + (ev.clientY - startY));
      update({ height: next });
    };
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  return (
    <div className="group relative" style={{ width: item.width ?? 220 }}>
      <div
        className="rounded-2xl shadow-xl overflow-hidden transition-shadow duration-150 group-hover:shadow-2xl"
        style={{
          backgroundColor: item.color,
          outline: isSelected ? '2px solid var(--color-accent)' : 'none',
          outlineOffset: 3,
        }}
      >
        {/* Top accent strip */}
        {item.topColor && (
          <div style={{ height: 5, backgroundColor: item.topColor }} />
        )}

        {/* Header — delete button + auto-fit reset when a manual height is set */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-0 cursor-grab active:cursor-grabbing">
          {manualHeight && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => update({ height: undefined })}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5"
              style={{ color: mutedColor }}
              title="Reset to auto height"
            >
              Auto-fit
            </button>
          )}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onDelete}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1 hover:bg-black/10"
            style={{ color: mutedColor }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="px-3 pb-3 pt-1"
          style={manualHeight ? { height: manualHeight, overflowY: 'auto' } : undefined}
        >
          {editing ? (
            <textarea
              ref={textareaRef}
              value={item.content}
              onChange={e => { update({ content: e.target.value }); resize(); }}
              onMouseDown={e => e.stopPropagation()}
              onBlur={() => setEditing(false)}
              onKeyDown={e => {
                // Enter stays as a newline here (notes are multi-line);
                // Escape still gives a quick way to exit and save.
                if (e.key === 'Escape') { e.currentTarget.blur(); setEditing(false); }
              }}
              className={`w-full bg-transparent resize-none outline-none leading-relaxed ${manualHeight ? 'overflow-y-auto h-full' : 'overflow-hidden'} ${FS_CLASS[fs]}`}
              style={{
                color: textColor,
                minHeight: manualHeight ? undefined : 52,
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
                minHeight: manualHeight ? undefined : 52,
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
        style={{ top: 0, bottom: 0, right: -7, width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseDown={e => { e.stopPropagation(); onBlockResize(e, item.width ?? 220, null); }}
      >
        <div className="w-1.5 rounded-full" style={{ height: 36, backgroundColor: light ? 'rgba(30,41,59,0.4)' : 'rgba(232,244,244,0.4)' }} />
      </div>

      {/* Height resize handle (bottom edge) */}
      <div
        className="absolute opacity-0 group-hover:opacity-100 transition-opacity cursor-ns-resize"
        style={{ left: 0, right: 0, bottom: -7, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseDown={startHeightDrag}
        title="Drag to set a fixed height"
      >
        <div className="h-1.5 rounded-full" style={{ width: 36, backgroundColor: light ? 'rgba(30,41,59,0.4)' : 'rgba(232,244,244,0.4)' }} />
      </div>
    </div>
  );
}
