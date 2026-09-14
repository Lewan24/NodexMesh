import { useEffect, useMemo, useRef, useState } from 'react';
import type { MindmapItem, MindmapNode } from '@/entities/board/types';
import type { BlockDeleteHandler, BlockUpdateHandler } from '../types';
import Modal from '@/shared/components/dialogs/Modal';
import ContentBlockShell from '../shared/ContentBlockShell';
import { addMindmapNode, layoutMindmap, mindmapSiblings, moveMindmapNode, subtreeIds } from './mindmapUtils';
import '../shared/planning.css';
import './mindmap.css';

export default function MindmapBlock({
  item,
  onUpdate,
  onDelete,
}: {
  item: MindmapItem;
  onUpdate: BlockUpdateHandler;
  onDelete: BlockDeleteHandler;
}) {
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(item.nodes[0]?.id);
  const [zoom, setZoom] = useState(1);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLTextAreaElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const graph = useMemo(() => layoutMindmap(item.nodes, item.layout), [item.nodes, item.layout]);
  const positions = new Map(graph.nodes.map((node) => [node.id, node]));
  const selected = item.nodes.find((node) => node.id === selectedId) ?? item.nodes[0];
  const branch = selected && positions.get(selected.id);
  const descendants = selected ? subtreeIds(item.nodes, selected.id) : new Set<string>();
  const siblings = selected ? mindmapSiblings(item.nodes, selected) : [];
  const siblingIndex = siblings.findIndex((node) => node.id === selected?.id);
  const draggedSubtree = useMemo(
    () => (dragId ? subtreeIds(item.nodes, dragId) : new Set<string>()),
    [item.nodes, dragId],
  );
  useEffect(() => {
    if (editing) selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [editing, selected?.id, branch?.x, branch?.y, zoom]);
  const fit = () => {
    const canvas = canvasRef.current;
    if (canvas)
      setZoom(
        Math.max(
          0.01,
          Math.min(1.5, (canvas.clientWidth - 64) / graph.width, (canvas.clientHeight - 64) / graph.height),
        ),
      );
  };
  const update = (patch: Partial<MindmapItem>) =>
    onUpdate((current) => (current.type === 'mindmap' ? { ...current, ...patch } : current));
  const updateNode = (patch: Partial<MindmapNode>) =>
    update({ nodes: item.nodes.map((node) => (node.id === selected?.id ? { ...node, ...patch } : node)) });
  const add = (sibling: boolean) => {
    if (!selected) return;
    const nodes = addMindmapNode(item.nodes, selected.id, sibling);
    const existingIds = new Set(item.nodes.map((node) => node.id));
    const node = nodes.find((entry) => !existingIds.has(entry.id));
    if (!node) return;
    update({ nodes });
    setSelectedId(node.id);
  };
  const reorder = (offset: number) => {
    if (!selected?.parentId) return;
    const target = siblings[siblingIndex + offset];
    if (!target) return;
    update({
      nodes: moveMindmapNode(
        item.nodes,
        selected.id,
        selected.parentId,
        offset < 0 ? target.id : siblings[siblingIndex + 2]?.id,
      ),
    });
  };
  const remove = () => {
    if (!selected?.parentId) return;
    update({ nodes: item.nodes.filter((node) => !descendants.has(node.id)) });
    setSelectedId(selected.parentId);
  };
  const map = (interactive: boolean) => (
    <svg
      className="mindmap-svg"
      viewBox={`0 0 ${graph.width} ${graph.height}`}
      style={
        interactive ? { width: graph.width * zoom, height: graph.height * zoom } : { width: '100%', height: '100%' }
      }
      role="group"
      aria-label={item.title}
    >
      {graph.nodes.map((node) => {
        const parent = node.parentId ? positions.get(node.parentId) : undefined;
        if (!parent) return null;
        const horizontal = item.layout === 'horizontal';
        const d = node.direction;
        const sx = parent.x + (horizontal ? d * 90 : 0);
        const sy = parent.y + (horizontal ? 0 : d * 32);
        const tx = node.x - (horizontal ? d * 90 : 0);
        const ty = node.y - (horizontal ? 0 : d * 32);
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        const path =
          item.lineStyle === 'straight'
            ? `M${sx},${sy} L${tx},${ty}`
            : item.lineStyle === 'elbow'
              ? horizontal
                ? `M${sx},${sy} H${mx} V${ty} H${tx}`
                : `M${sx},${sy} V${my} H${tx} V${ty}`
              : horizontal
                ? `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`
                : `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
        return (
          <path
            key={node.id}
            d={path}
            fill="none"
            stroke={node.color}
            strokeWidth={item.lineWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={item.dashed ? '8 6' : undefined}
          />
        );
      })}
      {graph.nodes.map((node) => (
        <foreignObject key={node.id} x={node.x - 90} y={node.y - 32} width={180} height={64}>
          <button
            ref={interactive && selected?.id === node.id ? selectedRef : undefined}
            className="mindmap-node"
            data-drop-target={(interactive && dropId === node.id) || undefined}
            style={{
              background: node.background,
              color: node.textColor,
              borderRadius: node.parentId ? 8 : 32,
              outlineColor: node.color,
              borderColor: node.color,
            }}
            tabIndex={interactive ? 0 : -1}
            aria-pressed={interactive && selected?.id === node.id}
            title={node.label || 'Untitled idea'}
            draggable={interactive && node.parentId !== null}
            onClick={() => {
              if (interactive) setSelectedId(node.id);
            }}
            onDoubleClick={() => {
              if (interactive) labelRef.current?.focus();
            }}
            onDragStart={(event) => {
              setDragId(node.id);
              event.dataTransfer.setData('text/plain', node.id);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => {
              setDragId(null);
              setDropId(null);
            }}
            onDragOver={(event) => {
              if (interactive && dragId && !draggedSubtree.has(node.id)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropId(node.id);
              }
            }}
            onDragLeave={() => setDropId(null)}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (interactive && dragId) update({ nodes: moveMindmapNode(item.nodes, dragId, node.id) });
              setDragId(null);
              setDropId(null);
            }}
          >
            {node.label || 'Untitled idea'}
          </button>
        </foreignObject>
      ))}
    </svg>
  );
  return (
    <ContentBlockShell
      item={item}
      title={
        <span>
          {item.title} <span className="text-xs opacity-50">· {item.nodes.length} ideas</span>
        </span>
      }
      onDelete={onDelete}
    >
      <div className="planning-toolbar" onMouseDown={(event) => event.stopPropagation()}>
        <span className="text-xs text-theme-muted">Double-click to explore and edit</span>
        <button className="planning-button ml-auto" onClick={() => setEditing(true)}>
          Edit mind map
        </button>
      </div>
      <div className="mindmap-preview" onDoubleClick={() => setEditing(true)}>
        {map(false)}
      </div>
      {editing && (
        <Modal boardHistory label={`Edit ${item.title}`} onClose={() => setEditing(false)} centered>
          <div className="mindmap-editor" data-board-history="true" onClick={(event) => event.stopPropagation()}>
            <div className="planning-toolbar">
              <input
                className="planning-input flex-1"
                aria-label="Mind map title"
                value={item.title}
                onChange={(event) => update({ title: event.target.value })}
              />
              <span className="text-xs text-theme-muted">Changes saved automatically</span>
              <button className="planning-button" onClick={() => setEditing(false)}>
                Done
              </button>
            </div>
            <div className="planning-toolbar">
              <label>
                Layout{' '}
                <select
                  className="planning-input"
                  value={item.layout}
                  onChange={(event) => update({ layout: event.target.value as MindmapItem['layout'] })}
                >
                  <option value="horizontal">Left / right</option>
                  <option value="vertical">Up / down</option>
                </select>
              </label>
              <label>
                Lines{' '}
                <select
                  className="planning-input"
                  value={item.lineStyle}
                  onChange={(event) => update({ lineStyle: event.target.value as MindmapItem['lineStyle'] })}
                >
                  <option value="curve">Curved</option>
                  <option value="elbow">Elbow</option>
                  <option value="straight">Straight</option>
                </select>
              </label>
              <label>
                Width{' '}
                <input
                  aria-label="Line width"
                  type="range"
                  min="1"
                  max="10"
                  value={item.lineWidth}
                  onChange={(event) => update({ lineWidth: Number(event.target.value) })}
                />{' '}
                {item.lineWidth}px
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={item.dashed}
                  onChange={(event) => update({ dashed: event.target.checked })}
                />{' '}
                Dashed
              </label>
              <label className="ml-auto">
                Zoom{' '}
                <select
                  className="planning-input"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                >
                  {[...new Set([zoom, 0.25, 0.5, 0.75, 1, 1.25, 1.5])]
                    .sort((a, b) => a - b)
                    .map((value) => (
                      <option key={value} value={value}>
                        {Math.round(value * 100)}%
                      </option>
                    ))}
                </select>
              </label>
              <button className="planning-button" onClick={fit}>
                Fit map
              </button>
            </div>
            <div className="mindmap-workspace">
              <div ref={canvasRef} className="mindmap-canvas" data-wheel-scroll="true">
                {map(true)}
              </div>
              {selected && (
                <aside className="mindmap-inspector" data-wheel-scroll="true">
                  <label>
                    Idea
                    <textarea
                      ref={labelRef}
                      className="planning-input"
                      rows={3}
                      value={selected.label}
                      onChange={(event) => updateNode({ label: event.target.value })}
                    />
                  </label>
                  <div className="flex flex-wrap gap-1">
                    <button className="planning-button" onClick={() => add(false)}>
                      + Child
                    </button>
                    <button className="planning-button" disabled={!selected.parentId} onClick={() => add(true)}>
                      + Sibling
                    </button>
                  </div>
                  <label>
                    Background{' '}
                    <input
                      type="color"
                      value={selected.background === 'transparent' ? '#ffffff' : selected.background}
                      onChange={(event) => updateNode({ background: event.target.value })}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.background === 'transparent'}
                      onChange={(event) => updateNode({ background: event.target.checked ? 'transparent' : '#ffffff' })}
                    />{' '}
                    Transparent
                  </label>
                  <label>
                    Text color{' '}
                    <input
                      type="color"
                      value={selected.textColor}
                      onChange={(event) => updateNode({ textColor: event.target.value })}
                    />
                  </label>
                  {selected.parentId && (
                    <>
                      {item.nodes.find((node) => node.id === selected.parentId)?.parentId === null ? (
                        <>
                          <label>
                            Branch color{' '}
                            <input
                              type="color"
                              value={selected.branchColor.startsWith('#') ? selected.branchColor : '#8b5cf6'}
                              onChange={(event) => updateNode({ branchColor: event.target.value })}
                            />
                          </label>
                          <label>
                            Branch side{' '}
                            <select
                              className="planning-input"
                              value={selected.side}
                              onChange={(event) => updateNode({ side: event.target.value as MindmapNode['side'] })}
                            >
                              <option value="negative">{item.layout === 'horizontal' ? 'Left' : 'Up'}</option>
                              <option value="positive">{item.layout === 'horizontal' ? 'Right' : 'Down'}</option>
                            </select>
                          </label>
                        </>
                      ) : (
                        <p className="text-xs text-theme-muted">
                          <span style={{ color: branch?.color }}>●</span> Color and side follow the main branch.
                        </p>
                      )}
                      <label>
                        Move under{' '}
                        <select
                          className="planning-input"
                          value={selected.parentId}
                          onChange={(event) =>
                            update({ nodes: moveMindmapNode(item.nodes, selected.id, event.target.value) })
                          }
                        >
                          {item.nodes
                            .filter((node) => !descendants.has(node.id))
                            .map((node) => (
                              <option key={node.id} value={node.id}>
                                {node.label || 'Untitled idea'}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="flex gap-1">
                        <button className="planning-button" disabled={siblingIndex <= 0} onClick={() => reorder(-1)}>
                          Move earlier
                        </button>
                        <button
                          className="planning-button"
                          disabled={siblingIndex >= siblings.length - 1}
                          onClick={() => reorder(1)}
                        >
                          Move later
                        </button>
                      </div>
                      <button className="planning-button text-rose-500" onClick={remove}>
                        Delete subtree ({descendants.size})
                      </button>
                    </>
                  )}
                  <p className="text-xs text-theme-muted">
                    Drag an idea onto another to move its entire subtree. Use Move earlier / later to reorder siblings.
                    Undo is available with Ctrl+Z outside text fields.
                  </p>
                </aside>
              )}
            </div>
          </div>
        </Modal>
      )}
    </ContentBlockShell>
  );
}
