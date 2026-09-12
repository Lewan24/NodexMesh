import TimelineTaskDialog from './TimelineTaskDialog';
import { useEffect, useRef, useState } from 'react';
import type { TimelineItem, TimelineTask } from '@/entities/board/types';
import type { BlockDeleteHandler, BlockUpdateHandler } from '../types';
import ContentBlockShell from '../shared/ContentBlockShell';
import {
  dateDay,
  dayDate,
  scheduleRange,
  shiftTask,
  taskRange,
  todayDate,
  reorderTasks,
  tasksInWindow,
} from './timelineUtils';
import '../shared/planning.css';

export default function TimelineBlock({
  item,
  onUpdate,
  onDelete,
}: {
  item: TimelineItem;
  onUpdate: BlockUpdateHandler;
  onDelete: BlockDeleteHandler;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TimelineTask | null>(null);
  const movedBar = useRef(false);
  const [draggedRow, setDraggedRow] = useState<string | null>(null);
  const [dropRow, setDropRow] = useState<string | null>(null);
  const update = (fn: (current: TimelineItem) => TimelineItem) =>
    onUpdate((current) => (current.type === 'timeline' ? fn(current) : current));
  const resetHeight = () => {
    update((current) => ({ ...current, height: undefined }));
  };
  const updateTask = (id: string, fn: (task: TimelineTask) => TimelineTask) =>
    update((current) => ({ ...current, tasks: current.tasks.map((task) => (task.id === id ? fn(task) : task)) }));

  const [requestedDay, setRequestedDay] = useState<number | null>(null);
  const fullRange = scheduleRange(item.tasks);
  const range = { start: Math.min(fullRange.start, requestedDay ?? fullRange.start), days: 0 };
  range.days = Math.max(fullRange.start + fullRange.days, (requestedDay ?? fullRange.start) + 28) - range.start;
  const dayWidth = 28;
  const viewport = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({ left: 0, width: 600 });
  const columnWidth = item.taskColumnWidth ?? 180;
  const windowStart = range.start + Math.floor(windowSize.left / dayWidth);
  const windowEnd =
    range.start + Math.ceil((windowSize.left + Math.max(dayWidth, windowSize.width - columnWidth)) / dayWidth) - 1;
  const visibleTasks = tasksInWindow(item.tasks, windowStart, windowEnd);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => setWindowSize({ left: element.scrollLeft, width: element.clientWidth });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [item.mode]);
  useEffect(() => {
    if (requestedDay !== null)
      viewport.current?.scrollTo({ left: Math.max(0, (requestedDay - range.start) * dayWidth), behavior: 'smooth' });
  }, [requestedDay, range.start]);
  const scrollToDay = (day: number) => {
    setRequestedDay(day);
    viewport.current?.scrollTo({ left: Math.max(0, (day - range.start) * dayWidth), behavior: 'smooth' });
  };
  const addTask = () => {
    const id = crypto.randomUUID();
    setDraft({ id, title: '', start: todayDate(), end: todayDate(), done: false, color: '#7c3aed', checklist: [] });
  };
  const moveBar = (
    event: React.PointerEvent<HTMLDivElement>,
    task: TimelineTask,
    resize: boolean,
    bar?: HTMLDivElement,
  ) => {
    if (!editing || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const element = bar ?? event.currentTarget;
    const track = element.parentElement!;
    const scale = track.getBoundingClientRect().width / track.offsetWidth;
    const origin = event.clientX;
    movedBar.current = false;
    element.setPointerCapture(event.pointerId);
    const onMove = (move: PointerEvent) => {
      const days = Math.round((move.clientX - origin) / (dayWidth * scale));
      if (Math.abs(move.clientX - origin) > 3) movedBar.current = true;
      element.style.transform = resize ? '' : `translateX(${days * dayWidth}px)`;
      if (resize)
        element.style.width = `${Math.max(dayWidth, (taskRange(task)!.end - taskRange(task)!.start + 1 + days) * dayWidth)}px`;
    };
    const finish = (end: PointerEvent) => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', finish);
      element.removeEventListener('pointercancel', cancel);
      element.style.transform = '';
      element.style.width = `${(taskRange(task)!.end - taskRange(task)!.start + 1) * dayWidth}px`;
      if (end.type !== 'pointercancel' && movedBar.current)
        updateTask(task.id, (current) =>
          shiftTask(current, Math.round((end.clientX - origin) / (dayWidth * scale)), resize),
        );
    };
    const cancel = (event: PointerEvent) => finish(event);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', finish);
    element.addEventListener('pointercancel', cancel);
  };
  return (
    <ContentBlockShell
      item={item}
      onDelete={onDelete}
      title={
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">{item.title}</span>
          <span className="text-xs opacity-50">
            {item.tasks.filter((task) => task.done).length}/{item.tasks.length} done
          </span>
        </span>
      }
    >
      <div className="planning-toolbar" onMouseDown={(event) => event.stopPropagation()}>
        <button
          className="planning-button"
          aria-pressed={item.mode === 'simple'}
          onClick={() => update((current) => ({ ...current, mode: 'simple' }))}
        >
          Milestones
        </button>

        <button
          className="planning-button"
          aria-pressed={item.mode === 'schedule'}
          onClick={() => update((current) => ({ ...current, mode: 'schedule' }))}
        >
          Schedule
        </button>

        {item.mode === 'schedule' && (
          <label className="text-xs flex items-center gap-2">
            Task column
            <input
              aria-label="Task column width"
              type="range"
              min="160"
              max="600"
              step="16"
              value={item.taskColumnWidth ?? 180}
              disabled={item.locked}
              onChange={(event) => update((current) => ({ ...current, taskColumnWidth: Number(event.target.value) }))}
            />
          </label>
        )}
        <div className="ml-auto flex items-center gap-2">
          {item.height && (
            <button className="planning-button" onClick={resetHeight} title="Reset timeline to automatic height">
              Auto-fit
            </button>
          )}

          <button className="planning-button" onClick={addTask}>
            + Add task
          </button>

          <button className="planning-button" aria-pressed={editing} onClick={() => setEditing(!editing)}>
            {editing ? 'Done editing' : 'Edit timeline'}
          </button>
        </div>
      </div>
      {item.mode === 'schedule' && (
        <div className="planning-toolbar" onMouseDown={(event) => event.stopPropagation()}>
          <button className="planning-button" aria-label="Previous week" onClick={() => scrollToDay(windowStart - 7)}>
            ← Week
          </button>
          <button className="planning-button" aria-label="Next week" onClick={() => scrollToDay(windowStart + 7)}>
            Week →
          </button>
          <button className="planning-button" onClick={() => scrollToDay(dateDay(todayDate())!)}>
            Today
          </button>
          <label className="text-xs">
            Go to date{' '}
            <input
              aria-label="Timeline visible date"
              type="date"
              className="planning-input"
              value={dayDate(windowStart)}
              onChange={(event) => {
                const day = dateDay(event.target.value);
                if (day !== null) scrollToDay(day);
              }}
            />
          </label>
          <span className="text-xs">
            {visibleTasks.length}/{item.tasks.length} tasks · {dayDate(windowStart)} – {dayDate(windowEnd)}
          </span>
        </div>
      )}
      <div
        ref={viewport}
        onScroll={(event) =>
          setWindowSize({ left: event.currentTarget.scrollLeft, width: event.currentTarget.clientWidth })
        }
        style={item.mode === 'schedule' ? { overflow: 'auto', flex: item.height ? '1 1 0%' : 'none' } : undefined}
        data-wheel-scroll={item.mode === 'schedule' || item.height ? 'true' : 'false'}
        className={`flex-1 min-h-0 ${item.height ? 'overflow-auto' : 'overflow-visible'}`}
      >
        {editing && (
          <div
            className="p-3 border-b"
            style={{ borderColor: 'var(--color-border)' }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <input
              className="planning-input w-full"
              aria-label="Timeline title"
              value={item.title}
              onChange={(event) => update((current) => ({ ...current, title: event.target.value }))}
            />
            <p className="text-xs text-theme-muted mt-2">
              Select a task to edit. In Schedule, drag a bar to move it or its right edge to resize.
            </p>
          </div>
        )}
        {!item.tasks.length && (
          <div className="planning-empty">
            <p className="font-medium mb-2">Turn your plan into milestones</p>
            <p>Add a date, an outcome and a checklist. Switch to Schedule to plan durations.</p>
            <button className="planning-button mt-4" onMouseDown={(event) => event.stopPropagation()} onClick={addTask}>
              + First milestone
            </button>
          </div>
        )}
        {item.mode === 'simple' ? (
          <div className="p-5">
            {item.tasks.map((task, index) => (
              <article key={task.id} className="timeline-card pr-20">
                <div
                  className="absolute right-0 top-0 z-10 flex gap-1"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  {([-1, 1] as const).map((direction) => (
                    <button
                      key={direction}
                      className="planning-button"
                      aria-label={`${direction === -1 ? 'Move up' : 'Move down'} ${task.title}`}
                      disabled={!item.tasks[index + direction]}
                      onClick={() =>
                        update((current) => ({
                          ...current,
                          tasks: reorderTasks(current.tasks, task.id, item.tasks[index + direction]!.id),
                        }))
                      }
                    >
                      {direction === -1 ? '↑' : '↓'}
                    </button>
                  ))}
                </div>
                <span className="timeline-dot" style={{ background: task.done ? '#059669' : task.color }} />
                <div className="text-xs font-medium text-theme-muted mb-1">
                  {task.start || 'Unscheduled'}
                  {task.end && task.end !== task.start ? ` → ${task.end}` : ''}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    aria-label={`Complete ${task.title}`}
                    checked={task.done}
                    onMouseDown={(event) => event.stopPropagation()}
                    onChange={() => updateTask(task.id, (current) => ({ ...current, done: !current.done }))}
                  />
                  <h3 className={`font-semibold text-sm ${task.done ? 'line-through opacity-50' : ''}`}>
                    {task.title || 'Untitled task'}
                  </h3>
                  {
                    <button
                      className="planning-button ml-auto"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={() => setDraft({ ...task, checklist: task.checklist.map((entry) => ({ ...entry })) })}
                    >
                      Edit task
                    </button>
                  }
                </div>
                {task.checklist.map((entry) => (
                  <label
                    key={entry.id}
                    className="flex gap-2 mt-2 text-xs"
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={entry.done}
                      onChange={() =>
                        updateTask(task.id, (current) => ({
                          ...current,
                          checklist: current.checklist.map((check) =>
                            check.id === entry.id ? { ...check, done: !check.done } : check,
                          ),
                        }))
                      }
                    />
                    <span className={entry.done ? 'line-through opacity-50' : ''}>
                      {entry.text || 'Checklist item'}
                    </span>
                  </label>
                ))}
              </article>
            ))}
          </div>
        ) : (
          item.tasks.length > 0 && (
            <div
              className="timeline-grid"
              style={{
                width: (item.taskColumnWidth ?? 180) + range.days * dayWidth,
                gridTemplateColumns: `${item.taskColumnWidth ?? 180}px 1fr`,
              }}
            >
              <div className="timeline-label font-semibold">Task / outcome</div>
              <div className="flex">
                {Array.from({ length: Math.ceil(range.days / 7) }, (_, index) => (
                  <div
                    key={index}
                    className="py-3 px-2 border-b border-r text-theme-muted shrink-0 overflow-hidden"
                    style={{ width: dayWidth * 7, borderColor: 'var(--color-border)' }}
                  >
                    {dayDate(range.start + index * 7)}
                  </div>
                ))}
              </div>
              {!visibleTasks.length && (
                <div className="timeline-label" style={{ gridColumn: 1 }}>
                  No tasks in this period
                </div>
              )}
              {visibleTasks.map((task) => {
                const dates = taskRange(task);
                return (
                  <div className="contents" key={task.id}>
                    <div
                      className="timeline-label flex items-center gap-1 !p-1"
                      style={{ boxShadow: dropRow === task.id ? 'inset 0 2px var(--color-accent)' : undefined }}
                      onMouseDown={(event) => event.stopPropagation()}
                      onDragOver={(event) => {
                        if (draggedRow) {
                          event.preventDefault();
                          setDropRow(task.id);
                        }
                      }}
                      onDrop={(event) => {
                        if (draggedRow) {
                          event.preventDefault();
                          event.stopPropagation();
                          update((current) => ({
                            ...current,
                            tasks: reorderTasks(current.tasks, draggedRow, task.id),
                          }));
                          setDraggedRow(null);
                          setDropRow(null);
                        }
                      }}
                    >
                      <button
                        className="cursor-grab px-1"
                        draggable
                        aria-label={`Reorder ${task.title}`}
                        title="Drag to reorder · Alt+↑ / Alt+↓"
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', task.id);
                          setDraggedRow(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggedRow(null);
                          setDropRow(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
                            event.preventDefault();
                            event.stopPropagation();
                            const target =
                              item.tasks[
                                item.tasks.findIndex((current) => current.id === task.id) +
                                  (event.key === 'ArrowUp' ? -1 : 1)
                              ];
                            if (target)
                              update((current) => ({
                                ...current,
                                tasks: reorderTasks(current.tasks, task.id, target.id),
                              }));
                          }
                        }}
                      >
                        ⠿
                      </button>
                      <button
                        className="truncate flex-1 text-left py-2"
                        onClick={() => {
                          setDraft({ ...task, checklist: task.checklist.map((entry) => ({ ...entry })) });
                          setEditing(true);
                        }}
                      >
                        {task.done ? '✓ ' : ''}
                        {task.title}
                      </button>
                      <div className="flex flex-col text-[10px]">
                        {([-1, 1] as const).map((direction) => (
                          <button
                            key={direction}
                            className="px-1 disabled:opacity-20 cursor-pointer"
                            aria-label={`${direction === -1 ? 'Move up' : 'Move down'} ${task.title}`}
                            disabled={
                              !item.tasks[item.tasks.findIndex((current) => current.id === task.id) + direction]
                            }
                            onClick={() => {
                              const target =
                                item.tasks[item.tasks.findIndex((current) => current.id === task.id) + direction];
                              if (target)
                                update((current) => ({
                                  ...current,
                                  tasks: reorderTasks(current.tasks, task.id, target.id),
                                }));
                            }}
                          >
                            {direction === -1 ? '↑' : '↓'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div
                      className="timeline-track"
                      style={{ overflow: 'hidden', backgroundSize: `${dayWidth * 7}px 100%` }}
                    >
                      {dates ? (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`Move ${task.title}`}
                          title={`${task.start} → ${task.end || task.start} · ${dates.end - dates.start + 1} days`}
                          className="timeline-bar"
                          style={{
                            left: (dates.start - range.start) * dayWidth,
                            width: (dates.end - dates.start + 1) * dayWidth,
                            background: task.color,
                            opacity: task.done ? 0.5 : 1,
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          onPointerDown={(event) => moveBar(event, task, false)}
                          onClick={() => {
                            if (!movedBar.current)
                              setDraft({ ...task, checklist: task.checklist.map((entry) => ({ ...entry })) });
                            movedBar.current = false;
                          }}
                          onKeyDown={(event) => {
                            if (editing && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                              event.preventDefault();
                              event.stopPropagation();
                              updateTask(task.id, (current) =>
                                shiftTask(current, event.key === 'ArrowLeft' ? -1 : 1, event.shiftKey),
                              );
                            }
                          }}
                        >
                          <span className="block truncate px-2 leading-7 pointer-events-none">{task.title}</span>
                          {editing && (
                            <div
                              className="absolute right-0 top-0 h-full w-3 cursor-ew-resize rounded-r bg-white/25"
                              title="Drag to change end date"
                              onPointerDown={(event) =>
                                moveBar(event, task, true, event.currentTarget.parentElement as HTMLDivElement)
                              }
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-theme-muted px-3 leading-12">Unscheduled — set a start date</span>
                      )}
                      {dateDay(todayDate())! >= range.start && dateDay(todayDate())! < range.start + range.days && (
                        <span
                          className="absolute top-0 bottom-0 w-px bg-rose-400 pointer-events-none"
                          style={{ left: (dateDay(todayDate())! - range.start) * dayWidth }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
      {draft && (
        <TimelineTaskDialog
          task={draft}
          isNew={!item.tasks.some((task) => task.id === draft.id)}
          onClose={() => setDraft(null)}
          onSave={(task) => {
            update((current) => ({
              ...current,
              tasks: current.tasks.some((entry) => entry.id === task.id)
                ? current.tasks.map((entry) => (entry.id === task.id ? task : entry))
                : [...current.tasks, task],
            }));
            setDraft(null);
          }}
          onDelete={() => {
            update((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== draft.id) }));
            setDraft(null);
          }}
        />
      )}
    </ContentBlockShell>
  );
}
