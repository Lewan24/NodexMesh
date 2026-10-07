import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import MobilePanel, { useMobileLayout } from '@/shared/components/dialogs/MobilePanel';
import { useState } from 'react';
import { useTheme } from '@/app/providers/ThemeProvider';
import {
  normalizeSidebarWidth,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
} from '@/features/appearance/appearanceModel';
import {
  ChevronDown,
  LayoutGrid,
  Play,
  MousePointer2,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarRange,
  FolderKanban,
} from 'lucide-react';
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
    icon: CalendarRange,
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
    icon: FolderKanban,
    tools: ['checklist', 'kanban', 'column', 'section-title', 'frame', 'line', 'divider', 'board'],
  },
  {
    id: 'media',
    get label() {
      return translate('Media');
    },
    icon: Play,
    tools: ['image', 'file', 'link', 'embed'],
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
  const mobile = useMobileLayout();
  const { preferences, savePreferences } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const compact = collapsed && !mobile;
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const width = dragWidth ?? normalizeSidebarWidth(preferences.sidebarWidth);
  const persistWidth = (next: number) => savePreferences({ ...preferences, sidebarWidth: normalizeSidebarWidth(next) });
  const [openGroup, setOpenGroup] = useState<string | null>('common');
  return (
    <MobilePanel title={translate('Tools')} slot="tools">
      <aside
        className="tool-sidebar"
        data-collapsed={compact}
        style={mobile ? undefined : { width: compact ? 76 : width }}
        aria-label={translate('Board tools')}
      >
        {!mobile && (
          <button
            type="button"
            className="sidebar-collapse-toggle"
            aria-label={compact ? translate('Expand sidebar') : translate('Collapse sidebar')}
            title={compact ? translate('Expand sidebar') : translate('Collapse sidebar')}
            aria-expanded={!compact}
            onClick={() => setCollapsed(!collapsed)}
          >
            {compact ? <PanelLeftOpen size={21} /> : <PanelLeftClose size={21} />}
          </button>
        )}
        <div className="tool-sidebar-heading">{translate('CREATE & CONNECT')}</div>
        <button
          type="button"
          className="tool-select"
          aria-label={translate('Select')}
          title={translate('Select & move')}
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
                  title={group.label}
                  aria-label={group.label}
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
                            data-tool={id}
                            aria-label={tool.label}
                            aria-pressed={selectedTool === id}
                            title={
                              mobile
                                ? undefined
                                : id === 'drawing'
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
        {!mobile && !compact && (
          <div
            className="sidebar-resize-handle"
            role="separator"
            aria-label={translate('Resize sidebar')}
            aria-orientation="vertical"
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuemax={MAX_SIDEBAR_WIDTH}
            aria-valuenow={width}
            tabIndex={0}
            onDoubleClick={() => persistWidth(DEFAULT_SIDEBAR_WIDTH)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowLeft'
                  ? width - 8
                  : event.key === 'ArrowRight'
                    ? width + 8
                    : event.key === 'Home'
                      ? DEFAULT_SIDEBAR_WIDTH
                      : null;
              if (next !== null) {
                event.preventDefault();
                persistWidth(next);
              }
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragWidth(width);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                const left = event.currentTarget.parentElement!.getBoundingClientRect().left;
                setDragWidth(normalizeSidebarWidth(event.clientX - left));
              }
            }}
            onPointerUp={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              event.currentTarget.releasePointerCapture(event.pointerId);
              const left = event.currentTarget.parentElement!.getBoundingClientRect().left;
              persistWidth(event.clientX - left);
              setDragWidth(null);
            }}
            onPointerCancel={() => setDragWidth(null)}
          />
        )}
        <div className="tool-sidebar-hint">{translate('Click to add · Drag to place')}</div>
      </aside>
    </MobilePanel>
  );
}
