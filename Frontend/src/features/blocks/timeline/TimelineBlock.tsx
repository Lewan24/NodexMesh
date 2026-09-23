import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { readableText } from '../typography/textContrast';
import { getSectionStyle } from '@/features/blocks/typography/sectionTypography';
import { createId } from '@/shared/lib/createId';
import TimelineTaskDialog from './TimelineTaskDialog';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, LayoutList, Pencil, Plus, Rows3 } from 'lucide-react';
import type { TimelineItem, TimelineTask } from '@/entities/board/types';
import type { ProjectParticipant } from '@/entities/project/shareTypes';
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

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

function AssigneeBadge({ participant, compact = false }: { participant?: ProjectParticipant; compact?: boolean }) {
  if (!participant) return null;
  return (
    <span className={`timeline-assignee ${compact ? 'timeline-assignee-compact' : ''}`} title={participant.displayName}>
      <span className="timeline-avatar" aria-hidden="true">
        {initials(participant.displayName)}
      </span>
      {!compact && <span className="truncate">{participant.displayName}</span>}
    </span>
  );
}

export default function TimelineBlock({
  item,
  onUpdate,
  onDelete,
  participants = [],
}: {
  item: TimelineItem;
  onUpdate: BlockUpdateHandler;
  onDelete: BlockDeleteHandler;
  participants?: ProjectParticipant[];
}) {
  useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TimelineTask | null>(null);
  const movedBar = useRef(false);
  const [draggedRow, setDraggedRow] = useState<string | null>(null);
  const [dropRow, setDropRow] = useState<string | null>(null);
  const participantsById = new Map(participants.map((participant) => [participant.userId, participant]));
  const completedTasks = item.tasks.filter((task) => task.done).length;
  const completion = item.tasks.length ? Math.round((completedTasks / item.tasks.length) * 100) : 0;
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
    const id = createId();
    setDraft({
      id,
      title: '',
      start: todayDate(),
      end: todayDate(),
      done: false,
      color: '#7c3aed',
      assigneeUserId: undefined,
      checklist: [],
    });
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
          <span className="truncate" style={getSectionStyle(item.typography, 'title')}>
            {item.title}
          </span>
          <span className="timeline-title-progress">
            <span className="timeline-title-progress-track">
              <span style={{ width: `${completion}%` }} />
            </span>
            {completedTasks}/{item.tasks.length} {' ' + translate('done')}
          </span>
        </span>
      }
    >
      <div className="planning-toolbar timeline-main-toolbar" onMouseDown={(event) => event.stopPropagation()}>
        <div className="timeline-view-switcher" aria-label={translate('Timeline view')}>
          <button
            className="planning-button"
            aria-pressed={item.mode === 'simple'}
            onClick={() => update((current) => ({ ...current, mode: 'simple' }))}
          >
            <LayoutList size={14} /> {translate('Milestones')}
          </button>

          <button
            className="planning-button"
            aria-pressed={item.mode === 'schedule'}
            onClick={() => update((current) => ({ ...current, mode: 'schedule' }))}
          >
            <Rows3 size={14} /> {translate('Schedule')}
          </button>
        </div>

        {item.mode === 'schedule' && (
          <label className="text-xs flex items-center gap-2">
            {translate('Task column')}
            <input
              aria-label={translate('Task column width')}
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
            <button
              className="planning-button"
              onClick={resetHeight}
              title={translate('Reset timeline to automatic height')}
            >
              {translate('Auto-fit')}
            </button>
          )}

          <button className="planning-button timeline-primary-button" onClick={addTask}>
            <Plus size={14} /> {translate('Add task')}
          </button>

          <button className="planning-button" aria-pressed={editing} onClick={() => setEditing(!editing)}>
            {editing ? <Check size={14} /> : <Pencil size={14} />}
            {editing ? translate('Done editing') : translate('Edit timeline')}
          </button>
        </div>
      </div>
      {item.mode === 'schedule' && (
        <div className="planning-toolbar" onMouseDown={(event) => event.stopPropagation()}>
          <button
            className="planning-button"
            aria-label={translate('Previous week')}
            onClick={() => scrollToDay(windowStart - 7)}
          >
            {translate('← Week')}
          </button>
          <button
            className="planning-button"
            aria-label={translate('Next week')}
            onClick={() => scrollToDay(windowStart + 7)}
          >
            {translate('Week →')}
          </button>
          <button className="planning-button" onClick={() => scrollToDay(dateDay(todayDate())!)}>
            <CalendarDays size={14} /> {translate('Today')}
          </button>
          <label className="text-xs">
            {translate('Go to date')}{' '}
            <input
              aria-label={translate('Timeline visible date')}
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
            {visibleTasks.length}/{item.tasks.length} {' ' + translate('tasks ·') + ' '}
            {dayDate(windowStart)} – {dayDate(windowEnd)}
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
              aria-label={translate('Timeline title')}
              value={item.title}
              onChange={(event) => update((current) => ({ ...current, title: event.target.value }))}
            />
            <p className="text-xs text-theme-muted mt-2">
              {translate('Select a task to edit. In Schedule, drag a bar to move it or its right edge to resize.')}
            </p>
          </div>
        )}
        {!item.tasks.length && (
          <div className="planning-empty">
            <p className="font-medium mb-2">{translate('Turn your plan into milestones')}</p>
            <p>{translate('Add a date, an outcome and a checklist. Switch to Schedule to plan durations.')}</p>
            <button className="planning-button mt-4" onMouseDown={(event) => event.stopPropagation()} onClick={addTask}>
              {translate('+ First milestone')}
            </button>
          </div>
        )}
        {item.mode === 'simple' ? (
          <div className="timeline-milestone-list">
            {item.tasks.map((task, index) => (
              <article key={task.id} className="timeline-card">
                {editing && (
                  <div
                    className="absolute right-2 top-2 z-10 flex gap-1"
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    {([-1, 1] as const).map((direction) => (
                      <button
                        key={direction}
                        className="planning-button"
                        aria-label={`${direction === -1 ? translate('Move up') : translate('Move down')} ${task.title}`}
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
                )}
                <span className="timeline-dot" style={{ background: task.done ? '#059669' : task.color }} />
                <div className="timeline-card-date" style={getSectionStyle(item.typography, 'labels')}>
                  {task.start || 'Unscheduled'}
                  {task.end && task.end !== task.start ? ` → ${task.end}` : ''}
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    aria-label={translate('Complete {{value1}}', { value1: task.title })}
                    checked={task.done}
                    onMouseDown={(event) => event.stopPropagation()}
                    onChange={() => updateTask(task.id, (current) => ({ ...current, done: !current.done }))}
                    style={getSectionStyle(item.typography, 'body')}
                  />
                  <h3
                    className={`timeline-card-title ${task.done ? 'line-through opacity-60' : ''}`}
                    style={getSectionStyle(item.typography, 'body')}
                  >
                    {task.title || translate('Untitled task')}
                  </h3>
                  {
                    <button
                      className="planning-button ml-auto"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={() => setDraft({ ...task, checklist: task.checklist.map((entry) => ({ ...entry })) })}
                    >
                      {translate('Edit task')}
                    </button>
                  }
                </div>
                <div className="timeline-card-meta">
                  <AssigneeBadge participant={participantsById.get(task.assigneeUserId ?? '')} />
                  {!!task.checklist.length && (
                    <span className="timeline-checklist-progress">
                      <Check size={12} /> {task.checklist.filter((entry) => entry.done).length}/{task.checklist.length}
                    </span>
                  )}
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
                    <span className={entry.done ? 'line-through' : ''} style={getSectionStyle(item.typography, 'body')}>
                      {entry.text || translate('Checklist item')}
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
              <div className="timeline-label timeline-grid-header">{translate('Task / outcome')}</div>
              <div className="flex timeline-grid-header">
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
                  {translate('No tasks in this period')}
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
                        aria-label={translate('Reorder {{value1}}', { value1: task.title })}
                        title={translate('Drag to reorder · Alt+↑ / Alt+↓')}
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
                        className="timeline-row-title flex-1 text-left py-2"
                        onClick={() => {
                          setDraft({ ...task, checklist: task.checklist.map((entry) => ({ ...entry })) });
                          setEditing(true);
                        }}
                        style={getSectionStyle(item.typography, 'body')}
                      >
                        {task.done ? '✓ ' : ''}
                        {task.title}
                      </button>
                      <AssigneeBadge participant={participantsById.get(task.assigneeUserId ?? '')} compact />
                      <div className="flex flex-col text-[10px]" style={getSectionStyle(item.typography, 'labels')}>
                        {([-1, 1] as const).map((direction) => (
                          <button
                            key={direction}
                            className="px-1 disabled:opacity-20 cursor-pointer"
                            aria-label={`${direction === -1 ? translate('Move up') : translate('Move down')} ${task.title}`}
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
                          aria-label={translate('Move {{value1}}', { value1: task.title })}
                          title={translate('{{value1}} → {{value2}} · {{value3}} days', {
                            value1: task.start,
                            value2: task.end || task.start,
                            value3: dates.end - dates.start + 1,
                          })}
                          className="timeline-bar"
                          style={{
                            left: (dates.start - range.start) * dayWidth,
                            width: (dates.end - dates.start + 1) * dayWidth,
                            background: task.color,
                            color: readableText(task.color),
                            textDecoration: task.done ? 'line-through' : undefined,
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
                          <span
                            className="block truncate px-2 pr-8 leading-7 pointer-events-none"
                            style={getSectionStyle(item.typography, 'body')}
                          >
                            {task.title}
                          </span>
                          <span className="timeline-bar-avatar">
                            <AssigneeBadge participant={participantsById.get(task.assigneeUserId ?? '')} compact />
                          </span>
                          {editing && (
                            <div
                              className="absolute right-0 top-0 h-full w-3 cursor-ew-resize rounded-r bg-white/25"
                              title={translate('Drag to change end date')}
                              onPointerDown={(event) =>
                                moveBar(event, task, true, event.currentTarget.parentElement as HTMLDivElement)
                              }
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-theme-muted px-3 leading-12">
                          {translate('Unscheduled — set a start date')}
                        </span>
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
          participants={participants}
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
