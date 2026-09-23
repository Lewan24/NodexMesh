import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import MobilePanel from '@/shared/components/dialogs/MobilePanel';
import { useState } from 'react';
import { ChevronDown, LayoutGrid, ListTree, Play, MousePointer2 } from 'lucide-react';
import type { ToolType } from '@/entities/board/toolTypes';
import { SIDEBAR_TOOLS } from './sidebarTools';
import { consumeToolDragClickSuppression, startToolDrag } from '@/features/canvas/utils/toolDrag';
import './sidebar.css';

const groups = [
  {
    id: 'planning',
    get label() {
      return translate('Planning');
    },
    icon: ListTree,
    tools: ['timeline', 'mindmap', 'diagram', 'database'],
  },
  {
    id: 'common',
    get label() {
      return translate('Common');
    },
    icon: LayoutGrid,
    tools: ['drawing', 'note', 'dispenser', 'text', 'icon', 'document', 'code'],
  },
  {
    id: 'organize',
    get label() {
      return translate('Organize');
    },
    icon: ListTree,
    tools: ['checklist', 'kanban', 'column', 'section-title', 'frame', 'line', 'divider', 'board'],
  },
  {
    id: 'media',
    get label() {
      return translate('Media');
    },
    icon: Play,
    tools: ['image', 'link', 'embed'],
  },
] satisfies { id: string; label: string; icon: typeof LayoutGrid; tools: ToolType[] }[];

export default function Sidebar({
  selectedTool,
  onSelectTool,
}: {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}) {
  useTranslation();
  const [openGroup, setOpenGroup] = useState<string | null>('common');
  return (
    <MobilePanel title={translate('Tools')} slot="tools">
      <aside className="tool-sidebar" aria-label={translate('Board tools')}>
        <div className="tool-sidebar-heading">{translate('CREATE & CONNECT')}</div>
        <button
          type="button"
          className="tool-select"
          aria-label={translate('Select')}
          aria-pressed={selectedTool === 'select'}
          onClick={() => onSelectTool('select')}
        >
          <MousePointer2 size={21} />
          <span>{translate('Select & move')}</span>
        </button>
        <nav className="tool-groups" aria-label={translate('Tool categories')}>
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
                  {containsActive && (
                    <span className="tool-group-dot" aria-label={translate('Active tool in this category')} />
                  )}
                  <ChevronDown size={16} className="tool-group-chevron" />
                </button>
                <div className="tool-group-collapse" inert={!open}>
                  <div className="tool-group-clip">
                    <div
                      className="tool-grid"
                      id={`tools-${group.id}`}
                      aria-label={translate('{{value1}} tools', { value1: group.label })}
                    >
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
                                ? translate('Pencil · Draw on canvas · Esc to cancel')
                                : translate('{{value1}} · Click or drag to canvas', { value1: tool.label })
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
        <div className="tool-sidebar-hint">{translate('Click to add · Drag to place')}</div>
      </aside>
    </MobilePanel>
  );
}
