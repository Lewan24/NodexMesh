import { useState } from 'react';
import type { ImageItem, BoardItem } from '../types';

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

interface Props {
  item: ImageItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onBlockResize: (e: React.MouseEvent, w: number, h: number) => void;
}

export default function ImageBlock({ item, onUpdate, onDelete, onBlockResize }: Props) {
  const [editingUrl, setEditingUrl] = useState(!item.url);
  const [urlInput, setUrlInput] = useState(item.url);
  const imgH = item.imgHeight ?? 178;
  const bg = item.color ?? '#08171d';
  const light = isLight(bg);
  const textColor = light ? '#1e293b' : '#8aacb8';
  const mutedColor = light ? '#94a3b8' : '#5a8a94';
  const borderColor = light ? 'rgba(0,0,0,0.1)' : '#1a3040';
  const inputBg = light ? '#f8fafc' : '#071317';
  const isSticker = item.variant === 'sticker';

  const update = (patch: Partial<ImageItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));
  const commitUrl = () => { update({ url: urlInput }); setEditingUrl(false); };

  return (
    <div className="group relative" style={{ width: item.width ?? 220 }}>
      <div
        className={isSticker ? 'overflow-hidden' : 'rounded-2xl overflow-hidden border shadow-xl'}
        style={isSticker
          ? { borderRadius: 14, boxShadow: '0 10px 26px rgba(0,0,0,0.22)' }
          : { backgroundColor: bg, borderColor }}
      >
        {/* Top accent strip */}
        {!isSticker && item.topColor && (
          <div style={{ height: 5, backgroundColor: item.topColor }} />
        )}

        {/* Image area */}
        <div
          className="relative cursor-grab active:cursor-grabbing"
          style={{ height: imgH, backgroundColor: light ? '#e2e8f0' : '#071317' }}
        >
          {item.url ? (
            <>
              <img src={item.url} alt={item.caption || 'Board image'} className="w-full h-full object-cover" draggable={false} />
              {!isSticker && <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />}
            </>
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer"
              onClick={() => setEditingUrl(true)}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: light ? 'rgba(0,0,0,0.06)' : '#112028' }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={mutedColor} strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </div>
              <span className="text-sm" style={{ color: mutedColor }}>Click to add image URL</span>
            </div>
          )}

          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.url && (
              <>
                {/* Card / sticker toggle */}
                <div
                  className="flex items-center rounded-lg overflow-hidden"
                  style={{ backgroundColor: 'rgba(7,19,23,0.7)' }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => update({ variant: 'card' })}
                    className="w-7 h-7 flex items-center justify-center transition-colors"
                    style={{ color: !isSticker ? '#fff' : '#8aacb8', backgroundColor: !isSticker ? 'rgba(124,58,237,0.5)' : 'transparent' }}
                    title="Card with caption"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 15h18M8 19h8" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => update({ variant: 'sticker' })}
                    className="w-7 h-7 flex items-center justify-center transition-colors"
                    style={{ color: isSticker ? '#fff' : '#8aacb8', backgroundColor: isSticker ? 'rgba(124,58,237,0.5)' : 'transparent' }}
                    title="Sticker (image only)"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 16.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10.5a3.5 3.5 0 0 1-3.5 3.5H7.5A3.5 3.5 0 0 1 4 16.5z" />
                      <path d="M14 20v-3a3 3 0 0 1 3-3h3" />
                    </svg>
                  </button>
                </div>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setEditingUrl(v => !v)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{ backgroundColor: 'rgba(7,19,23,0.7)', color: '#8aacb8' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8aacb8'; }}
                  title="Change image URL"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
                  </svg>
                </button>
              </>
            )}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ backgroundColor: 'rgba(7,19,23,0.7)', color: '#8aacb8' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF6B8A'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8aacb8'; }}
              title="Delete"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {editingUrl && (
          <div
            className={isSticker ? 'p-2 mt-1 rounded-xl' : 'px-3 py-2.5 border-t'}
            style={isSticker ? { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' } : { borderColor }}
            onMouseDown={e => e.stopPropagation()}
          >
            <input
              autoFocus
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitUrl(); if (e.key === 'Escape') { setEditingUrl(false); setUrlInput(item.url); } }}
              onBlur={commitUrl}
              placeholder="Paste image URL…"
              className="w-full text-sm px-2.5 py-1.5 rounded-xl outline-none border border-[#7C3AED]/40 focus:border-[#7C3AED] transition-colors"
              style={{ backgroundColor: isSticker ? 'var(--color-surface-alt)' : inputBg, color: isSticker ? 'var(--color-text-primary)' : textColor }}
            />
          </div>
        )}

        {/* Caption row — only in card mode, and always the same DOM shape
            regardless of hover, so its height never shifts (that shifting
            is what caused the flicker while resizing: the box's own bounds
            would move out from under the cursor and re-trigger hover). */}
        {!isSticker && (
          <div className="px-3 py-2.5" onMouseDown={e => e.stopPropagation()}>
            <input
              value={item.caption}
              onChange={e => update({ caption: e.target.value })}
              placeholder="Add caption…"
              className="w-full bg-transparent text-sm outline-none transition-colors"
              style={{ color: textColor }}
            />
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute opacity-0 group-hover:opacity-100 transition-opacity cursor-se-resize"
        style={{ bottom: -6, right: -6, width: 18, height: 18 }}
        onMouseDown={e => { if (e.button !== 0) return; e.stopPropagation(); onBlockResize(e, item.width!, imgH); }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="15" cy="15" r="5" fill="var(--color-accent)" opacity="0.85" />
          <path d="M6 15h9M15 6v9" stroke="var(--color-accent)" strokeWidth="1.75" strokeLinecap="round" opacity="0.55" />
        </svg>
      </div>
    </div>
  );
}
