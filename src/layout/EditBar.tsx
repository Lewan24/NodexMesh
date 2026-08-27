import type { BoardItem, NoteItem, LineItem, FrameItem } from '@/entities/board/types';

// ─── Palettes ────────────────────────────────────────────────────────────────
const LIGHT_BG = ['#ffffff', '#fefce8', '#f0fdf4', '#eff6ff', '#fdf4ff', '#fff7ed', '#f1f5f9', '#fce7f3'];
const DARK_BG  = ['#0d2a35', '#1e1b4b', '#14532d', '#1c1917', '#0c4a6e', '#431407'];
const STRIP_COLORS = ['#7C3AED', '#FFBD65', '#FF6B8A', '#02A0A0', '#059669', '#3b82f6', '#f97316', '#e11d48'];
const LINE_COLORS  = ['#7C3AED', '#FFBD65', '#FF6B8A', '#02A0A0', '#e8f4f4', '#5a8a94'];
type FontSize = 'sm' | 'base' | 'lg';

// Types that support a background fill color
const HAS_BG = new Set(['note', 'checklist', 'link', 'image', 'kanban', 'column', 'text']);

interface Props {
  selectedItems: BoardItem[];
  onUpdateItem: (id: string, fn: (item: BoardItem) => BoardItem) => void;
  onDeleteItems: (ids: string[]) => void;
  onGroupItems: () => void;
  onFitFrame: (id: string) => void;
  onClose: () => void;
  // For items selected inside a column
  columnItem?: BoardItem;
  onUpdateColumnItem?: (fn: (item: BoardItem) => BoardItem) => void;
  onDeleteColumnItem?: () => void;
}

function Divider() {
  return <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />;
}

function Btn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="h-8 min-w-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium transition-colors flex-shrink-0"
      style={{
        backgroundColor: active ? 'rgba(124, 58, 237,0.15)' : 'transparent',
        color: active ? '#7C3AED' : '#4a6070',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.06)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ─── Universal color swatch ───────────────────────────────────────────────────
function Swatch({ color, active, onClick, size = 12 }: { color: string; active?: boolean; onClick: () => void; size?: number }) {
  return (
    <button
      onClick={onClick}
      title={color}
      className="rounded-full border transition-all hover:scale-125 flex-shrink-0"
      style={{
        width: active ? size + 3 : size,
        height: active ? size + 3 : size,
        backgroundColor: color,
        borderColor: active ? '#7C3AED' : 'rgba(0,0,0,0.15)',
        boxShadow: active ? '0 0 0 2px rgba(124, 58, 237,0.4)' : 'none',
      }}
    />
  );
}

// ─── Universal color panel ────────────────────────────────────────────────────
// Shows for every item that supports bg/strip colors
function ColorPanel({
  item,
  onUpdate,
}: {
  item: BoardItem;
  onUpdate: (fn: (i: BoardItem) => BoardItem) => void;
}) {
  const bg = (item as any).color as string | undefined;
  const strip = item.topColor;
  const showBg = HAS_BG.has(item.type);
  // Text is the only type where "no background" (plain heading) is a valid state.
  const canClearBg = item.type === 'text';

  const setColor = (c: string | undefined) => onUpdate(i => ({ ...i, color: c } as BoardItem));
  const setStrip = (c: string | undefined) => onUpdate(i => ({ ...i, topColor: c }));

  return (
    <>
      {showBg && (
        <>
          {/* Light backgrounds */}
          <div className="flex items-center gap-1 px-1">
            {canClearBg && (
              <button
                onClick={() => setColor(undefined)}
                title="No background"
                className="rounded-full flex-shrink-0 transition-all hover:scale-125"
                style={{
                  width: !bg ? 15 : 12,
                  height: !bg ? 15 : 12,
                  border: `1.5px solid ${!bg ? '#7C3AED' : 'rgba(0,0,0,0.2)'}`,
                  boxShadow: !bg ? '0 0 0 2px rgba(124, 58, 237,0.4)' : 'none',
                  backgroundImage: 'linear-gradient(to top right, transparent 46%, #FF6B8A 48%, #FF6B8A 52%, transparent 54%)',
                }}
              />
            )}
            {LIGHT_BG.map(c => (
              <Swatch key={c} color={c} active={bg === c} onClick={() => setColor(c)} />
            ))}
          </div>
          {/* Dark backgrounds */}
          <div className="flex items-center gap-1 px-0.5">
            {DARK_BG.map(c => (
              <Swatch key={c} color={c} active={bg === c} onClick={() => setColor(c)} />
            ))}
          </div>
          <Divider />
        </>
      )}
      {/* Strip accent colors */}
      <div className="flex items-center gap-1 px-1" title="Top accent strip">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mr-0.5" style={{ color: '#9ca3af' }}>
          <rect x="3" y="3" width="18" height="5" rx="1.5" fill="currentColor" />
        </svg>
        {STRIP_COLORS.map(c => (
          <Swatch key={c} color={c} active={strip === c} onClick={() => setStrip(strip === c ? undefined : c)} size={11} />
        ))}
        {strip && (
          <button
            onClick={() => setStrip(undefined)}
            className="ml-0.5 text-xs rounded px-1 py-0.5 flex-shrink-0"
            style={{ color: '#9ca3af', backgroundColor: 'rgba(0,0,0,0.05)' }}
            title="Remove strip"
          >
            ✕
          </button>
        )}
      </div>
    </>
  );
}

// ─── Note-specific text formatting ───────────────────────────────────────────
function NoteTextControls({ item, onUpdate }: { item: NoteItem; onUpdate: (fn: (i: BoardItem) => BoardItem) => void }) {
  const up = (patch: Partial<NoteItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));
  const fs: FontSize = (item.fontSize as FontSize) ?? 'base';

  return (
    <>
      <Divider />
      {(['left', 'center', 'right'] as const).map(a => (
        <Btn key={a} active={(item.textAlign ?? 'left') === a} onClick={() => up({ textAlign: a })} title={`Align ${a}`}>
          {a === 'left'   && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M3 12h12M3 18h15" strokeLinecap="round" /></svg>}
          {a === 'center' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M6 12h12M4 18h16" strokeLinecap="round" /></svg>}
          {a === 'right'  && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M9 12h12M6 18h15" strokeLinecap="round" /></svg>}
        </Btn>
      ))}
      <Divider />
      {(['sm', 'base', 'lg'] as FontSize[]).map(s => (
        <Btn key={s} active={fs === s} onClick={() => up({ fontSize: s })} title={`Size ${s}`}>
          <span style={{ fontSize: s === 'sm' ? 10 : s === 'base' ? 12 : 15 }}>{s === 'sm' ? 'S' : s === 'base' ? 'M' : 'L'}</span>
        </Btn>
      ))}
      <Divider />
      <Btn active={!!item.bold} onClick={() => up({ bold: !item.bold })} title="Bold">
        <span style={{ fontWeight: 800, fontSize: 13 }}>B</span>
      </Btn>
      <Btn active={!!item.italic} onClick={() => up({ italic: !item.italic })} title="Italic">
        <span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 13 }}>I</span>
      </Btn>
    </>
  );
}

// ─── Line controls ────────────────────────────────────────────────────────────
function LineControls({ item, onUpdate }: { item: LineItem; onUpdate: (fn: (i: BoardItem) => BoardItem) => void }) {
  const up = (patch: Partial<LineItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));
  return (
    <>
      <div className="flex items-center gap-1 px-1">
        {LINE_COLORS.map(c => (
          <Swatch key={c} color={c} active={item.color === c} onClick={() => up({ color: c })} />
        ))}
      </div>
      <Divider />
      {[1, 2, 3, 4].map(t => (
        <Btn key={t} active={item.strokeWidth === t} onClick={() => up({ strokeWidth: t })} title={`Thickness ${t}`}>
          <div className="w-5 flex items-center justify-center">
            <div className="w-4 rounded-full" style={{ height: t, backgroundColor: 'currentColor' }} />
          </div>
        </Btn>
      ))}
      <Divider />
      <Btn active={!!item.arrowStart} onClick={() => up({ arrowStart: !item.arrowStart })} title="Arrow at start">← S</Btn>
      <Btn active={!!item.arrowEnd}   onClick={() => up({ arrowEnd: !item.arrowEnd })}   title="Arrow at end">E →</Btn>
    </>
  );
}

// ─── Frame controls ───────────────────────────────────────────────────────────
function FrameControls({ item, onUpdate, onFitFrame }: { item: FrameItem; onUpdate: (fn: (i: BoardItem) => BoardItem) => void; onFitFrame: () => void }) {
  const up = (patch: Partial<FrameItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));
  const FRAME_COLORS = ['#7C3AED', '#FFBD65', '#02A0A0', '#FF6B8A', '#059669', '#3b82f6'];
  return (
    <>
      <div className="flex items-center gap-1 px-1">
        {FRAME_COLORS.map(c => (
          <Swatch key={c} color={c} active={item.color === c} onClick={() => up({ color: c })} />
        ))}
      </div>
      <Divider />
      <button
        onClick={onFitFrame}
        className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        style={{ color: '#4a6070' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.06)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        title="Fit frame to contents"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
        Fit
      </button>
    </>
  );
}

const TYPE_LABEL: Partial<Record<string, string>> = {
  note: 'Note', kanban: 'Kanban', image: 'Image', link: 'Link',
  text: 'Text', frame: 'Frame', checklist: 'Checklist', line: 'Line/Arrow', column: 'Column',
};

export default function EditBar({
  selectedItems, onUpdateItem, onDeleteItems, onGroupItems, onFitFrame, onClose,
  columnItem, onUpdateColumnItem, onDeleteColumnItem,
}: Props) {
  // Column item mode overrides canvas selection
  const activeItem = columnItem ?? (selectedItems.length === 1 ? selectedItems[0] : null);
  const isColumnMode = !!columnItem;
  const isMulti = !isColumnMode && selectedItems.length > 1;
  const single = activeItem;

  if (!columnItem && selectedItems.length === 0) return null;

  const ids = selectedItems.map(i => i.id);

  const handleUpdate = (fn: (i: BoardItem) => BoardItem) => {
    if (isColumnMode && onUpdateColumnItem) {
      onUpdateColumnItem(fn);
    } else if (single) {
      onUpdateItem(single.id, fn);
    }
  };

  const handleDelete = () => {
    if (isColumnMode && onDeleteColumnItem) {
      onDeleteColumnItem();
      onClose();
    } else {
      onDeleteItems(ids);
      onClose();
    }
  };

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-lg select-none"
      style={{
        backgroundColor: 'var(--color-surface-translucent)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
        backdropFilter: 'blur(10px)',
        maxWidth: 'calc(100vw - 120px)',
        flexWrap: 'nowrap',
        overflowX: 'auto',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
        style={{ color: 'var(--color-text-faint)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-faint)'; }}
        title="Deselect (Esc)"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Type label */}
      <span className="text-[11px] font-bold uppercase tracking-widest px-1 flex-shrink-0" style={{ color: 'var(--color-text-faint)' }}>
        {isColumnMode ? TYPE_LABEL[single!.type] ?? single!.type
          : isMulti ? `${selectedItems.length} items`
          : TYPE_LABEL[single?.type ?? ''] ?? single?.type ?? ''}
      </span>

      <Divider />

      {/* Universal color controls */}
      {single && single.type !== 'line' && single.type !== 'frame' && (
        <ColorPanel item={single} onUpdate={handleUpdate} />
      )}

      {/* Type-specific: Note text formatting */}
      {!isMulti && single?.type === 'note' && (
        <NoteTextControls item={single as NoteItem} onUpdate={handleUpdate} />
      )}

      {/* Type-specific: Line */}
      {!isMulti && !isColumnMode && single?.type === 'line' && (
        <LineControls item={single as LineItem} onUpdate={handleUpdate} />
      )}

      {/* Type-specific: Frame */}
      {!isMulti && !isColumnMode && single?.type === 'frame' && (
        <FrameControls
          item={single as FrameItem}
          onUpdate={handleUpdate}
          onFitFrame={() => onFitFrame(single.id)}
        />
      )}

      {/* Multi-select: group */}
      {isMulti && (
        <>
          <button
            onClick={onGroupItems}
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            style={{ color: '#7C3AED', backgroundColor: 'rgba(124, 58, 237,0.1)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(124, 58, 237,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(124, 58, 237,0.1)'; }}
            title="Wrap in a frame"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
            </svg>
            Group
          </button>
        </>
      )}

      <Divider />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
        style={{ color: 'var(--color-text-faint)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,107,138,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-danger-strong)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-faint)'; }}
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isMulti ? `Delete ${selectedItems.length}` : 'Delete'}
      </button>
    </div>
  );
}
