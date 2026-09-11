import type { CSSProperties } from 'react';
import { getTypographyStyle } from '../typography/typographyUtils';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow, Background, Controls, Handle, Position, ConnectionMode, MarkerType, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { Node, NodeProps, Edge, ReactFlowInstance } from '@xyflow/react';
import type { DiagramItem, DiagramNode, DiagramEdge, DiagramShape } from '@/entities/board/types';
import type { BlockDeleteHandler, BlockUpdateHandler } from '../types';
import ContentBlockShell from '../shared/ContentBlockShell';
import { diagramTemplate, layoutDiagram, removeDiagramNodes } from './diagramUtils';
import '@xyflow/react/dist/style.css';
import '../shared/planning.css';

type FlowNode = Node<DiagramNode['data'], 'shape'>;
function ShapeNode({ data, selected }: NodeProps<FlowNode>) {
  return <div className="diagram-node" data-selected={selected}>
    <div className="diagram-shape" data-shape={data.shape} style={{ background: data.color }}>{data.label || 'Untitled'}</div>
    {([['top', Position.Top], ['right', Position.Right], ['bottom', Position.Bottom], ['left', Position.Left]] as const).map(([id, position]) => <Handle key={id} id={id} type="source" position={position} />)}
  </div>;
}
const nodeTypes = { shape: ShapeNode };
const shapes: { value: DiagramShape; label: string }[] = [
  { value: 'process', label: 'Process' }, { value: 'decision', label: 'Decision' },
  { value: 'terminal', label: 'Start / End' }, { value: 'database', label: 'Database' },
  { value: 'input', label: 'Input / Output' }, { value: 'document', label: 'Document' }, { value: 'service', label: 'Service' },
];
const edgeOptions = { type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#8b7daa', strokeWidth: 2 } };
const toNodes = (nodes: FlowNode[]): DiagramNode[] => nodes.map(({ id, position, data }) => ({ id, position, data, type: 'shape' }));
const toEdges = (edges: Edge[]): DiagramEdge[] => edges.map(({ id, source, target, sourceHandle, targetHandle, label }) => ({ id, source, target, sourceHandle, targetHandle, label: typeof label === 'string' ? label : '' }));

export default function DiagramBlock({ item, onUpdate, onDelete }: { item: DiagramItem; onUpdate: BlockUpdateHandler; onDelete: BlockDeleteHandler }) {
  const [editing, setEditing] = useState(false);
  const [nodes, setNodes] = useState<FlowNode[]>(item.nodes);
  const [edges, setEdges] = useState<Edge[]>(item.edges);
  const [selection, setSelection] = useState<{ node?: string; edge?: string }>({});
  const flow = useRef<ReactFlowInstance<FlowNode> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editing) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true }); };
  }, [editing]);
  useEffect(() => { setNodes(item.nodes); }, [item.nodes]);
  useEffect(() => { setEdges(item.edges); }, [item.edges]);
  const save = (nextNodes: FlowNode[], nextEdges: Edge[]) => {
    setNodes(nextNodes); setEdges(nextEdges);
    onUpdate(current => current.type === 'diagram' ? { ...current, nodes: toNodes(nextNodes), edges: toEdges(nextEdges) } : current);
  };
  const selectedNode = nodes.find(node => node.id === selection.node);
  const selectedEdge = edges.find(edge => edge.id === selection.edge);
  const addNode = (shape: DiagramShape) => {
    const id = crypto.randomUUID();
    const viewport = flow.current?.getViewport() ?? { x: 0, y: 0, zoom: 1 };
    save([...nodes, { id, type: 'shape', position: { x: (120 - viewport.x) / viewport.zoom, y: (100 - viewport.y) / viewport.zoom }, data: { label: shapes.find(option => option.value === shape)!.label, shape, color: '#7c3aed' } }], edges);
    setSelection({ node: id });
  };
  const deleteSelection = () => {
    if (selection.node) { const next = removeDiagramNodes(toNodes(nodes), toEdges(edges), new Set([selection.node])); save(next.nodes, next.edges); }
    else if (selection.edge) save(nodes, edges.filter(edge => edge.id !== selection.edge));
    setSelection({});
  };
  const content = <>
    <div className="planning-toolbar" onMouseDown={event => event.stopPropagation()}>
      <span className="text-xs text-theme-muted">{editing ? 'Drag ports to connect' : 'Double-click to edit diagram'}</span>
      <button className="planning-button ml-auto" onClick={() => flow.current?.fitView({ padding: .2, duration: 200 })}>Fit view</button>
      <button className="planning-button" aria-pressed={editing} onClick={() => { setEditing(!editing); setSelection({}); }}>{editing ? 'Done editing' : 'Edit diagram'}</button>
    </div>
    {editing && <div className="planning-toolbar" onMouseDown={event => event.stopPropagation()}>
      {shapes.map(shape => <button className="planning-button" key={shape.value} onClick={() => addNode(shape.value)}>+ {shape.label}</button>)}
      <button className="planning-button ml-auto" disabled={!nodes.length} onClick={() => { save(layoutDiagram(toNodes(nodes), toEdges(edges)), edges); requestAnimationFrame(() => flow.current?.fitView({ padding: .2, duration: 200 })); }}>Auto layout</button>
    </div>}
    <div className="relative flex-1 min-h-0" data-wheel-scroll={editing ? 'true' : undefined} onDoubleClick={() => setEditing(true)} onMouseDown={event => { if (editing) event.stopPropagation(); }} onKeyDown={event => {
      if (editing) {
        event.stopPropagation();
        if (event.target instanceof HTMLElement && !event.target.closest('input,textarea,select') && ['Delete', 'Backspace'].includes(event.key)) { event.preventDefault(); deleteSelection(); }
      }
    }}>
      <div className="absolute inset-0" style={{ pointerEvents: editing ? 'auto' : 'none' }}>
        <ReactFlow<FlowNode> id={`diagram-${item.id}`} nodes={nodes} edges={edges} nodeTypes={nodeTypes} defaultEdgeOptions={edgeOptions} connectionMode={ConnectionMode.Loose}
          onInit={instance => { flow.current = instance; }}
          onNodesChange={changes => {
            const next = applyNodeChanges(changes, nodes); setNodes(next);
            if (changes.some(change => change.type === 'position' && change.dragging !== true)) save(next, edges);
          }}
          onEdgesChange={changes => setEdges(applyEdgeChanges(changes, edges))}
          onConnect={connection => {
            if (!editing || connection.source === connection.target) return;
            if (edges.some(edge => edge.source === connection.source && edge.target === connection.target && edge.sourceHandle === connection.sourceHandle && edge.targetHandle === connection.targetHandle)) return;
            save(nodes, [...edges, { ...connection, id: crypto.randomUUID(), label: '' }]);
          }}
          onNodeClick={(_, node) => setSelection({ node: node.id })} onEdgeClick={(_, edge) => setSelection({ edge: edge.id })} onPaneClick={() => setSelection({})}
          nodesDraggable={editing} nodesConnectable={editing} elementsSelectable={editing} panOnDrag={editing} zoomOnScroll={editing} zoomOnDoubleClick={false} deleteKeyCode={null}
          snapToGrid snapGrid={[16, 16]} fitView minZoom={.15} maxZoom={2}>
          <Background gap={16} color="#8b7daa30" />
          {editing && <Controls showInteractive={false} />}
        </ReactFlow>
      </div>
      {!nodes.length && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
        <p className="text-sm text-theme-muted">Map a process, a decision or your system architecture.</p>
        <button className="planning-button pointer-events-auto" onMouseDown={event => event.stopPropagation()} onClick={() => { const template = diagramTemplate(); save(template.nodes, template.edges); setEditing(true); requestAnimationFrame(() => flow.current?.fitView({ padding: .2 })); }}>Start with request flow</button>
      </div>}
    </div>
    {editing && <div className="planning-toolbar" onMouseDown={event => event.stopPropagation()}>
      {selectedNode ? <>
        <input className="planning-input flex-1" aria-label="Node label" value={selectedNode.data.label} onChange={event => save(nodes.map(node => node.id === selectedNode.id ? { ...node, data: { ...node.data, label: event.target.value } } : node), edges)} />
        <select className="planning-input" aria-label="Node shape" value={selectedNode.data.shape} onChange={event => save(nodes.map(node => node.id === selectedNode.id ? { ...node, data: { ...node.data, shape: event.target.value as DiagramShape } } : node), edges)}>{shapes.map(shape => <option key={shape.value} value={shape.value}>{shape.label}</option>)}</select>
        <input type="color" aria-label="Node color" value={selectedNode.data.color} className="h-8 w-8" onChange={event => save(nodes.map(node => node.id === selectedNode.id ? { ...node, data: { ...node.data, color: event.target.value } } : node), edges)} />
      </> : selectedEdge ? <input className="planning-input flex-1" aria-label="Connection label" placeholder="e.g. Yes / No / Success" value={typeof selectedEdge.label === 'string' ? selectedEdge.label : ''} onChange={event => save(nodes, edges.map(edge => edge.id === selectedEdge.id ? { ...edge, label: event.target.value } : edge))} /> : <input className="planning-input flex-1" aria-label="Diagram title" value={item.title} onChange={event => onUpdate(current => current.type === 'diagram' ? { ...current, title: event.target.value } : current)} />}
      {(selectedNode || selectedEdge) && <button className="planning-button text-rose-500" onClick={deleteSelection}>Delete selected</button>}
    </div>}
    {editing && selectedNode && <div className="planning-toolbar max-h-28 overflow-auto" data-wheel-scroll="true" onMouseDown={event => event.stopPropagation()}>
      <span className="text-xs text-theme-muted">Connections</span>
      {edges.filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id).map(edge => <div key={edge.id} className="flex items-center rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        <button className="planning-button" onClick={() => setSelection({ edge: edge.id })}>{edge.source === selectedNode.id ? '→ ' : '← '}{nodes.find(node => node.id === (edge.source === selectedNode.id ? edge.target : edge.source))?.data.label || 'Node'}{edge.label ? ` · ${edge.label}` : ''}</button>
        <button className="planning-button text-rose-500" aria-label={`Delete connection ${edge.label || edge.id}`} onClick={() => save(nodes, edges.filter(current => current.id !== edge.id))}>×</button>
      </div>)}
      <button className="planning-button ml-auto" disabled={!edges.some(edge => edge.source === selectedNode.id || edge.target === selectedNode.id)} onClick={() => save(nodes, edges.filter(edge => edge.source !== selectedNode.id && edge.target !== selectedNode.id))}>Disconnect node</button>
    </div>}
  </>;
  return <ContentBlockShell item={item} onDelete={onDelete} title={<span className="flex justify-between gap-2"><span className="truncate">{item.title}</span><span className="text-xs opacity-50">{nodes.length} nodes · {edges.length} connections</span></span>}>
    {editing ? <>
      <div className="planning-empty">Diagram is open in the editor.</div>
      {createPortal(<div className="fixed inset-0 flex items-center justify-center bg-black/45 p-4" style={{ zIndex: 200000 }} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
        <div ref={dialogRef} role="dialog" data-board-history="true" aria-modal="true" aria-label={`Edit ${item.title}`} tabIndex={-1} className="diagram-editor" style={{ ...getTypographyStyle(item), '--block-font-size': item.typography?.fontSize ? `${item.typography.fontSize}px` : undefined } as CSSProperties} data-wheel-scroll="true" onKeyDownCapture={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setEditing(false); }
          if (event.key === 'Tab') {
            const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]'));
            const first = fields[0]; const last = fields[fields.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
          <div className="px-4 pt-4 font-semibold text-sm">{item.title}<span className="float-right text-xs font-normal text-theme-muted">Changes saved automatically</span></div>
          {content}
        </div>
      </div>, document.body)}
    </> : content}
  </ContentBlockShell>;
}
