import { useState } from 'react';
import type { TimelineItem, TimelineTask } from '@/entities/board/types';
import type { BlockDeleteHandler, BlockUpdateHandler } from '../types';
import ContentBlockShell from '../shared/ContentBlockShell';
import { dateDay, dayDate, scheduleRange, shiftTask, taskRange, todayDate, reorderTasks } from './timelineUtils';
import '../shared/planning.css';

export default function TimelineBlock({ item, onUpdate, onDelete }: { item: TimelineItem; onUpdate: BlockUpdateHandler; onDelete: BlockDeleteHandler }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [draggedRow, setDraggedRow] = useState<string | null>(null);
  const [dropRow, setDropRow] = useState<string | null>(null);
  const update = (fn: (current: TimelineItem) => TimelineItem) => onUpdate(current => current.type === 'timeline' ? fn(current) : current);
  const updateTask = (id: string, fn: (task: TimelineTask) => TimelineTask) => update(current => ({ ...current, tasks: current.tasks.map(task => task.id === id ? fn(task) : task) }));
  const task = item.tasks.find(task => task.id === selected);
  const range = scheduleRange(item.tasks);
  // Keep multi-year plans bounded while preserving their full date range.
  const dayWidth = Math.min(28, 12000 / range.days);
  const addTask = () => {
    const id = crypto.randomUUID();
    update(current => ({ ...current, tasks: [...current.tasks, { id, title: 'New milestone', start: todayDate(), end: todayDate(), done: false, color: '#7c3aed', checklist: [] }] }));
    setSelected(id); setEditing(true);
  };
  const moveBar = (event: React.PointerEvent<HTMLDivElement>, task: TimelineTask, resize: boolean, bar?: HTMLDivElement) => {
    if (!editing || event.button !== 0) return;
    event.stopPropagation(); event.preventDefault();
    const element = bar ?? event.currentTarget;
    const track = element.parentElement!;
    const scale = track.getBoundingClientRect().width / track.offsetWidth;
    const origin = event.clientX;
    element.setPointerCapture(event.pointerId);
    const onMove = (move: PointerEvent) => {
      const days = Math.round((move.clientX - origin) / (dayWidth * scale));
      element.style.transform = resize ? '' : `translateX(${days * dayWidth}px)`;
      if (resize) element.style.width = `${Math.max(dayWidth, ((taskRange(task)!.end - taskRange(task)!.start + 1) + days) * dayWidth)}px`;
    };
    const finish = (end: PointerEvent) => {
      element.removeEventListener('pointermove', onMove); element.removeEventListener('pointerup', finish); element.removeEventListener('pointercancel', cancel);
      element.style.transform = '';
      element.style.width = `${(taskRange(task)!.end - taskRange(task)!.start + 1) * dayWidth}px`;
      if (end.type !== 'pointercancel') updateTask(task.id, current => shiftTask(current, Math.round((end.clientX - origin) / (dayWidth * scale)), resize));
    };
    const cancel = (event: PointerEvent) => finish(event);
    element.addEventListener('pointermove', onMove); element.addEventListener('pointerup', finish); element.addEventListener('pointercancel', cancel);
  };
  return <ContentBlockShell item={item} onDelete={onDelete} title={<span className="flex items-center justify-between gap-2"><span className="truncate">{item.title}</span><span className="text-xs opacity-50">{item.tasks.filter(task => task.done).length}/{item.tasks.length} done</span></span>}>
    <div className="planning-toolbar" onMouseDown={event => event.stopPropagation()}>
      <button className="planning-button" aria-pressed={item.mode === 'simple'} onClick={() => update(current => ({ ...current, mode: 'simple' }))}>Milestones</button>
      <button className="planning-button" aria-pressed={item.mode === 'schedule'} onClick={() => update(current => ({ ...current, mode: 'schedule' }))}>Schedule</button>
      <button className="planning-button ml-auto" onClick={addTask}>+ Add task</button>
      <button className="planning-button" aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? 'Done editing' : 'Edit timeline'}</button>
    </div>
    <div data-wheel-scroll="true" className="flex-1 min-h-0 overflow-auto">
      {editing && <div className="p-3 border-b" style={{ borderColor: 'var(--color-border)' }} onMouseDown={event => event.stopPropagation()}>
        <input className="planning-input w-full" aria-label="Timeline title" value={item.title} onChange={event => update(current => ({ ...current, title: event.target.value }))} />
        <p className="text-xs text-theme-muted mt-2">Select a task to edit. In Schedule, drag a bar to move it or its right edge to resize.</p>
      </div>}
      {!item.tasks.length && <div className="planning-empty"><p className="font-medium mb-2">Turn your plan into milestones</p><p>Add a date, an outcome and a checklist. Switch to Schedule to plan durations.</p><button className="planning-button mt-4" onMouseDown={event => event.stopPropagation()} onClick={addTask}>+ First milestone</button></div>}
      {item.mode === 'simple' ? <div className="p-5">{[...item.tasks].sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999')).map(task => <article key={task.id} className="timeline-card">
        <span className="timeline-dot" style={{ background: task.done ? '#059669' : task.color }} />
        <div className="text-xs font-medium text-theme-muted mb-1">{task.start || 'Unscheduled'}{task.end && task.end !== task.start ? ` → ${task.end}` : ''}</div>
        <div className="flex gap-2 items-center"><input type="checkbox" aria-label={`Complete ${task.title}`} checked={task.done} onMouseDown={event => event.stopPropagation()} onChange={() => updateTask(task.id, current => ({ ...current, done: !current.done }))} /><h3 className={`font-semibold text-sm ${task.done ? 'line-through opacity-50' : ''}`}>{task.title || 'Untitled task'}</h3>{editing && <button className="planning-button ml-auto" onMouseDown={event => event.stopPropagation()} onClick={() => setSelected(task.id)}>Edit task</button>}</div>
        {task.checklist.map(entry => <label key={entry.id} className="flex gap-2 mt-2 text-xs" onMouseDown={event => event.stopPropagation()}><input type="checkbox" checked={entry.done} onChange={() => updateTask(task.id, current => ({ ...current, checklist: current.checklist.map(check => check.id === entry.id ? { ...check, done: !check.done } : check) }))} /><span className={entry.done ? 'line-through opacity-50' : ''}>{entry.text || 'Checklist item'}</span></label>)}
      </article>)}</div> : item.tasks.length > 0 && <div className="timeline-grid" style={{ width: 180 + range.days * dayWidth }}>
        <div className="timeline-label font-semibold">Task / outcome</div>
        <div className="flex">{Array.from({ length: Math.ceil(range.days / 7) }, (_, index) => <div key={index} className="py-3 px-2 border-b border-r text-theme-muted shrink-0 overflow-hidden" style={{ width: dayWidth * 7, borderColor: 'var(--color-border)' }}>{dayDate(range.start + index * 7)}</div>)}</div>
        {item.tasks.map(task => { const dates = taskRange(task); return <div className="contents" key={task.id}>
          <div className="timeline-label flex items-center gap-1 !p-1" style={{ boxShadow: dropRow === task.id ? 'inset 0 2px var(--color-accent)' : undefined }} onMouseDown={event => event.stopPropagation()}
            onDragOver={event => { if (draggedRow) { event.preventDefault(); setDropRow(task.id); } }}
            onDrop={event => { if (draggedRow) { event.preventDefault(); event.stopPropagation(); update(current => ({ ...current, tasks: reorderTasks(current.tasks, draggedRow, task.id) })); setDraggedRow(null); setDropRow(null); } }}>
            <button className="cursor-grab px-1" draggable aria-label={`Reorder ${task.title}`} title="Drag to reorder · Alt+↑ / Alt+↓" onDragStart={event => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', task.id); setDraggedRow(task.id); }} onDragEnd={() => { setDraggedRow(null); setDropRow(null); }} onKeyDown={event => {
              if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
                event.preventDefault(); event.stopPropagation();
                const target = item.tasks[item.tasks.findIndex(current => current.id === task.id) + (event.key === 'ArrowUp' ? -1 : 1)];
                if (target) update(current => ({ ...current, tasks: reorderTasks(current.tasks, task.id, target.id) }));
              }
            }}>⠿</button>
            <button className="truncate flex-1 text-left py-2" onClick={() => { setSelected(task.id); setEditing(true); }}>{task.done ? '✓ ' : ''}{task.title}</button>
            <div className="flex flex-col text-[10px]">
              {([-1, 1] as const).map(direction => <button key={direction} className="px-1 disabled:opacity-20 cursor-pointer" aria-label={`${direction === -1 ? 'Move up' : 'Move down'} ${task.title}`} disabled={!item.tasks[item.tasks.findIndex(current => current.id === task.id) + direction]} onClick={() => { const target = item.tasks[item.tasks.findIndex(current => current.id === task.id) + direction]; if (target) update(current => ({ ...current, tasks: reorderTasks(current.tasks, task.id, target.id) })); }}>{direction === -1 ? '↑' : '↓'}</button>)}
            </div>
          </div>
          <div className="timeline-track" style={{ backgroundSize: `${dayWidth * 7}px 100%` }}>
            {dates ? <div role="button" tabIndex={0} aria-label={`Move ${task.title}`} title={`${task.start} → ${task.end || task.start} · ${dates.end - dates.start + 1} days`} className="timeline-bar" style={{ left: (dates.start - range.start) * dayWidth, width: (dates.end - dates.start + 1) * dayWidth, background: task.color, opacity: task.done ? .5 : 1 }} onMouseDown={event => event.stopPropagation()} onPointerDown={event => moveBar(event, task, false)} onClick={() => { if (editing) setSelected(task.id); }} onKeyDown={event => { if (editing && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); updateTask(task.id, current => shiftTask(current, event.key === 'ArrowLeft' ? -1 : 1, event.shiftKey)); } }}>
              <span className="block truncate px-2 leading-7 pointer-events-none">{task.title}</span>
              {editing && <div className="absolute right-0 top-0 h-full w-3 cursor-ew-resize rounded-r bg-white/25" title="Drag to change end date" onPointerDown={event => moveBar(event, task, true, event.currentTarget.parentElement as HTMLDivElement)} />}
            </div> : <span className="text-theme-muted px-3 leading-12">Unscheduled — set a start date</span>}
            {dateDay(todayDate())! >= range.start && dateDay(todayDate())! < range.start + range.days && <span className="absolute top-0 bottom-0 w-px bg-rose-400 pointer-events-none" style={{ left: (dateDay(todayDate())! - range.start) * dayWidth }} />}
          </div>
        </div>; })}
      </div>}
      {editing && task && <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }} onMouseDown={event => event.stopPropagation()}>
        <div className="flex gap-2"><input className="planning-input flex-1" aria-label="Task title" value={task.title} onChange={event => updateTask(task.id, current => ({ ...current, title: event.target.value }))} /><input aria-label="Task color" type="color" className="w-8 h-8" value={task.color} onChange={event => updateTask(task.id, current => ({ ...current, color: event.target.value }))} /></div>
        <div className="flex flex-wrap gap-3 text-xs"><label>Start <input className="planning-input" type="date" aria-label="Task start" value={task.start} onChange={event => updateTask(task.id, current => ({ ...current, start: event.target.value, end: current.end < event.target.value ? event.target.value : current.end }))} /></label><label>End <input className="planning-input" type="date" aria-label="Task end" min={task.start} value={task.end} onChange={event => updateTask(task.id, current => ({ ...current, end: event.target.value && event.target.value < current.start ? current.start : event.target.value }))} /></label><label className="flex items-center gap-2"><input type="checkbox" checked={task.done} onChange={event => updateTask(task.id, current => ({ ...current, done: event.target.checked }))} />Done</label></div>
        {task.checklist.map(entry => <div key={entry.id} className="flex items-center gap-2"><input type="checkbox" aria-label="Complete checklist item" checked={entry.done} onChange={event => updateTask(task.id, current => ({ ...current, checklist: current.checklist.map(check => check.id === entry.id ? { ...check, done: event.target.checked } : check) }))} /><input className="planning-input flex-1" aria-label="Checklist item text" value={entry.text} onChange={event => updateTask(task.id, current => ({ ...current, checklist: current.checklist.map(check => check.id === entry.id ? { ...check, text: event.target.value } : check) }))} /><button className="planning-button" aria-label="Remove checklist item" onClick={() => updateTask(task.id, current => ({ ...current, checklist: current.checklist.filter(check => check.id !== entry.id) }))}>×</button></div>)}
        <div className="flex justify-between"><button className="planning-button" onClick={() => updateTask(task.id, current => ({ ...current, checklist: [...current.checklist, { id: crypto.randomUUID(), text: '', done: false }] }))}>+ Checklist item</button><button className="planning-button text-rose-500" onClick={() => { update(current => ({ ...current, tasks: current.tasks.filter(current => current.id !== task.id) })); setSelected(null); }}>Delete task</button></div>
      </div>}
    </div>
  </ContentBlockShell>;
}
