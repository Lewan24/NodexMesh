import { useState, useRef, useEffect } from 'react';
import type { ChecklistItem, ChecklistEntry, BoardItem } from '../types';

const uid = () => Math.random().toString(36).slice(2, 9);

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

interface EntryRowProps {
  entry: ChecklistEntry;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
  textColor: string;
  accentColor: string;
}

function EntryRow({ entry, onToggle, onDelete, onEdit, textColor, accentColor }: EntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = () => { onEdit(text); setEditing(false); };

  return (
    <div className="group/entry flex items-center gap-2 py-1">
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={onToggle}
        className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-200 border"
        style={{
          borderColor: entry.done ? accentColor : `${textColor}40`,
          backgroundColor: entry.done ? accentColor : 'transparent',
        }}
      >
        {entry.done && (
          <svg viewBox="0 0 10 10" fill="none" width="8" height="8">
            <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: textColor }}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commit(); }}
          onMouseDown={e => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-sm leading-snug select-none cursor-text transition-all duration-150"
          style={{
            color: entry.done ? `${textColor}55` : textColor,
            textDecoration: entry.done ? 'line-through' : 'none',
          }}
          onDoubleClick={() => setEditing(true)}
        >
          {entry.text || <span style={{ opacity: 0.4 }}>Untitled</span>}
        </span>
      )}

      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={onDelete}
        className="opacity-0 group-hover/entry:opacity-100 flex-shrink-0 transition-opacity"
        style={{ color: `${textColor}55` }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface Props {
  item: ChecklistItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
}

export default function ChecklistBlock({ item, onUpdate, onDelete }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [newText, setNewText] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingEntry) addInputRef.current?.focus(); }, [addingEntry]);

  const light = isLight(item.color);
  const textColor = light ? '#1e293b' : '#e8f4f4';
  const mutedColor = light ? 'rgba(30,41,59,0.45)' : 'rgba(232,244,244,0.4)';
  const accentColor = light ? '#7C3AED' : '#e8f4f4';

  const update = (patch: Partial<ChecklistItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));
  const updateEntries = (fn: (entries: ChecklistEntry[]) => ChecklistEntry[]) =>
    update({ entries: fn(item.entries) });

  const done = item.entries.filter(e => e.done).length;
  const total = item.entries.length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const commitNew = () => {
    if (newText.trim()) {
      updateEntries(entries => [...entries, { id: uid(), text: newText.trim(), done: false }]);
      setNewText('');
    } else {
      setAddingEntry(false);
    }
  };

  return (
    <div className="group relative transition-all duration-200 hover:shadow-2xl" style={{ width: item.width ?? 220 }}>
      <div className="rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: item.color }}>
        {/* Top accent strip */}
        {item.topColor && (
          <div style={{ height: 5, backgroundColor: item.topColor }} />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                className="w-full bg-transparent outline-none font-bold text-base"
                style={{ color: textColor }}
                value={item.title}
                onChange={e => update({ title: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingTitle(false)}
                onMouseDown={e => e.stopPropagation()}
              />
            ) : (
              <h3
                className="font-bold text-base leading-snug cursor-text select-none truncate"
                style={{ color: textColor }}
                onDoubleClick={() => setEditingTitle(true)}
              >
                {item.title}
              </h3>
            )}
          </div>

          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded-full p-0.5 hover:bg-black/10 ml-2"
            style={{ color: mutedColor }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${textColor}18` }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: accentColor, opacity: 0.9 }}
                />
              </div>
              <span className="text-[11px] font-mono flex-shrink-0" style={{ color: mutedColor }}>
                {done}/{total}
              </span>
            </div>
          </div>
        )}

        <div className="mx-3 mb-2" style={{ height: 1, backgroundColor: `${textColor}12` }} />

        {/* Entries */}
        <div className="px-3 pb-1">
          {item.entries.map(entry => (
            <EntryRow
              key={entry.id}
              entry={entry}
              textColor={textColor}
              accentColor={accentColor}
              onToggle={() => updateEntries(entries =>
                entries.map(e => e.id === entry.id ? { ...e, done: !e.done } : e)
              )}
              onDelete={() => updateEntries(entries => entries.filter(e => e.id !== entry.id))}
              onEdit={text => updateEntries(entries =>
                entries.map(e => e.id === entry.id ? { ...e, text } : e)
              )}
            />
          ))}

          {addingEntry ? (
            <div className="flex items-center gap-2 py-1" onMouseDown={e => e.stopPropagation()}>
              <div className="w-4 h-4 rounded border flex-shrink-0" style={{ borderColor: `${textColor}40` }} />
              <input
                ref={addInputRef}
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitNew();
                  if (e.key === 'Escape') { setAddingEntry(false); setNewText(''); }
                }}
                onBlur={commitNew}
                placeholder="New item…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: textColor }}
              />
            </div>
          ) : (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setAddingEntry(true)}
              className="flex items-center gap-1.5 text-xs py-1.5 w-full transition-opacity hover:opacity-80"
              style={{ color: mutedColor }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add item
            </button>
          )}
        </div>

        <div className="pb-2" />
      </div>
    </div>
  );
}
