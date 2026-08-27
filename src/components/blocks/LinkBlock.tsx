import { useState } from 'react';
import type { LinkItem, BoardItem } from '../../data/types';

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

interface Props {
  item: LinkItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
}

export default function LinkBlock({ item, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(!item.url || item.url === 'https://');

  const bg = item.color ?? '#08171d';
  const light = isLight(bg);
  const textColor = light ? '#1e293b' : '#e2e8f0';
  const mutedColor = light ? '#64748b' : '#5a8a94';
  const borderBase = light ? 'rgba(0,0,0,0.1)' : '#1a3040';
  const borderHover = light ? 'rgba(124, 58, 237,0.5)' : 'rgba(124, 58, 237,0.4)';
  const accentBg = light ? '#f0fdf4' : '#112028';
  const inputBg = light ? '#f8fafc' : '#071317';
  const inputBorder = light ? 'rgba(0,0,0,0.12)' : '#1a3040';

  const update = (patch: Partial<LinkItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));

  const domain = (() => {
    try { return new URL(item.url).hostname.replace('www.', ''); }
    catch { return item.url || 'link'; }
  })();

  return (
    <div className="group relative transition-all duration-200 hover:shadow-2xl" style={{ width: item.width ?? 260 }}>
      <div
        className="rounded-2xl border shadow-xl overflow-hidden transition-colors duration-150"
        style={{ backgroundColor: bg, borderColor: borderBase }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = borderHover)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = borderBase)}
      >
        {/* Top accent strip */}
        {item.topColor
          ? <div style={{ height: 5, backgroundColor: item.topColor }} />
          : <div className="h-0.5 bg-gradient-to-r from-[#7C3AED] to-[#FFBD65]" />
        }

        <div className="p-4">
          {/* Domain row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentBg }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <span className="text-[11px] truncate" style={{ color: mutedColor, maxWidth: 110 }}>
                {domain}
              </span>
            </div>
            <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
              <button
                onClick={() => setEditing(v => !v)}
                className="opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: mutedColor }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#7C3AED'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: mutedColor }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF6B8A'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {editing ? (
            <div
              className="space-y-2"
              onMouseDown={e => e.stopPropagation()}
              onBlur={e => {
                // Only close once focus actually leaves this group of fields —
                // tabbing between url/title/description shouldn't close it.
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEditing(false);
              }}
            >
              <input
                autoFocus
                value={item.url}
                onChange={e => update({ url: e.target.value })}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditing(false)}
                placeholder="https://…"
                className="w-full text-sm px-2.5 py-1.5 rounded-xl outline-none border focus:border-[#7C3AED] transition-colors"
                style={{ backgroundColor: inputBg, color: textColor, borderColor: '#7C3AED', caretColor: '#7C3AED' }}
              />
              <input
                value={item.title}
                onChange={e => update({ title: e.target.value })}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditing(false)}
                placeholder="Title"
                className="w-full text-sm px-2.5 py-1.5 rounded-xl outline-none border transition-colors"
                style={{ backgroundColor: inputBg, color: textColor, borderColor: inputBorder }}
              />
              <input
                value={item.description}
                onChange={e => update({ description: e.target.value })}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditing(false)}
                placeholder="Description"
                className="w-full text-xs px-2.5 py-1.5 rounded-xl outline-none border transition-colors"
                style={{ backgroundColor: inputBg, color: mutedColor, borderColor: inputBorder }}
              />
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold leading-snug mb-1" style={{ color: textColor }}>
                {item.title || 'Untitled link'}
              </h4>
              {item.description && (
                <p className="text-xs leading-relaxed mb-2" style={{ color: mutedColor }}>{item.description}</p>
              )}
              {item.url && item.url !== 'https://' && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseDown={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[#7C3AED] text-xs hover:text-[#FFBD65] transition-colors"
                >
                  Open link
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
