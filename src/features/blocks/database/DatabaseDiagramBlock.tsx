import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, ConnectionMode, applyNodeChanges } from '@xyflow/react';
import type { Node, NodeProps, ReactFlowInstance } from '@xyflow/react';
import type { DatabaseDiagramItem, DatabaseTable, DatabaseRelation } from '@/entities/board/types';
import type { BlockUpdateHandler, BlockDeleteHandler } from '../types';
import ContentBlockShell from '../shared/ContentBlockShell';
import { getTypographyStyle } from '../typography/typographyUtils';
import { createDatabaseField, createDatabaseTable, databaseExample, validDatabaseRelations, canAddDatabaseRelation } from './databaseUtils';
import '@xyflow/react/dist/style.css';
import '../shared/planning.css';

type TableNode = Node<{ table: DatabaseTable; foreignKeys: string[] }, 'table'>;
function TableView({ data, selected }: NodeProps<TableNode>) {
  return <div className="shadow-md rounded-sm overflow-visible" style={{ width: 288, background: 'var(--color-surface)', color: 'var(--color-text-primary)', outline: selected ? '2px solid #8b5cf6' : undefined }}>
    <div className="px-3 py-2 bg-violet-600 text-white font-semibold">{data.table.name || 'Untitled table'}</div>
    {data.table.fields.map(field => <div key={field.id} className="relative flex items-center gap-2 px-3 py-2 border-b border-current/10 text-xs">
      <Handle type="source" position={Position.Left} id={field.id + ":left"} style={{ width: 10, height: 10 }} />
      <span className="font-mono text-amber-600 min-w-6" title={field.primaryKey ? 'Primary key' : data.foreignKeys.includes(field.id) ? 'Foreign key' : ''}>{field.primaryKey ? 'PK' : data.foreignKeys.includes(field.id) ? 'FK' : ''}</span>
      <span className="flex-1 truncate" title={field.name}>{field.name || 'field'}</span><span className="opacity-60 max-w-28 truncate" title={field.dataType}>{field.dataType}{field.nullable ? '?' : ''}</span>
      <Handle type="source" position={Position.Right} id={field.id + ":right"} style={{ width: 10, height: 10 }} />
    </div>)}
    {!data.table.fields.length && <div className="p-3 text-xs opacity-60">No fields</div>}
  </div>;
}
const nodeTypes = { table: TableView };
const types = ['integer', 'bigint', 'uuid', 'varchar(255)', 'text', 'boolean', 'decimal(10,2)', 'date', 'timestamp', 'json', 'binary'];

export default function DatabaseDiagramBlock({ item, onUpdate, onDelete }: { item: DatabaseDiagramItem; onUpdate: BlockUpdateHandler; onDelete: BlockDeleteHandler }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [relationId, setRelationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const flow = useRef<ReactFlowInstance<TableNode> | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const makeNodes = (tables: DatabaseTable[], relations: DatabaseRelation[]): TableNode[] => tables.map(table => ({ id: table.id, type: 'table', position: table.position, data: { table, foreignKeys: relations.filter(relation => relation.source === table.id).map(relation => relation.sourceField) } }));
  const [nodes, setNodes] = useState<TableNode[]>(() => makeNodes(item.tables, item.relations));
  useEffect(() => setNodes(makeNodes(item.tables, item.relations)), [item.tables, item.relations]);
  useEffect(() => {
    if (!editing) return;
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [editing]);
  const save = (tables: DatabaseTable[], relations = item.relations) => onUpdate(current => current.type === 'database' ? { ...current, tables, relations: validDatabaseRelations(tables, relations) } : current);
  const table = item.tables.find(entry => entry.id === selected);
  const relation = item.relations.find(entry => entry.id === relationId);
  const updateTable = (patch: Partial<DatabaseTable>) => save(item.tables.map(entry => entry.id === selected ? { ...entry, ...patch } : entry));
  const edges = useMemo(() => item.relations.map(relation => ({ id: relation.id, source: relation.source, target: relation.target, sourceHandle: relation.sourceField + ((item.tables.find(table => table.id === relation.source)?.position.x ?? 0) < (item.tables.find(table => table.id === relation.target)?.position.x ?? 0) ? ':right' : ':left'), targetHandle: relation.targetField + ((item.tables.find(table => table.id === relation.source)?.position.x ?? 0) < (item.tables.find(table => table.id === relation.target)?.position.x ?? 0) ? ':left' : ':right'), type: 'smoothstep', label: relation.cardinality, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#8b5cf6', strokeWidth: 2 }, interactionWidth: 24, selected: relation.id === relationId })), [item.relations, item.tables, relationId]);
  const fit = () => requestAnimationFrame(() => flow.current?.fitView({ padding: .2, duration: 200 }));
  const content = <div className="flex flex-1 min-h-0">
    <div className="flex flex-col flex-1 min-w-0">
      <div className="planning-toolbar" onMouseDown={event => event.stopPropagation()}>
        <button className="planning-button" onClick={fit}>Fit view</button>
        {editing ? <>
          <button className="planning-button" onClick={() => { const next = createDatabaseTable('table_' + (item.tables.length + 1), item.tables.length); save([...item.tables, next]); setSelected(next.id); setRelationId(null); fit(); }}>+ Table</button>
          <button className="planning-button" onClick={() => { save(item.tables.map((table, index) => ({ ...table, position: { x: index % 3 * 352, y: Math.floor(index / 3) * (Math.max(3, ...item.tables.map(table => table.fields.length)) * 36 + 112) } }))); fit(); }}>Arrange tables</button>
          <span className="text-xs opacity-60">Drag field port to referenced field · Grid 16 px</span>
          <button className="planning-button ml-auto" onClick={() => setEditing(false)}>Done</button>
        </> : <button className="planning-button ml-auto" disabled={item.locked} onClick={() => setEditing(true)}>Edit database</button>}
      </div>
      <div className="relative flex-1 min-h-0" data-wheel-scroll={editing || undefined} onDoubleClick={() => { if (!item.locked) setEditing(true); }} onMouseDown={event => { if (editing) event.stopPropagation(); }}>
        <div className="absolute inset-0" style={{ pointerEvents: editing ? 'auto' : 'none' }}>
          <ReactFlow<TableNode> connectionMode={ConnectionMode.Loose} nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={instance => { flow.current = instance; }}
            onNodesChange={changes => setNodes(current => applyNodeChanges(changes, current))}
            onNodeDragStop={(_, node, dragged) => save(item.tables.map(table => { const moved = dragged.find(entry => entry.id === table.id) ?? (table.id === node.id ? node : undefined); return moved ? { ...table, position: moved.position } : table; }))}
            onNodeClick={(_, node) => { setSelected(node.id); setRelationId(null); setMessage(''); }}
            onEdgeClick={(_, edge) => { setRelationId(edge.id); setSelected(null); }}
            onConnect={connection => {
              const relation: DatabaseRelation = { id: crypto.randomUUID(), source: connection.source, target: connection.target, sourceField: connection.sourceHandle?.replace(/:(left|right)$/, '') ?? '', targetField: connection.targetHandle?.replace(/:(left|right)$/, '') ?? '', cardinality: 'N:1' };
              if (canAddDatabaseRelation(item.tables, item.relations, relation)) { save(item.tables, [...item.relations, relation]); setRelationId(relation.id); setSelected(null); setMessage(''); }
              else setMessage('This relationship already exists or its fields are invalid.');
            }}
            nodesDraggable={editing} nodesConnectable={editing} elementsSelectable={editing} panOnDrag={editing} zoomOnScroll={editing} zoomOnDoubleClick={false}
            deleteKeyCode={null} snapToGrid snapGrid={[16, 16]} fitView minZoom={.15} maxZoom={2} connectionRadius={28}>
            <Background gap={16} />{editing && <Controls showInteractive={false} />}
          </ReactFlow>
        </div>
        {!item.tables.length && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button disabled={item.locked} className="planning-button pointer-events-auto" onMouseDown={event => event.stopPropagation()} onClick={() => { const example = databaseExample(); save(example.tables, example.relations); setEditing(true); fit(); }}>Start with users and posts</button>
        </div>}
      </div>
    </div>
    {editing && <aside className="w-80 shrink-0 p-4 space-y-3 overflow-auto border-l border-current/10" data-wheel-scroll="true">
      <label className="block text-sm">Diagram title<input className="planning-input w-full" value={item.title} onChange={event => onUpdate(current => current.type === 'database' ? { ...current, title: event.target.value } : current)} /></label>
      {table ? <>
        <label className="block text-sm">Table name<input className="planning-input w-full" value={table.name} onChange={event => updateTable({ name: event.target.value })} /></label>
        <h3 className="font-semibold text-sm">Fields</h3>
        <datalist id={item.id + '-types'}>{types.map(type => <option key={type} value={type} />)}</datalist>
        {table.fields.map((field, index) => <fieldset key={field.id} className="p-2 bg-violet-500/5 space-y-2 rounded-sm">
          <legend className="text-xs opacity-60">Field {index + 1}</legend>
          <input aria-label={'Field name ' + (index + 1)} className="planning-input w-full" value={field.name} onChange={event => updateTable({ fields: table.fields.map(entry => entry.id === field.id ? { ...entry, name: event.target.value } : entry) })} />
          <input aria-label={'Field type ' + (index + 1)} list={item.id + '-types'} className="planning-input w-full" value={field.dataType} onChange={event => updateTable({ fields: table.fields.map(entry => entry.id === field.id ? { ...entry, dataType: event.target.value } : entry) })} />
          <div className="flex flex-wrap gap-2 text-xs">{(['primaryKey', 'nullable', 'unique'] as const).map(key => <label key={key}><input type="checkbox" checked={field[key]} disabled={key === 'nullable' && field.primaryKey} onChange={event => updateTable({ fields: table.fields.map(entry => entry.id === field.id ? { ...entry, [key]: event.target.checked, ...(key === 'primaryKey' && event.target.checked ? { nullable: false } : {}) } : entry) })} /> {key === 'primaryKey' ? 'PK' : key === 'nullable' ? 'Nullable' : 'Unique'}</label>)}</div>
          <input aria-label={'Default value ' + (index + 1)} placeholder="Default value" className="planning-input w-full" value={field.defaultValue} onChange={event => updateTable({ fields: table.fields.map(entry => entry.id === field.id ? { ...entry, defaultValue: event.target.value } : entry) })} />
          <button className="planning-button text-rose-500" onClick={() => updateTable({ fields: table.fields.filter(entry => entry.id !== field.id) })}>Remove field</button>
        </fieldset>)}
        <button className="planning-button" onClick={() => updateTable({ fields: [...table.fields, createDatabaseField('field_' + (table.fields.length + 1))] })}>+ Field</button>
        <button className="planning-button text-rose-500" onClick={() => { save(item.tables.filter(entry => entry.id !== table.id)); setSelected(null); }}>Delete table</button>
      </> : relation ? <>
        <h3 className="text-sm font-semibold">Relationship</h3>
        <p className="text-xs">{item.tables.find(table => table.id === relation.source)?.name}.{item.tables.find(table => table.id === relation.source)?.fields.find(field => field.id === relation.sourceField)?.name} → {item.tables.find(table => table.id === relation.target)?.name}.{item.tables.find(table => table.id === relation.target)?.fields.find(field => field.id === relation.targetField)?.name}</p>
        <label className="block text-sm">Cardinality<select className="planning-input w-full" value={relation.cardinality} onChange={event => save(item.tables, item.relations.map(entry => entry.id === relation.id ? { ...entry, cardinality: event.target.value as DatabaseRelation['cardinality'] } : entry))}>{(['1:1', '1:N', 'N:1', 'N:N'] as const).map(value => <option key={value}>{value}</option>)}</select></label>
        <p className="text-xs opacity-60">Source field references target field. N:N represents a conceptual relation; model a junction table for a physical schema.</p>
        <button className="planning-button text-rose-500" onClick={() => { save(item.tables, item.relations.filter(entry => entry.id !== relation.id)); setRelationId(null); }}>Delete relationship</button>
      </> : <p className="text-sm opacity-60">Select a table to edit its fields, or select a relationship.</p>}
      {message && <p role="status" className="text-sm text-amber-600">{message}</p>}
    </aside>}
  </div>;
  return <ContentBlockShell item={item} onDelete={onDelete} title={<span>{item.title} · {item.tables.length} tables</span>}>
    {editing ? <>
      <div className="planning-empty">Database schema is open in the editor.</div>
      {createPortal(<div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4" style={{ zIndex: 200000 }} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
        <div ref={dialog} role="dialog" aria-modal="true" aria-label="Edit database schema" data-board-history="true" tabIndex={-1} className="diagram-editor" style={getTypographyStyle(item)} onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); setEditing(false); }
          if (event.key === 'Tab') {
            const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select,[tabindex="0"]'));
            const first = fields[0], last = fields[fields.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>{content}</div>
      </div>, document.body)}
    </> : content}
  </ContentBlockShell>;
}
