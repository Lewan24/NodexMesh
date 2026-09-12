import { useState } from 'react';
import { ChevronDown, LayoutGrid, ListTree, Play, MousePointer2 } from 'lucide-react';
import type { ToolType } from '@/entities/board/toolTypes';
import { SIDEBAR_TOOLS } from './sidebarTools';
import { consumeToolDragClickSuppression, startToolDrag } from '@/features/canvas/utils/toolDrag';
import './sidebar.css';

const groups = [
  { id: 'planning', label: 'Planning', icon: ListTree, tools: ['timeline', 'diagram', 'database'] },
  {
    id: 'common',
    label: 'Common',
    icon: LayoutGrid,
    tools: ['drawing', 'note', 'dispenser', 'text', 'document', 'code'],
  },
  {
    id: 'organize',
    label: 'Organize',
    icon: ListTree,
    tools: ['checklist', 'kanban', 'column', 'section-title', 'frame', 'line', 'divider'],
  },
  { id: 'media', label: 'Media', icon: Play, tools: ['image', 'link', 'embed'] },
] satisfies { id: string; label: string; icon: typeof LayoutGrid; tools: ToolType[] }[];

export default function Sidebar({
  selectedTool,
  onSelectTool,
}: {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>('common');
  return (
    <aside className="tool-sidebar" aria-label="Board tools">
      <div className="tool-sidebar-heading">CREATE & CONNECT</div>
      <button
        type="button"
        className="tool-select"
        aria-label="Select"
        aria-pressed={selectedTool === 'select'}
        onClick={() => onSelectTool('select')}
      >
        <MousePointer2 size={21} />
        <span>Select & move</span>
      </button>
      <nav className="tool-groups" aria-label="Tool categories">
        {groups.map((group) => {
          const open = openGroup === group.id;
          const Icon = group.icon;
          const containsActive = (group.tools as ToolType[]).includes(selectedTool);
          return (
            <section className="tool-group" key={group.id} data-open={open}>
              <button
                type="button"
                className="tool-group-trigger"
                aria-expanded={open}
                aria-controls={`tools-${group.id}`}
                onClick={() => setOpenGroup(open ? null : group.id)}
              >
                <Icon size={18} />
                <span>{group.label}</span>
                {containsActive && <span className="tool-group-dot" aria-label="Active tool in this category" />}
                <ChevronDown size={16} className="tool-group-chevron" />
              </button>
              <div className="tool-group-collapse" inert={!open}>
                <div className="tool-group-clip">
                  <div className="tool-grid" id={`tools-${group.id}`} aria-label={`${group.label} tools`}>
                    {group.tools.map((id) => {
                      const tool = SIDEBAR_TOOLS.find((tool) => tool.id === id)!;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="tool-tile"
                          aria-label={tool.label}
                          aria-pressed={selectedTool === id}
                          title={
                            id === 'drawing'
                              ? 'Pencil · Draw on canvas · Esc to cancel'
                              : `${tool.label} · Click or drag to canvas`
                          }
                          onMouseDown={(event) => {
                            if (id !== 'drawing') startToolDrag(id, event);
                          }}
                          onClick={() => {
                            if (!consumeToolDragClickSuppression()) onSelectTool(id);
                          }}
                        >
                          <span className="tool-tile-icon">{tool.icon}</span>
                          <span>{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </nav>
      <div className="tool-sidebar-hint">Click to add · Drag to place</div>
    </aside>
  );
}
