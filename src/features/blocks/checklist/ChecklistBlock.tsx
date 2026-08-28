import { useCallback, useEffect, useRef, useState } from 'react';

import type { BoardItem, ChecklistEntry, ChecklistItem } from '@/entities/board/types';
import ChecklistEntryRow from '@/features/blocks/checklist/ChecklistEntryRow';
import { createChecklistEntry, isLightColor } from '@/features/blocks/checklist/utils/checklistUtils';
import { useChecklistDrag } from '@/features/blocks/checklist/hooks/useChecklistDrag';

interface ChecklistBlockProps {
  item: ChecklistItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onEntryDroppedOutside?: (entry: ChecklistEntry, clientX: number, clientY: number) => void;
}

function DropLine() {
  return (
    <div className="h-1 rounded-full mx-1 my-1" 
         style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 0 8px rgba(124,58,237,0.5)' }}
    />
  );
}

export default function ChecklistBlock({ item, onUpdate, onDelete, onEntryDroppedOutside }: ChecklistBlockProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [newEntryText, setNewEntryText] = useState('');
  
  const addInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const entriesRef = useRef(item.entries);

  entriesRef.current = item.entries;

  useEffect(() => {
    if (addingEntry) addInputRef.current?.focus();
  }, [addingEntry]);

  const light = isLightColor(item.color);
  const textColor = light ? '#1e293b' : '#e8f4f4';
  const mutedColor = light ? 'rgba(30,41,59,0.45)' : 'rgba(232,244,244,0.4)';
  const accentColor = light ? 'var(--color-accent)' : '#e8f4f4';

  const update = useCallback(
    (patch: Partial<ChecklistItem>) => {
      onUpdate((current) => 
        current.type !== 'checklist' ? current : { ...current, ...patch }
      );
    },
    [onUpdate]
  );

  const updateEntries = useCallback(
    (updater: (entries: ChecklistEntry[]) => ChecklistEntry[]) => {
      update({ entries: updater(entriesRef.current) });
    },
    [update]
  );

  const doneCount = item.entries.filter((entry) => entry.done).length;
  const totalCount = item.entries.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const commitNewEntry = useCallback(
    () => {
      const text = newEntryText.trim();
      if (text) {
        updateEntries((entries) => 
          [...entries, createChecklistEntry(text)]
        );
        setNewEntryText('');
        return;
      }
      setAddingEntry(false);
    },
    [newEntryText, updateEntries]
  );

  const { draggingIndex, dropIndex, handleDragStart } = useChecklistDrag({ 
    entries: item.entries, 
    cardRef, 
    rowRefs, 
    updateEntries, 
    onEntryDroppedOutside 
  });

  const toggleEntry = useCallback(
    (entryId: string) => {
      updateEntries((entries) => 
        entries.map(entry => entry.id === entryId ? { ...entry, done: !entry.done } : entry)
      );
    },
    [updateEntries]
  );

  const deleteEntry = useCallback(
    (entryId: string) => {
      updateEntries((entries) => 
        entries.filter(entry => entry.id !== entryId)
      );
    },
    [updateEntries]
  );

  const editEntry = useCallback(
    (entryId: string, text: string) => {
      updateEntries((entries) => 
        entries.map(entry => entry.id === entryId ? { ...entry, text } : entry)
      );
    },
    [updateEntries]
  );

  return (
    <div className="group relative transition-all duration-200 hover:shadow-2xl" style={{ 
        width: item.width ?? 220,
        height: item.height,
       }}>
      <div ref={cardRef} className="rounded-2xl shadow-xl overflow-hidden" style={{ 
          backgroundColor: item.color,
          height: item.height ? '100%' : undefined,
        }}>
        {item.topColor && 
          <div style={{ 
            height: 5, 
            backgroundColor: item.topColor }} />
        }
        
        <div className="flex items-center justify-between px-3 pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input 
                autoFocus
                className="w-full bg-transparent outline-none font-bold text-base" 
                style={{ color: textColor }} 
                value={item.title} 
                onChange={(event) => update({ title: event.target.value })} 
                onBlur={() => setEditingTitle(false)} 
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') setEditingTitle(false); }} 
                onMouseDown={(event) => event.stopPropagation()} 
              />
            ) : (
              <h3 
                className="font-bold text-base leading-snug cursor-text select-none truncate" 
                style={{ color: textColor }}
                onDoubleClick={() => setEditingTitle(true)}
              >{item.title}</h3>
            )}
          </div>

          <button 
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded-full p-0.5 hover:bg-black/10 ml-2"
            style={{ color: mutedColor }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {totalCount > 0 && 
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${textColor}18` }}>
                <div className="h-full rounded-full transition-all duration-500" 
                     style={{
                       width: `${progress}%`,
                       backgroundColor: accentColor,
                       opacity: 0.9
                     }}
                />
              </div>

              <span 
                className="text-[11px] font-mono flex-shrink-0"
                style={{ color: mutedColor }}
              >{doneCount}/{totalCount}</span>
            </div>
          </div>
        }

        <div 
          className="mx-3 mb-2"
          style={{ height: 1, backgroundColor: `${textColor}12` }}
        />

        {/* Entries */}
        
        <div className="px-3 pb-1">
          {item.entries.map(
            (entry, index) => (
              <div key={entry.id}>
                {dropIndex === index && draggingIndex !== null && 
                  draggingIndex !== index && draggingIndex !== index - 1 && 
                  <DropLine />
                }

                <div ref={(element) => {
                  if (element) {
                    rowRefs.current.set(index, element);
                  } else {
                    rowRefs.current.delete(index);
                  }
                }}>
                  <ChecklistEntryRow
                    entry={entry}
                    isDragging={draggingIndex === index}
                    textColor={textColor}
                    accentColor={accentColor}
                    onDragHandleMouseDown={(event) => 
                      handleDragStart(index, event)
                    }
                    onToggle={() => toggleEntry(entry.id)}
                    onDelete={() => deleteEntry(entry.id)}
                    onEdit={(text) => editEntry(entry.id, text)}
                  />
                </div>
              </div>
            )
          )}

          {dropIndex === item.entries.length && 
            draggingIndex !== null &&
            <DropLine />
          }

          {/* Add entry */}

          {addingEntry ? (
            <div className="flex items-center gap-2 py-1" onMouseDown={(event) => event.stopPropagation()}>
              <div className="w-4 h-4 rounded border flex-shrink-0" style={{ borderColor: `${textColor}40` }} />

              <input
                ref={addInputRef}
                value={newEntryText}
                onChange={(event) => setNewEntryText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitNewEntry();
                  if (event.key === 'Escape') { 
                    setAddingEntry(false); 
                    setNewEntryText(''); 
                  }
                }}
                onBlur={commitNewEntry}
                placeholder="New item…" 
                className="flex-1 bg-transparent outline-none text-sm" 
                style={{ color: textColor }} 
              />
            </div>
          ) : (
            <button
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => setAddingEntry(true)}
              className="flex items-center gap-1.5 text-xs py-1.5 w-full transition-opacity hover:opacity-80"
              style={{ color: mutedColor }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
